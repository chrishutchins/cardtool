import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { CreditsClient } from "./credits-client";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { PlaidSyncTrigger } from "@/components/plaid-sync-trigger";
import { calculateCreditPeriod } from "@/lib/credit-matcher";

export const metadata: Metadata = {
  title: "Credit Tracker | CardTool",
  description: "Track and manage your credit card perks and credits",
};

export default async function CreditsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get effective user ID for data reads (may be emulated user if admin is emulating)
  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();
  
  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Fetch user's wallet cards with card details (including closed cards for history)
  const { data: walletCards } = await supabase
    .from("user_wallets")
    .select(`
      id,
      card_id,
      custom_name,
      approval_date,
      closed_date,
      closed_reason,
      cards:card_id (
        id,
        name,
        slug
      )
    `)
    .eq("user_id", effectiveUserId);

  // Get all credits for cards in user's wallet
  const walletCardIds = walletCards?.map((wc) => wc.card_id) ?? [];
  
  const { data: credits } = await supabase
    .from("card_credits")
    .select(`
      id,
      card_id,
      name,
      brand_name,
      reset_cycle,
      reset_day_of_month,
      default_value_cents,
      default_quantity,
      unit_name,
      notes,
      renewal_period_months,
      must_be_earned,
      inventory_type_id,
      credit_count
    `)
    .in("card_id", walletCardIds.length > 0 ? walletCardIds : ["none"])
    .eq("is_active", true)
    .order("name");

  // Fetch inventory types for the add-to-inventory flow
  const { data: inventoryTypes } = await supabase
    .from("inventory_types")
    .select("id, name, slug, tracking_type, display_order")
    .eq("is_active", true)
    .order("display_order");

  // Get user's credit usage with linked transactions
  const walletEntryIds = walletCards?.map((wc) => wc.id) ?? [];
  
  const { data: creditUsage } = await supabase
    .from("user_credit_usage")
    .select(`
      id,
      user_wallet_id,
      credit_id,
      period_start,
      period_end,
      amount_used,
      perceived_value_cents,
      notes,
      used_at,
      auto_detected,
      is_clawback,
      slot_number,
      user_credit_usage_transactions (
        id,
        amount_cents,
        transaction_id,
        user_plaid_transactions:transaction_id (
          id,
          name,
          original_description,
          amount_cents,
          date,
          authorized_date,
          merchant_name
        )
      )
    `)
    .in("user_wallet_id", walletEntryIds.length > 0 ? walletEntryIds : ["none"]);

  // Get user's credit settings (hidden, value overrides, notes, auto-repeat)
  const { data: creditSettings } = await supabase
    .from("user_credit_settings")
    .select(`
      id,
      user_wallet_id,
      credit_id,
      is_hidden,
      user_value_override_cents,
      notes,
      is_auto_repeat
    `)
    .in("user_wallet_id", walletEntryIds.length > 0 ? walletEntryIds : ["none"]);

  // Server actions
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
    const slotNumberStr = formData.get("slot_number") as string;
    const slotNumber = slotNumberStr ? parseInt(slotNumberStr) : 1;
    const perceivedValueStr = formData.get("perceived_value") as string;
    const notesRaw = formData.get("notes") as string;
    const notes = notesRaw?.trim() || null;
    const usedAtRaw = formData.get("used_at") as string;
    const usedAt = usedAtRaw?.trim() ? usedAtRaw : new Date().toISOString();

    // Verify the wallet belongs to the current user
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("id", userWalletId)
      .eq("user_id", userId)
      .single();

    if (!wallet) {
      console.error("Unauthorized: wallet does not belong to user");
      return;
    }

    // Check if there's already a usage record for this credit in this period and slot
    const { data: existingUsage } = await supabase
      .from("user_credit_usage")
      .select("id, amount_used")
      .eq("user_wallet_id", userWalletId)
      .eq("credit_id", creditId)
      .eq("period_start", periodStart)
      .eq("slot_number", slotNumber)
      .single();

    const perceivedValueCents = perceivedValueStr ? Math.round(parseFloat(perceivedValueStr) * 100) : null;

    // If there's existing usage for this period, update it instead of inserting
    if (existingUsage) {
      const newAmount = existingUsage.amount_used + amountUsed;
      const { error } = await supabase
        .from("user_credit_usage")
        .update({ 
          amount_used: newAmount,
          used_at: usedAt,
          perceived_value_cents: perceivedValueCents,
          notes,
        })
        .eq("id", existingUsage.id);

      if (error) {
        console.error("Error updating credit usage:", error);
        return;
      }

      revalidatePath("/credits");
      return;
    }

    const { error } = await supabase.from("user_credit_usage").insert({
      user_wallet_id: userWalletId,
      credit_id: creditId,
      period_start: periodStart,
      period_end: periodEnd,
      amount_used: amountUsed,
      slot_number: slotNumber,
      perceived_value_cents: perceivedValueCents,
      notes,
      used_at: usedAt,
    });

    if (error) {
      console.error("Error marking credit used:", error);
      return;
    }

    revalidatePath("/credits");
  }

  async function deleteCreditUsage(usageId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();

    // First verify the usage record belongs to a wallet owned by this user
    const { data: usage } = await supabase
      .from("user_credit_usage")
      .select("user_wallet_id, user_wallets!inner(user_id)")
      .eq("id", usageId)
      .single();

    if (!usage || (usage.user_wallets as { user_id: string })?.user_id !== userId) {
      console.error("Unauthorized: usage record does not belong to user");
      return;
    }

    await supabase.from("user_credit_usage").delete().eq("id", usageId);
    revalidatePath("/credits");
  }

  async function updateCreditSettings(formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();

    const userWalletId = formData.get("user_wallet_id") as string;
    const creditId = formData.get("credit_id") as string;
    const isHidden = formData.get("is_hidden") === "true";
    const userValueOverrideStr = formData.get("user_value_override") as string;
    const notes = formData.get("notes") as string || null;
    const isAutoRepeat = formData.get("is_auto_repeat") === "true";

    // Verify the wallet belongs to the current user
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("id", userWalletId)
      .eq("user_id", userId)
      .single();

    if (!wallet) {
      console.error("Unauthorized: wallet does not belong to user");
      return;
    }

    const userValueOverrideCents = userValueOverrideStr ? Math.round(parseFloat(userValueOverrideStr) * 100) : null;

    const { error } = await supabase.from("user_credit_settings").upsert(
      {
        user_wallet_id: userWalletId,
        credit_id: creditId,
        is_hidden: isHidden,
        user_value_override_cents: userValueOverrideCents,
        notes,
        is_auto_repeat: isAutoRepeat,
      },
      { onConflict: "user_wallet_id,credit_id" }
    );

    if (error) {
      console.error("Error updating credit settings:", error);
      return;
    }

    revalidatePath("/credits");
  }

  async function updateApprovalDate(walletId: string, date: string | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("updateApprovalDate: No user found");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_wallets")
      .update({ approval_date: date })
      .eq("id", walletId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating approval date:", error);
      return;
    }

    revalidatePath("/credits");
    revalidatePath("/wallet");
  }

  async function updateCreditUsagePeriod(usageId: string, newDate: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("updateCreditUsagePeriod: No user found");
      return;
    }

    const supabase = createClient();

    // First, get the usage record with its credit and wallet info
    const { data: usage, error: usageError } = await supabase
      .from("user_credit_usage")
      .select(`
        id,
        credit_id,
        user_wallet_id,
        user_wallets!inner (
          user_id,
          approval_date
        ),
        card_credits!inner (
          reset_cycle,
          reset_day_of_month
        )
      `)
      .eq("id", usageId)
      .single();

    if (usageError || !usage) {
      console.error("Error fetching usage record:", usageError);
      return;
    }

    // Verify the usage belongs to the current user
    const walletData = usage.user_wallets as unknown as { user_id: string; approval_date: string | null };
    if (walletData.user_id !== userId) {
      console.error("Unauthorized: usage record does not belong to user");
      return;
    }

    // Calculate the new period based on the new date
    // Pass date strings directly - calculateCreditPeriod uses parseLocalDate internally to avoid timezone issues
    const creditData = usage.card_credits as unknown as { reset_cycle: string; reset_day_of_month: number | null };
    const { periodStart, periodEnd } = calculateCreditPeriod(
      newDate,
      creditData.reset_cycle as "monthly" | "quarterly" | "semiannual" | "annual" | "cardmember_year" | "usage_based",
      walletData.approval_date,
      creditData.reset_day_of_month
    );

    // Format dates as YYYY-MM-DD
    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    // Update the usage record with new period and date
    const { error: updateError } = await supabase
      .from("user_credit_usage")
      .update({
        period_start: periodStartStr,
        period_end: periodEndStr,
        used_at: newDate,
      })
      .eq("id", usageId);

    if (updateError) {
      console.error("Error updating credit usage period:", updateError);
      return;
    }

    revalidatePath("/credits");
  }

  async function moveTransactionToPeriod(transactionId: string, newDate: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("moveTransactionToPeriod: No user found");
      return;
    }

    const supabase = createClient();

    // Get the transaction with its linked usage record
    const { data: txnLink, error: txnLinkError } = await supabase
      .from("user_credit_usage_transactions")
      .select(`
        id,
        usage_id,
        transaction_id,
        amount_cents,
        user_credit_usage!inner (
          id,
          credit_id,
          user_wallet_id,
          period_start,
          period_end,
          amount_used,
          slot_number,
          user_wallets!inner (
            user_id,
            approval_date
          ),
          card_credits!inner (
            id,
            reset_cycle,
            reset_day_of_month,
            default_value_cents,
            credit_count
          )
        )
      `)
      .eq("transaction_id", transactionId)
      .single();

    if (txnLinkError || !txnLink) {
      console.error("Error fetching transaction link:", txnLinkError);
      return;
    }

    const usageData = txnLink.user_credit_usage as unknown as {
      id: string;
      credit_id: string;
      user_wallet_id: string;
      period_start: string;
      period_end: string;
      amount_used: number;
      slot_number: number;
      user_wallets: { user_id: string; approval_date: string | null };
      card_credits: { 
        id: string; 
        reset_cycle: string; 
        reset_day_of_month: number | null;
        default_value_cents: number | null;
        credit_count: number;
      };
    };

    // Verify the usage belongs to the current user
    if (usageData.user_wallets.user_id !== userId) {
      console.error("Unauthorized: usage record does not belong to user");
      return;
    }

    // Calculate the new period based on the new date
    const { periodStart, periodEnd } = calculateCreditPeriod(
      newDate,
      usageData.card_credits.reset_cycle as "monthly" | "quarterly" | "semiannual" | "annual" | "cardmember_year" | "usage_based",
      usageData.user_wallets.approval_date,
      usageData.card_credits.reset_day_of_month
    );

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    // If same period, nothing to do
    if (periodStartStr === usageData.period_start) {
      return;
    }

    const amountToMove = (txnLink.amount_cents || 0) / 100;

    // Remove the transaction amount from the current usage
    const newCurrentAmount = Math.max(0, usageData.amount_used - amountToMove);
    await supabase
      .from("user_credit_usage")
      .update({ amount_used: newCurrentAmount })
      .eq("id", usageData.id);

    // Remove the transaction link from current usage
    await supabase
      .from("user_credit_usage_transactions")
      .delete()
      .eq("id", txnLink.id);

    // Check if there's an existing usage record for the new period
    const { data: existingNewPeriodUsage } = await supabase
      .from("user_credit_usage")
      .select("id, amount_used")
      .eq("user_wallet_id", usageData.user_wallet_id)
      .eq("credit_id", usageData.credit_id)
      .eq("period_start", periodStartStr)
      .limit(1)
      .maybeSingle();

    let targetUsageId: string;

    if (existingNewPeriodUsage) {
      // Add to existing usage
      const newAmount = existingNewPeriodUsage.amount_used + amountToMove;
      await supabase
        .from("user_credit_usage")
        .update({ amount_used: newAmount })
        .eq("id", existingNewPeriodUsage.id);
      targetUsageId = existingNewPeriodUsage.id;
    } else {
      // Create new usage record for the new period
      const { data: newUsage, error: insertError } = await supabase
        .from("user_credit_usage")
        .insert({
          user_wallet_id: usageData.user_wallet_id,
          credit_id: usageData.credit_id,
          period_start: periodStartStr,
          period_end: periodEndStr,
          amount_used: amountToMove,
          auto_detected: true,
          used_at: newDate,
          slot_number: 1,
        })
        .select("id")
        .single();

      if (insertError || !newUsage) {
        console.error("Error creating new usage record:", insertError);
        return;
      }
      targetUsageId = newUsage.id;
    }

    // Link transaction to the new usage record
    await supabase
      .from("user_credit_usage_transactions")
      .insert({
        usage_id: targetUsageId,
        transaction_id: transactionId,
        amount_cents: txnLink.amount_cents,
      });

    // Update the transaction's matched credit info
    await supabase
      .from("user_plaid_transactions")
      .update({
        matched_credit_id: usageData.credit_id,
      })
      .eq("id", transactionId);

    // If the original usage has no more amount, delete it
    if (newCurrentAmount === 0) {
      // Check if there are any other linked transactions
      const { data: remainingLinks } = await supabase
        .from("user_credit_usage_transactions")
        .select("id")
        .eq("usage_id", usageData.id);

      if (!remainingLinks || remainingLinks.length === 0) {
        await supabase
          .from("user_credit_usage")
          .delete()
          .eq("id", usageData.id);
      }
    }

    revalidatePath("/credits");
  }

  async function addInventoryItem(formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();

    const typeId = formData.get("type_id") as string;
    const name = formData.get("name") as string;
    const brandRaw = formData.get("brand") as string;
    const brand = brandRaw?.trim() || null;
    const expirationDateRaw = formData.get("expiration_date") as string;
    const expirationDate = expirationDateRaw?.trim() || null;
    const code = (formData.get("code") as string)?.trim() || null;
    const pin = (formData.get("pin") as string)?.trim() || null;
    const url = (formData.get("url") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const quantityStr = formData.get("quantity") as string;
    const quantity = quantityStr ? parseInt(quantityStr) : 1;
    const originalValueStr = formData.get("original_value") as string;
    const originalValueCents = originalValueStr ? Math.round(parseFloat(originalValueStr) * 100) : null;
    const sourceCreditUsageId = (formData.get("source_credit_usage_id") as string)?.trim() || null;

    const { error } = await supabase.from("user_inventory").insert({
      user_id: userId,
      type_id: typeId,
      name,
      brand,
      expiration_date: expirationDate,
      code,
      pin,
      url,
      notes,
      quantity,
      quantity_used: 0,
      original_value_cents: originalValueCents,
      remaining_value_cents: originalValueCents,
      is_used: false,
      source_credit_usage_id: sourceCreditUsageId,
    });

    if (error) {
      console.error("Error adding inventory item:", error);
      return;
    }

    revalidatePath("/credits");
    revalidatePath("/inventory");
  }

  // Transform data for client component
  type WalletCardData = {
    id: string;
    card_id: string;
    custom_name: string | null;
    approval_date: string | null;
    closed_date: string | null;
    closed_reason: string | null;
    cards: { id: string; name: string; slug: string } | null;
  };

  const transformedWalletCards = (walletCards ?? []) as unknown as WalletCardData[];

  return (
    <div className="min-h-screen bg-zinc-950">
      <PlaidSyncTrigger />
      <UserHeader isAdmin={isAdmin} creditTrackingEnabled={true} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Credit Tracker</h1>
          <p className="text-zinc-400 mt-1">
            Track and manage your card credits and benefits
          </p>
        </div>

        <CreditsClient
          walletCards={transformedWalletCards.map(wc => ({
            id: wc.id,
            card_id: wc.card_id,
            display_name: wc.custom_name ?? wc.cards?.name ?? "",
            card_name: wc.cards?.name ?? "",
            approval_date: wc.approval_date,
            closed_date: wc.closed_date,
          }))}
          credits={credits ?? []}
          creditUsage={creditUsage ?? []}
          creditSettings={creditSettings ?? []}
          inventoryTypes={inventoryTypes ?? []}
          isAdmin={isAdmin}
          onMarkUsed={markCreditUsed}
          onDeleteUsage={deleteCreditUsage}
          onUpdateSettings={updateCreditSettings}
          onUpdateApprovalDate={updateApprovalDate}
          onUpdateUsagePeriod={updateCreditUsagePeriod}
          onMoveTransaction={moveTransactionToPeriod}
          onAddInventoryItem={addInventoryItem}
        />
      </div>
    </div>
  );
}

