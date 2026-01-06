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

  const supabase = await createClient();

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Fetch user's wallet cards with card details
  const { data: walletCards } = await supabase
    .from("user_wallets")
    .select(`
      id,
      card_id,
      custom_name,
      approval_date,
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
      must_be_earned
    `)
    .in("card_id", walletCardIds.length > 0 ? walletCardIds : ["none"])
    .eq("is_active", true)
    .order("name");

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
          amount_cents,
          date,
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

    const supabase = await createClient();

    const userWalletId = formData.get("user_wallet_id") as string;
    const creditId = formData.get("credit_id") as string;
    const periodStart = formData.get("period_start") as string;
    const periodEnd = formData.get("period_end") as string;
    const amountUsed = parseFloat(formData.get("amount_used") as string) || 0;
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

    // Check if there's already a usage record for this credit in this period
    const { data: existingUsage } = await supabase
      .from("user_credit_usage")
      .select("id, amount_used")
      .eq("user_wallet_id", userWalletId)
      .eq("credit_id", creditId)
      .eq("period_start", periodStart)
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

    const supabase = await createClient();

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

    const supabase = await createClient();

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

    const supabase = await createClient();
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

  // Transform data for client component
  type WalletCardData = {
    id: string;
    card_id: string;
    custom_name: string | null;
    approval_date: string | null;
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
          }))}
          credits={credits ?? []}
          creditUsage={creditUsage ?? []}
          creditSettings={creditSettings ?? []}
          onMarkUsed={markCreditUsed}
          onDeleteUsage={deleteCreditUsage}
          onUpdateSettings={updateCreditSettings}
          onUpdateApprovalDate={updateApprovalDate}
        />
      </div>
    </div>
  );
}

