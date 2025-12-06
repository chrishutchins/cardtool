import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { ReturnsDisplay } from "./returns-display";
import {
  calculatePortfolioReturns,
  calculateMarginalValues,
  CardInput,
  CategorySpending,
  EarningRuleInput,
  CategoryBonusInput,
  TravelPreference,
  EarningsGoal,
} from "@/lib/returns-calculator";

interface Props {
  searchParams: Promise<{ goal?: string }>;
}

export default async function ReturnsPage({ searchParams }: Props) {
  const params = await searchParams;
  const earningsGoal = (["maximize", "cash_only", "points_only"].includes(params.goal ?? "") 
    ? params.goal 
    : "maximize") as EarningsGoal;
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Fetch all required data in parallel
  const [
    walletResult,
    spendingResult,
    rulesResult,
    bonusesResult,
    currenciesResult,
    userCurrencyValuesResult,
    perksResult,
    selectionsResult,
    travelPrefsResult,
    categoriesResult,
  ] = await Promise.all([
    // User's wallet cards with full details
    supabase
      .from("user_wallets")
      .select(`
        card_id,
        cards:card_id (
          id,
          name,
          slug,
          annual_fee,
          default_earn_rate,
          primary_currency_id,
          secondary_currency_id,
          issuer_id,
          primary_currency:reward_currencies!cards_primary_currency_id_fkey (
            id, name, code, currency_type, base_value_cents
          ),
          secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (
            id, name, code, currency_type, base_value_cents
          )
        )
      `)
      .eq("user_id", user.id),
    
    // User's spending per category
    supabase
      .from("user_effective_spending")
      .select("category_id, category_name, category_slug, annual_spend_cents")
      .eq("user_id", user.id),
    
    // All earning rules for user's cards (fetched after we know which cards)
    supabase
      .from("card_earning_rules")
      .select("id, card_id, category_id, rate, has_cap, cap_amount, cap_period, cap_unit, post_cap_rate, booking_method, brand_name"),
    
    // All category bonuses with their categories
    supabase
      .from("card_caps")
      .select(`
        id,
        card_id,
        cap_type,
        cap_amount,
        cap_period,
        elevated_rate,
        post_cap_rate,
        card_cap_categories (category_id)
      `),
    
    // All currencies for default values and cash out values
    supabase
      .from("reward_currencies")
      .select("id, base_value_cents, cash_out_value_cents"),
    
    // User's custom currency values
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", user.id),
    
    // User's perks values
    supabase
      .from("user_card_perks_values")
      .select("card_id, perks_value")
      .eq("user_id", user.id),
    
    // User's category selections for "selected_category" bonuses
    supabase
      .from("user_card_selections")
      .select("cap_id, selected_category_id")
      .eq("user_id", user.id),
    
    // User's travel booking preferences
    supabase
      .from("user_travel_booking_preferences")
      .select("category_slug, preference_type, brand_name, portal_issuer_id")
      .eq("user_id", user.id),
    
    // All categories for parent lookups and exclusion status
    supabase
      .from("earning_categories")
      .select("id, name, slug, parent_category_id, excluded_by_default"),
  ]);

  // Process wallet cards
  const userCardIds = new Set<string>();
  const cards: CardInput[] = [];
  
  walletResult.data?.forEach((w) => {
    if (w.cards) {
      userCardIds.add(w.card_id);
      cards.push(w.cards as unknown as CardInput);
    }
  });

  // Filter earning rules to only user's cards
  const earningRules: EarningRuleInput[] = (rulesResult.data ?? [])
    .filter((r) => userCardIds.has(r.card_id))
    .map((r) => ({
      id: r.id,
      card_id: r.card_id,
      category_id: r.category_id,
      rate: Number(r.rate),
      has_cap: r.has_cap,
      cap_amount: r.cap_amount ? Number(r.cap_amount) : null,
      cap_period: r.cap_period,
      cap_unit: r.cap_unit,
      post_cap_rate: r.post_cap_rate ? Number(r.post_cap_rate) : null,
      booking_method: r.booking_method,
      brand_name: r.brand_name,
    }));

  // Filter category bonuses to only user's cards
  const categoryBonuses: CategoryBonusInput[] = (bonusesResult.data ?? [])
    .filter((b) => userCardIds.has(b.card_id))
    .map((b) => ({
      id: b.id,
      card_id: b.card_id,
      cap_type: b.cap_type,
      cap_amount: b.cap_amount ? Number(b.cap_amount) : null,
      cap_period: b.cap_period,
      elevated_rate: Number(b.elevated_rate),
      post_cap_rate: b.post_cap_rate ? Number(b.post_cap_rate) : null,
      category_ids: (b.card_cap_categories as { category_id: number }[] ?? []).map(c => c.category_id),
    }));

  // Build category map with exclusion status
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  categoriesResult.data?.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
  });

  // Process spending with exclusion status
  const spending: CategorySpending[] = (spendingResult.data ?? []).map((s) => ({
    category_id: s.category_id!,
    category_name: s.category_name!,
    category_slug: s.category_slug!,
    annual_spend_cents: s.annual_spend_cents!,
    excluded_by_default: categoryExclusionMap.get(s.category_id!) ?? false,
    parent_category_id: categoryParentMap.get(s.category_id!) ?? null,
  }));

  // Build currency value maps
  const defaultCurrencyValues = new Map<string, number>();
  const cashOutValues = new Map<string, number>();
  currenciesResult.data?.forEach((c) => {
    if (c.base_value_cents) {
      defaultCurrencyValues.set(c.id, c.base_value_cents);
    }
    if (c.cash_out_value_cents) {
      cashOutValues.set(c.id, c.cash_out_value_cents);
    }
  });

  const userCurrencyValues = new Map<string, number>();
  userCurrencyValuesResult.data?.forEach((v) => {
    userCurrencyValues.set(v.currency_id, v.value_cents);
  });

  // Build perks values map
  const perksValues = new Map<string, number>();
  perksResult.data?.forEach((p) => {
    perksValues.set(p.card_id, p.perks_value);
  });

  // Build user selections map
  const userSelections = new Map<string, number>();
  selectionsResult.data?.forEach((s) => {
    userSelections.set(s.cap_id, s.selected_category_id);
  });

  // Build travel preferences
  const travelPreferences: TravelPreference[] = (travelPrefsResult.data ?? []).map((p) => ({
    category_slug: p.category_slug,
    preference_type: p.preference_type,
    brand_name: p.brand_name,
    portal_issuer_id: p.portal_issuer_id,
  }));

  // Determine enabled secondary cards
  const userPrimaryCurrencyIds = new Set<string>();
  cards.forEach((c) => {
    userPrimaryCurrencyIds.add(c.primary_currency_id);
  });

  const enabledSecondaryCards = new Set<string>();
  cards.forEach((c) => {
    if (c.secondary_currency_id && userPrimaryCurrencyIds.has(c.secondary_currency_id)) {
      enabledSecondaryCards.add(c.id);
    }
  });

  // Calculate returns
  const calculatorInput = {
    cards,
    spending,
    earningRules,
    categoryBonuses,
    userCurrencyValues,
    defaultCurrencyValues,
    cashOutValues,
    perksValues,
    userSelections,
    travelPreferences,
    enabledSecondaryCards,
    earningsGoal,
  };
  
  const returns = calculatePortfolioReturns(calculatorInput);
  
  // Calculate marginal values for each card
  const marginalValues = calculateMarginalValues(calculatorInput, returns);
  
  // Merge marginal values into card breakdown
  returns.cardBreakdown.forEach(card => {
    const mv = marginalValues.get(card.cardId);
    if (mv) {
      card.marginalValue = mv.marginalValue;
      card.replacementValue = mv.replacementValue;
    }
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Total Earnings</h1>
          <p className="text-zinc-400 mt-1">
            Optimal allocation of your spending across {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <ReturnsDisplay returns={returns} earningsGoal={earningsGoal} />
      </div>
    </div>
  );
}

