import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { parseLocalDate } from "@/lib/utils";
import { getCachedCardCredits } from "@/lib/cached-data";
import { UpcomingClient } from "./upcoming-client";

export const metadata: Metadata = {
  title: "Upcoming | CardTool",
  description: "Track your upcoming credits, inventory, card renewals, and expiring points",
};

export default async function UpcomingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();

  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();
  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Calculate date windows
  const now = new Date();

  // Fetch all required data in parallel
  const [
    walletCardsResult,
    cardCreditsData,
    creditUsageResult,
    creditSettingsResult,
    inventoryResult,
    pointBalancesResult,
    playersResult,
    currenciesResult,
    hiddenItemsResult,
  ] = await Promise.all([
    // User's wallet cards (including closed for context)
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        approval_date,
        closed_date,
        player_number,
        cards:card_id (
          id,
          name,
          slug,
          annual_fee
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),

    // Cached card credits data
    getCachedCardCredits(),

    // User's credit usage
    supabase
      .from("user_credit_usage")
      .select("id, user_wallet_id, credit_id, period_start, period_end, amount_used")
      .in("user_wallet_id", (await supabase
        .from("user_wallets")
        .select("id")
        .eq("user_id", effectiveUserId)
        .is("closed_date", null)
      ).data?.map(w => w.id) ?? ["none"]),

    // User's credit settings
    supabase
      .from("user_credit_settings")
      .select("user_wallet_id, credit_id, is_hidden")
      .in("user_wallet_id", (await supabase
        .from("user_wallets")
        .select("id")
        .eq("user_id", effectiveUserId)
        .is("closed_date", null)
      ).data?.map(w => w.id) ?? ["none"]),

    // User's inventory items with expiration dates
    supabase
      .from("user_inventory")
      .select(`
        id,
        type_id,
        name,
        brand,
        expiration_date,
        no_expiration,
        original_value_cents,
        remaining_value_cents,
        quantity,
        quantity_used,
        is_used,
        player_number,
        inventory_types:type_id (
          id,
          name,
          slug,
          tracking_type
        )
      `)
      .eq("user_id", effectiveUserId)
      .eq("is_used", false),

    // User's point balances with expiration dates
    supabase
      .from("user_point_balances")
      .select("currency_id, player_number, balance, expiration_date")
      .eq("user_id", effectiveUserId)
      .not("expiration_date", "is", null),

    // User's players
    supabase
      .from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId)
      .order("player_number"),

    // Currencies for points names and type
    supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type"),

    // Hidden items
    supabase
      .from("user_hidden_items")
      .select("item_type, item_key")
      .eq("user_id", effectiveUserId),
  ]);

  // Type definitions
  type WalletCard = {
    id: string;
    card_id: string;
    custom_name: string | null;
    approval_date: string | null;
    closed_date: string | null;
    player_number: number | null;
    cards: {
      id: string;
      name: string;
      slug: string;
      annual_fee: number;
    } | null;
  };

  type CreditUsage = {
    id: string;
    user_wallet_id: string;
    credit_id: string;
    period_start: string;
    period_end: string;
    amount_used: number;
  };

  type CreditSettings = {
    user_wallet_id: string;
    credit_id: string;
    is_hidden: boolean;
  };

  type InventoryItem = {
    id: string;
    type_id: string;
    name: string;
    brand: string | null;
    expiration_date: string | null;
    no_expiration: boolean;
    original_value_cents: number | null;
    remaining_value_cents: number | null;
    quantity: number | null;
    quantity_used: number | null;
    is_used: boolean;
    player_number: number | null;
    inventory_types: {
      id: string;
      name: string;
      slug: string;
      tracking_type: string;
    } | null;
  };

  type PointBalance = {
    currency_id: string;
    player_number: number;
    balance: number;
    expiration_date: string | null;
  };

  type Player = {
    player_number: number;
    description: string | null;
  };

  type Currency = {
    id: string;
    name: string;
    code: string;
    currency_type: string | null;
  };

  type HiddenItem = {
    item_type: string;
    item_key: string;
  };

  const walletCards = (walletCardsResult.data ?? []) as unknown as WalletCard[];
  const creditUsage = (creditUsageResult.data ?? []) as CreditUsage[];
  const creditSettings = (creditSettingsResult.data ?? []) as CreditSettings[];
  const inventoryItems = (inventoryResult.data ?? []) as unknown as InventoryItem[];
  const pointBalances = (pointBalancesResult.data ?? []) as PointBalance[];
  const players = (playersResult.data ?? []) as Player[];
  const currencies = (currenciesResult.data ?? []) as Currency[];
  const hiddenItems = (hiddenItemsResult.data ?? []) as HiddenItem[];

  // Build hidden items lookup
  const hiddenItemKeys = new Set(hiddenItems.map(h => `${h.item_type}:${h.item_key}`));

  // Build lookup maps
  const walletCardMap = new Map<string, WalletCard>();
  const cardIdToWalletIds = new Map<string, string[]>();
  walletCards.forEach(wc => {
    walletCardMap.set(wc.id, wc);
    if (wc.cards) {
      const existing = cardIdToWalletIds.get(wc.card_id) ?? [];
      existing.push(wc.id);
      cardIdToWalletIds.set(wc.card_id, existing);
    }
  });

  const creditSettingsMap = new Map<string, CreditSettings>();
  creditSettings.forEach(s => {
    creditSettingsMap.set(`${s.user_wallet_id}:${s.credit_id}`, s);
  });

  const currencyMap = new Map<string, Currency>();
  currencies.forEach(c => currencyMap.set(c.id, c));

  // Filter credits to user's cards
  const userCardIds = new Set(walletCards.map(wc => wc.card_id));
  const userCredits = cardCreditsData.filter(c => userCardIds.has(c.card_id));

  // Helper function to create anniversary date
  function createAnniversaryDate(year: number, month: number, day: number): Date {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) {
      return new Date(year, month + 1, 0);
    }
    return date;
  }

  // Process expiring credits
  interface ExpiringCredit {
    id: string;
    creditId: string;
    creditName: string;
    cardName: string;
    walletCardId: string;
    playerNumber: number | null;
    expiresAt: Date;
    value: number;
    isValueBased: boolean;
    unitName: string | null;
    isUsed: boolean;
    resetCycle: string;
    travelCategory: string | null;
  }

  const expiringCredits: ExpiringCredit[] = [];

  for (const credit of userCredits) {
    const walletIdsForCard = cardIdToWalletIds.get(credit.card_id) ?? [];

    for (const walletId of walletIdsForCard) {
      const walletCard = walletCardMap.get(walletId);
      if (!walletCard || !walletCard.cards) continue;

      const settingsKey = `${walletId}:${credit.id}`;
      const settings = creditSettingsMap.get(settingsKey);

      // Skip hidden credits
      if (settings?.is_hidden) continue;

      // Skip usage-based credits (no fixed expiration)
      if (credit.reset_cycle === "usage_based") continue;

      // Calculate period end
      let periodEnd: Date | null = null;
      const month = now.getMonth();
      const year = now.getFullYear();

      if (credit.reset_cycle === "monthly") {
        periodEnd = new Date(year, month + 1, 0);
      } else if (credit.reset_cycle === "quarterly") {
        const q = Math.floor(month / 3);
        periodEnd = new Date(year, (q + 1) * 3, 0);
      } else if (credit.reset_cycle === "semiannual") {
        const h = month < 6 ? 0 : 1;
        periodEnd = new Date(year, (h + 1) * 6, 0);
      } else if (credit.reset_cycle === "annual") {
        periodEnd = new Date(year, 11, 31);
      } else if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
        const approvalDate = parseLocalDate(walletCard.approval_date);
        const approvalMonth = approvalDate.getMonth();
        const approvalDay = approvalDate.getDate();
        let anniversaryYear = year;
        const thisYearAnniversary = createAnniversaryDate(year, approvalMonth, approvalDay);
        if (now >= thisYearAnniversary) {
          anniversaryYear = year + 1;
        }
        periodEnd = createAnniversaryDate(anniversaryYear, approvalMonth, approvalDay);
        periodEnd.setDate(periodEnd.getDate() - 1);
      }

      if (!periodEnd || periodEnd < now) continue;

      // Check if credit is used this period
      const periodStartStr = getPeriodStart(credit.reset_cycle, now, walletCard.approval_date);
      const usage = creditUsage.filter(
        u => u.credit_id === credit.id && u.user_wallet_id === walletId && u.period_start === periodStartStr
      );
      const totalUsed = usage.reduce((sum, u) => sum + u.amount_used, 0);
      const maxAmount = credit.default_value_cents
        ? credit.default_value_cents / 100
        : (credit.default_quantity ?? 1);

      const isUsed = totalUsed >= maxAmount;

      expiringCredits.push({
        id: `${walletId}:${credit.id}`,
        creditId: credit.id,
        creditName: credit.brand_name ? `${credit.name} (${credit.brand_name})` : credit.name,
        cardName: walletCard.custom_name ?? walletCard.cards.name,
        walletCardId: walletId,
        playerNumber: walletCard.player_number,
        expiresAt: periodEnd,
        value: credit.default_value_cents ? credit.default_value_cents / 100 : (credit.default_quantity ?? 1),
        isValueBased: !!credit.default_value_cents,
        unitName: credit.unit_name,
        isUsed,
        resetCycle: credit.reset_cycle,
        travelCategory: credit.travel_category ?? null,
      });
    }
  }

  // Sort by expiration date
  expiringCredits.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

  // Process expiring inventory
  interface ExpiringInventoryItem {
    id: string;
    name: string;
    brand: string | null;
    typeName: string;
    typeSlug: string;
    expirationDate: Date;
    value: number;
    playerNumber: number | null;
    trackingType: string;
    quantity: number | null;
    quantityUsed: number | null;
    remainingValueCents: number | null;
    originalValueCents: number | null;
  }

  const expiringInventory: ExpiringInventoryItem[] = [];

  for (const item of inventoryItems) {
    if (!item.expiration_date || item.no_expiration || item.is_used) continue;
    if (hiddenItemKeys.has(`inventory:${item.id}`)) continue;

    const expDate = parseLocalDate(item.expiration_date);
    if (expDate < now) continue;

    const valueCents = item.remaining_value_cents ?? item.original_value_cents ?? 0;

    expiringInventory.push({
      id: item.id,
      name: item.name,
      brand: item.brand,
      typeName: item.inventory_types?.name ?? "Unknown",
      typeSlug: item.inventory_types?.slug ?? "unknown",
      expirationDate: expDate,
      value: valueCents / 100,
      playerNumber: item.player_number,
      trackingType: item.inventory_types?.tracking_type ?? "single_use",
      quantity: item.quantity,
      quantityUsed: item.quantity_used,
      remainingValueCents: item.remaining_value_cents,
      originalValueCents: item.original_value_cents,
    });
  }

  expiringInventory.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

  // Process upcoming card renewals (annual fees)
  interface UpcomingFee {
    walletId: string;
    cardName: string;
    annualFee: number;
    anniversaryDate: Date;
    playerNumber: number | null;
  }

  const upcomingFees: UpcomingFee[] = [];

  for (const wc of walletCards) {
    if (!wc.approval_date || !wc.cards) continue;
    if (wc.cards.annual_fee <= 0) continue;
    if (hiddenItemKeys.has(`renewal:${wc.id}`)) continue;

    const approvalDate = parseLocalDate(wc.approval_date);
    const approvalMonth = approvalDate.getMonth();
    const approvalDay = approvalDate.getDate();

    let anniversaryYear = now.getFullYear();
    let nextAnniversary = createAnniversaryDate(anniversaryYear, approvalMonth, approvalDay);

    if (nextAnniversary < now) {
      anniversaryYear++;
      nextAnniversary = createAnniversaryDate(anniversaryYear, approvalMonth, approvalDay);
    }

    if (nextAnniversary >= now) {
      upcomingFees.push({
        walletId: wc.id,
        cardName: wc.custom_name ?? wc.cards.name,
        annualFee: wc.cards.annual_fee,
        anniversaryDate: nextAnniversary,
        playerNumber: wc.player_number,
      });
    }
  }

  upcomingFees.sort((a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime());

  // Process expiring points
  interface ExpiringPoint {
    currencyId: string;
    currencyName: string;
    currencyType: string | null;
    balance: number;
    expirationDate: Date;
    playerNumber: number;
  }

  const expiringPoints: ExpiringPoint[] = [];

  for (const pb of pointBalances) {
    if (pb.balance <= 0 || !pb.expiration_date) continue;
    if (hiddenItemKeys.has(`points:${pb.currency_id}:${pb.player_number}`)) continue;

    const expDate = parseLocalDate(pb.expiration_date);
    if (expDate < now) continue;

    const currency = currencyMap.get(pb.currency_id);
    if (!currency) continue;

    expiringPoints.push({
      currencyId: pb.currency_id,
      currencyName: currency.name,
      currencyType: currency.currency_type,
      balance: pb.balance,
      expirationDate: expDate,
      playerNumber: pb.player_number,
    });
  }

  expiringPoints.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

  // Server actions for credits
  async function markCreditUsed(formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    const userWalletId = formData.get("user_wallet_id") as string;
    const creditId = formData.get("credit_id") as string;
    const periodStart = formData.get("period_start") as string;
    const periodEnd = formData.get("period_end") as string;
    const amountUsed = parseFloat(formData.get("amount_used") as string) || 0;
    const isCurrentlyUsed = formData.get("is_used") === "true";

    // Verify ownership
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("id", userWalletId)
      .eq("user_id", userId)
      .single();

    if (!wallet) return;

    // Check for existing usage
    const { data: existingUsage } = await supabase
      .from("user_credit_usage")
      .select("id, amount_used")
      .eq("user_wallet_id", userWalletId)
      .eq("credit_id", creditId)
      .eq("period_start", periodStart)
      .single();

    if (isCurrentlyUsed && existingUsage) {
      // Unmark as used - delete the usage record
      await supabase
        .from("user_credit_usage")
        .delete()
        .eq("id", existingUsage.id);
    } else if (!isCurrentlyUsed) {
      // Mark as used
      if (existingUsage) {
        await supabase
          .from("user_credit_usage")
          .update({
            amount_used: existingUsage.amount_used + amountUsed,
            used_at: new Date().toISOString(),
          })
          .eq("id", existingUsage.id);
      } else {
        await supabase.from("user_credit_usage").insert({
          user_wallet_id: userWalletId,
          credit_id: creditId,
          period_start: periodStart,
          period_end: periodEnd,
          amount_used: amountUsed,
          used_at: new Date().toISOString(),
        });
      }
    }

    revalidatePath("/upcoming");
    revalidatePath("/credits");
    revalidatePath("/dashboard");
  }

  async function toggleCreditHidden(formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    const userWalletId = formData.get("user_wallet_id") as string;
    const creditId = formData.get("credit_id") as string;
    const isHidden = formData.get("is_hidden") === "true";

    // Verify ownership
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("id", userWalletId)
      .eq("user_id", userId)
      .single();

    if (!wallet) return;

    await supabase.from("user_credit_settings").upsert(
      {
        user_wallet_id: userWalletId,
        credit_id: creditId,
        is_hidden: isHidden,
      },
      { onConflict: "user_wallet_id,credit_id" }
    );

    revalidatePath("/upcoming");
    revalidatePath("/credits");
    revalidatePath("/dashboard");
  }

  async function hideItem(formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    const itemType = formData.get("item_type") as string;
    const itemKey = formData.get("item_key") as string;

    await supabase.from("user_hidden_items").insert({
      user_id: userId,
      item_type: itemType,
      item_key: itemKey,
    });

    revalidatePath("/upcoming");
    revalidatePath("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Upcoming</h1>
          <p className="text-zinc-400 mt-1">
            Track expiring credits, inventory, card renewals, and points
          </p>
        </div>

        <UpcomingClient
          expiringCredits={expiringCredits}
          expiringInventory={expiringInventory}
          upcomingFees={upcomingFees}
          expiringPoints={expiringPoints}
          players={players}
          onMarkCreditUsed={markCreditUsed}
          onToggleCreditHidden={toggleCreditHidden}
          onHideItem={hideItem}
        />
      </div>
    </div>
  );
}

// Helper function to get period start string
function getPeriodStart(resetCycle: string, date: Date, approvalDate?: string | null): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (resetCycle) {
    case "monthly":
      return `${year}-${String(month + 1).padStart(2, "0")}-01`;
    case "quarterly": {
      const q = Math.floor(month / 3);
      return `${year}-${String(q * 3 + 1).padStart(2, "0")}-01`;
    }
    case "semiannual": {
      const h = month < 6 ? 0 : 1;
      return `${year}-${String(h * 6 + 1).padStart(2, "0")}-01`;
    }
    case "annual":
      return `${year}-01-01`;
    case "cardmember_year": {
      if (!approvalDate) return `${year}-01-01`;
      const approval = parseLocalDate(approvalDate);
      const startYear = approval.getFullYear();
      const yearsElapsed = year - startYear;
      const start = new Date(startYear + yearsElapsed, approval.getMonth(), approval.getDate());
      if (start > date) {
        start.setFullYear(start.getFullYear() - 1);
      }
      return start.toISOString().split("T")[0];
    }
    default:
      return `${year}-01-01`;
  }
}
