import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { SpendPlannerClient } from "./spend-planner-client";

export const metadata: Metadata = {
  title: "Spend Planner | CardTool",
  description: "Plan your annual spending and card goals",
};

// Categories to hide (derived/payment overlays, not real MCC categories)
const HIDDEN_CATEGORY_SLUGS = ["mobile-pay", "over-5k", "paypal"];

export default async function SpendPlannerPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();

  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  // Check if admin (for now, only admins can access)
  const isAdmin = user.primaryEmailAddress?.emailAddress
    ? isAdminEmail(user.primaryEmailAddress.emailAddress)
    : false;

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  // Fetch all required data in parallel
  const [
    categoriesResult,
    walletCardsResult,
    plannedSpendingResult,
    cardGoalsResult,
    spendBonusesResult,
  ] = await Promise.all([
    // Categories for dropdowns
    supabase
      .from("earning_categories")
      .select("id, name, slug, parent_category_id")
      .order("name"),
    // User's wallet cards (active only)
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        player_number,
        cards:card_id (
          id,
          name,
          image_url,
          issuers:issuer_id (
            id,
            name
          )
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),
    // Planned spending sources
    supabase
      .from("user_planned_spending")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("year", currentYear)
      .order("name"),
    // Card spend goals
    supabase
      .from("user_card_spend_goals")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("year", currentYear)
      .order("created_at"),
    // User's spend bonuses (for linking goals to bonuses)
    supabase
      .from("user_spend_bonuses")
      .select("id, wallet_card_id, name, spend_threshold_cents, value_cents")
      .eq("user_id", effectiveUserId),
  ]);

  // Process categories (filter hidden)
  const categories = (categoriesResult.data ?? [])
    .filter(c => !HIDDEN_CATEGORY_SLUGS.includes(c.slug))
    .map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parent_category_id: c.parent_category_id,
    }));

  // Process wallet cards
  type WalletCardRaw = {
    id: string;
    card_id: string;
    custom_name: string | null;
    player_number: number | null;
    cards: {
      id: string;
      name: string;
      image_url: string | null;
      issuers: {
        id: string;
        name: string;
      } | null;
    } | null;
  };
  const walletCards = (walletCardsResult.data ?? [] as WalletCardRaw[]).map(wc => ({
    id: wc.id,
    card_id: wc.card_id,
    custom_name: wc.custom_name,
    card_name: (wc.cards as WalletCardRaw["cards"])?.name ?? "Unknown Card",
    card_image: (wc.cards as WalletCardRaw["cards"])?.image_url ?? null,
    issuer_name: (wc.cards as WalletCardRaw["cards"])?.issuers?.name ?? "",
    player_number: wc.player_number,
  }));

  // Process planned spending
  const plannedSpending = (plannedSpendingResult.data ?? []).map(ps => ({
    id: ps.id,
    name: ps.name,
    cost_percent: ps.cost_percent,
    category_id: ps.category_id,
    amount_cents: ps.amount_cents,
    frequency: ps.frequency as "monthly" | "annual" | "one_time",
    target_month: ps.target_month,
    year: ps.year,
    notes: ps.notes,
  }));

  // Process card goals
  const cardGoals = (cardGoalsResult.data ?? []).map(cg => ({
    id: cg.id,
    wallet_card_id: cg.wallet_card_id,
    goal_type: cg.goal_type as "annual_total" | "monthly_target" | "bonus_threshold",
    target_amount_cents: cg.target_amount_cents,
    target_category_id: cg.target_category_id,
    bonus_id: cg.bonus_id,
    year: cg.year,
    notes: cg.notes,
  }));

  // Process spend bonuses
  const spendBonuses = (spendBonusesResult.data ?? []).map(sb => ({
    id: sb.id,
    wallet_card_id: sb.wallet_card_id,
    name: sb.name,
    threshold_cents: sb.spend_threshold_cents ?? 0,
    reward_value_cents: sb.value_cents ?? 0,
  }));

  // Server actions for planned spending
  async function addPlannedSpending(item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_planned_spending")
      .insert({
        user_id: userId,
        year: new Date().getFullYear(),
        ...item,
      });

    revalidatePath("/spend-planner");
  }

  async function updatePlannedSpending(id: string, item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_planned_spending")
      .update(item)
      .eq("id", id)
      .eq("user_id", userId);

    revalidatePath("/spend-planner");
  }

  async function deletePlannedSpending(id: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_planned_spending")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    revalidatePath("/spend-planner");
  }

  // Server actions for card goals
  async function addCardGoal(item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_card_spend_goals")
      .insert({
        user_id: userId,
        year: new Date().getFullYear(),
        target_category_id: null, // Category determined by ROI optimization
        ...item,
      });

    revalidatePath("/spend-planner");
  }

  async function updateCardGoal(id: string, item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_card_spend_goals")
      .update({
        ...item,
        target_category_id: null, // Category determined by ROI optimization
      })
      .eq("id", id)
      .eq("user_id", userId);

    revalidatePath("/spend-planner");
  }

  async function deleteCardGoal(id: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_card_spend_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    revalidatePath("/spend-planner");
  }

  return (
    <div className="flex-1 bg-zinc-950">
      <UserHeader
        isAdmin={isAdmin}
        emulationInfo={emulationInfo}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Spend Planner</h1>
          <p className="text-zinc-400 mt-1">
            Plan your {currentYear} spending and set card goals
          </p>
        </div>

        <SpendPlannerClient
          categories={categories}
          walletCards={walletCards}
          plannedSpending={plannedSpending}
          cardGoals={cardGoals}
          spendBonuses={spendBonuses}
          currentYear={currentYear}
          onAddPlannedSpending={addPlannedSpending}
          onUpdatePlannedSpending={updatePlannedSpending}
          onDeletePlannedSpending={deletePlannedSpending}
          onAddCardGoal={addCardGoal}
          onUpdateCardGoal={updateCardGoal}
          onDeleteCardGoal={deleteCardGoal}
        />
      </div>
    </div>
  );
}
