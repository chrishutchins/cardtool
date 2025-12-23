import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { ReturnsDisplay } from "./returns-display";
import { isAdminEmail } from "@/lib/admin";
import {
  calculatePortfolioReturns,
  calculateMarginalValues,
  calculateCardRecommendations,
  CardInput,
  CategorySpending,
  EarningRuleInput,
  CategoryBonusInput,
  TravelPreference,
  EarningsGoal,
  MultiplierProgram,
  CardRecommendation,
  WelcomeBonusInput,
  WelcomeBonusSettings,
  SpendBonusInput,
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
    debitPayResult,
    selectionsResult,
    travelPrefsResult,
    categoriesResult,
    multiplierProgramsResult,
    userMultiplierTiersResult,
    mobilePayCategoriesResult,
    mobilePayCategoryResult,
    paypalCategoriesResult,
    paypalCategoryResult,
    largePurchaseCategoryResult,
    userPointValueSettingsResult,
    templatesResult,
    allCardsResult,
    welcomeBonusesResult,
    userWelcomeBonusSettingsResult,
    userWelcomeBonusValueOverridesResult,
    spendBonusesResult,
    userSpendBonusValuesResult,
    userBonusDisplaySettingsResult,
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
    
    // User's spending per category (including >$5k portions)
    supabase
      .from("user_effective_spending")
      .select("category_id, category_name, category_slug, annual_spend_cents, large_purchase_spend_cents")
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
    
    // User's debit pay values
    supabase
      .from("user_card_debit_pay")
      .select("card_id, debit_pay_percent")
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
    
    // Multiplier programs with their tiers and eligibility
    supabase
      .from("earning_multiplier_programs")
      .select(`
        id,
        name,
        earning_multiplier_tiers (id, name, multiplier),
        earning_multiplier_currencies (currency_id),
        earning_multiplier_cards (card_id)
      `),
    
    // User's selected multiplier tiers
    supabase
      .from("user_multiplier_tiers")
      .select("program_id, tier_id")
      .eq("user_id", user.id),
    
    // User's mobile pay categories
    supabase
      .from("user_mobile_pay_categories")
      .select("category_id")
      .eq("user_id", user.id),
    
    // Get the Mobile Pay category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "mobile-pay")
      .single(),
    
    // User's PayPal categories
    supabase
      .from("user_paypal_categories")
      .select("category_id")
      .eq("user_id", user.id),
    
    // Get the PayPal category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "paypal")
      .single(),
    
    // Get the >$5k Purchases category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "over-5k")
      .single(),
    
    // User's selected point value template
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", user.id)
      .single(),
    
    // All templates with their values
    supabase
      .from("point_value_templates")
      .select(`
        id,
        is_default,
        template_currency_values (currency_id, value_cents)
      `),
    
    // All cards for recommendations
    supabase
      .from("cards")
      .select(`
        id,
        name,
        slug,
        annual_fee,
        default_earn_rate,
        default_perks_value,
        exclude_from_recommendations,
        primary_currency_id,
        secondary_currency_id,
        issuer_id,
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
      `)
      .eq("is_active", true),
    
    // Welcome bonuses for all cards
    supabase
      .from("card_welcome_bonuses")
      .select("id, card_id, spend_requirement_cents, time_period_months, component_type, points_amount, currency_id, cash_amount_cents, benefit_description, default_benefit_value_cents"),
    
    // User's welcome bonus settings
    supabase
      .from("user_welcome_bonus_settings")
      .select("card_id, is_active, spend_requirement_override, time_period_override")
      .eq("user_id", user.id),
    
    // User's welcome bonus value overrides
    supabase
      .from("user_welcome_bonus_value_overrides")
      .select("welcome_bonus_id, value_cents")
      .eq("user_id", user.id),
    
    // Spend bonuses for all cards
    supabase
      .from("card_spend_bonuses")
      .select("id, card_id, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, default_value_cents, period, per_spend_cents, elite_unit_name, default_unit_value_cents, cap_amount, cap_period"),
    
    // User's spend bonus value overrides
    supabase
      .from("user_spend_bonus_values")
      .select("spend_bonus_id, value_cents")
      .eq("user_id", user.id),
    
    // User's bonus display settings
    supabase
      .from("user_bonus_display_settings")
      .select("include_welcome_bonuses, include_spend_bonuses")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Process wallet cards
  // Track instance counts for fee calculation (users may have multiple of same card)
  const userCardIds = new Set<string>();
  const cardInstanceCounts = new Map<string, number>();
  
  walletResult.data?.forEach((w) => {
    if (w.cards) {
      userCardIds.add(w.card_id);
      cardInstanceCounts.set(w.card_id, (cardInstanceCounts.get(w.card_id) ?? 0) + 1);
    }
  });
  
  // De-duplicate cards for spend allocation (same card earns the same)
  const cards: CardInput[] = Array.from(
    new Map(
      (walletResult.data ?? [])
        .filter(w => w.cards)
        .map(w => [w.card_id, w.cards as unknown as CardInput])
    ).values()
  );

  // Process ALL earning rules (needed for recommendations)
  const allEarningRules: EarningRuleInput[] = (rulesResult.data ?? [])
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

  // Filter earning rules to only user's cards (for current returns calculation)
  const earningRules = allEarningRules.filter((r) => userCardIds.has(r.card_id));

  // Process ALL category bonuses (needed for recommendations)
  const allCategoryBonuses: CategoryBonusInput[] = (bonusesResult.data ?? [])
    .map((b) => ({
      id: b.id,
      card_id: b.card_id,
      cap_type: b.cap_type,
      cap_amount: b.cap_amount ? Number(b.cap_amount) : null,
      cap_period: b.cap_period,
      elevated_rate: Number(b.elevated_rate),
      post_cap_rate: b.post_cap_rate ? Number(b.post_cap_rate) : null,
      category_ids: ((b.card_cap_categories as unknown as { category_id: number }[]) ?? []).map(c => c.category_id),
    }));

  // Filter category bonuses to only user's cards (for current returns calculation)
  const categoryBonuses = allCategoryBonuses.filter((b) => userCardIds.has(b.card_id));

  // Build category map with exclusion status
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  categoriesResult.data?.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
  });

  // Process spending with exclusion status and >$5k tracking
  const spending: CategorySpending[] = (spendingResult.data ?? []).map((s) => ({
    category_id: s.category_id!,
    category_name: s.category_name!,
    category_slug: s.category_slug!,
    annual_spend_cents: s.annual_spend_cents!,
    large_purchase_spend_cents: s.large_purchase_spend_cents ?? 0,
    excluded_by_default: categoryExclusionMap.get(s.category_id!) ?? false,
    parent_category_id: categoryParentMap.get(s.category_id!) ?? null,
  }));

  // Determine user's selected template
  const templates = templatesResult.data ?? [];
  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
  const selectedTemplateId = userPointValueSettingsResult.data?.selected_template_id ?? defaultTemplate?.id ?? null;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  
  // Build template value map
  // Note: Supabase returns NUMERIC as strings, so parse them explicitly
  const templateValueMap = new Map<string, number>();
  if (selectedTemplate?.template_currency_values) {
    for (const tv of selectedTemplate.template_currency_values) {
      templateValueMap.set(tv.currency_id, parseFloat(String(tv.value_cents)));
    }
  }

  // Build currency value maps
  // Default values come from: template value > base currency value
  const defaultCurrencyValues = new Map<string, number>();
  const cashOutValues = new Map<string, number>();
  currenciesResult.data?.forEach((c) => {
    // Use template value if available, otherwise fall back to base value
    const templateValue = templateValueMap.get(c.id);
    if (templateValue !== undefined) {
      defaultCurrencyValues.set(c.id, templateValue);
    } else if (c.base_value_cents) {
      defaultCurrencyValues.set(c.id, parseFloat(String(c.base_value_cents)));
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

  // Build debit pay values map
  const debitPayValues = new Map<string, number>();
  debitPayResult.data?.forEach((d) => {
    debitPayValues.set(d.card_id, Number(d.debit_pay_percent) ?? 0);
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

  // Build multiplier programs data
  const userTierMap = new Map<string, string>();
  userMultiplierTiersResult.data?.forEach((t) => {
    if (t.program_id && t.tier_id) {
      userTierMap.set(t.program_id, t.tier_id);
    }
  });

  const multiplierPrograms: MultiplierProgram[] = [];
  multiplierProgramsResult.data?.forEach((program) => {
    const selectedTierId = userTierMap.get(program.id);
    if (!selectedTierId) return; // User hasn't selected a tier for this program
    
    const selectedTier = (program.earning_multiplier_tiers as unknown as Array<{ id: string; name: string; multiplier: number }>)
      ?.find((t) => t.id === selectedTierId);
    if (!selectedTier) return;
    
    const applicableCurrencyIds = ((program.earning_multiplier_currencies as unknown as Array<{ currency_id: string }>) ?? [])
      .map((c) => c.currency_id);
    const applicableCardIds = ((program.earning_multiplier_cards as unknown as Array<{ card_id: string }>) ?? [])
      .map((c) => c.card_id);
    
    multiplierPrograms.push({
      programId: program.id,
      multiplier: Number(selectedTier.multiplier),
      applicableCurrencyIds,
      applicableCardIds,
    });
  });

  // Build mobile pay categories set
  const mobilePayCategories = new Set<number>();
  mobilePayCategoriesResult.data?.forEach((m) => {
    mobilePayCategories.add(m.category_id);
  });
  const mobilePayCategoryId = mobilePayCategoryResult.data?.id;
  
  // Build PayPal categories set
  const paypalCategories = new Set<number>();
  paypalCategoriesResult.data?.forEach((p) => {
    paypalCategories.add(p.category_id);
  });
  const paypalCategoryId = paypalCategoryResult.data?.id;
  
  const largePurchaseCategoryId = largePurchaseCategoryResult.data?.id;

  // Process welcome bonuses
  const welcomeBonuses: WelcomeBonusInput[] = (welcomeBonusesResult.data ?? []).map((wb) => ({
    id: wb.id,
    card_id: wb.card_id,
    spend_requirement_cents: wb.spend_requirement_cents,
    time_period_months: wb.time_period_months,
    component_type: wb.component_type as "points" | "cash" | "benefit",
    points_amount: wb.points_amount,
    currency_id: wb.currency_id,
    cash_amount_cents: wb.cash_amount_cents,
    benefit_description: wb.benefit_description,
    default_benefit_value_cents: wb.default_benefit_value_cents,
  }));

  // Build welcome bonus settings map
  const welcomeBonusSettings = new Map<string, WelcomeBonusSettings>();
  userWelcomeBonusSettingsResult.data?.forEach((s) => {
    welcomeBonusSettings.set(s.card_id, {
      card_id: s.card_id,
      is_active: s.is_active,
      spend_requirement_override: s.spend_requirement_override,
      time_period_override: s.time_period_override,
    });
  });

  // Build welcome bonus value overrides map
  const welcomeBonusValueOverrides = new Map<string, number>();
  userWelcomeBonusValueOverridesResult.data?.forEach((o) => {
    welcomeBonusValueOverrides.set(o.welcome_bonus_id, o.value_cents);
  });

  // Process spend bonuses
  const spendBonuses: SpendBonusInput[] = (spendBonusesResult.data ?? []).map((sb) => ({
    id: sb.id,
    card_id: sb.card_id,
    name: sb.name,
    bonus_type: sb.bonus_type as "threshold" | "elite_earning",
    spend_threshold_cents: sb.spend_threshold_cents,
    reward_type: sb.reward_type as "points" | "cash" | "benefit" | null,
    points_amount: sb.points_amount,
    currency_id: sb.currency_id,
    cash_amount_cents: sb.cash_amount_cents,
    benefit_description: sb.benefit_description,
    default_value_cents: sb.default_value_cents,
    period: sb.period as "year" | "calendar_year" | "lifetime" | null,
    per_spend_cents: sb.per_spend_cents,
    elite_unit_name: sb.elite_unit_name,
    default_unit_value_cents: sb.default_unit_value_cents,
    cap_amount: sb.cap_amount,
    cap_period: sb.cap_period as "year" | "calendar_year" | null,
  }));

  // Build spend bonus values map
  const spendBonusValues = new Map<string, number>();
  userSpendBonusValuesResult.data?.forEach((v) => {
    spendBonusValues.set(v.spend_bonus_id, v.value_cents);
  });

  // Bonus display settings
  const includeBonusesInCalculation = 
    (userBonusDisplaySettingsResult.data?.include_welcome_bonuses ?? false) ||
    (userBonusDisplaySettingsResult.data?.include_spend_bonuses ?? false);

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
    debitPayValues,
    multiplierPrograms,
    mobilePayCategories,
    mobilePayCategoryId,
    paypalCategories,
    paypalCategoryId,
    largePurchaseCategoryId,
    userSelections,
    travelPreferences,
    enabledSecondaryCards,
    earningsGoal,
    // Bonus inputs
    welcomeBonuses,
    welcomeBonusSettings,
    welcomeBonusValueOverrides,
    spendBonuses,
    spendBonusValues,
    includeBonusesInCalculation,
    // Multi-instance support: count how many of each card for fee calculation
    cardInstanceCounts,
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

  // Calculate recommendations
  type AllCardData = {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    default_perks_value: number | null;
    exclude_from_recommendations: boolean;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    issuer_id: string;
    primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
  };
  const allCards = (allCardsResult.data ?? []) as unknown as AllCardData[];
  
  const recommendations: CardRecommendation[] = returns.totalSpend > 0 ? calculateCardRecommendations(
    {
      ...calculatorInput,
      allCards: allCards.map(c => ({
        ...c,
        issuer_id: c.issuer_id,
        primary_currency: c.primary_currency,
        secondary_currency: c.secondary_currency,
      })),
      allEarningRules,
      allCategoryBonuses,
    },
    returns,
    3
  ) : [];

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Total Earnings</h1>
          <p className="text-zinc-400 mt-1">
            Optimal allocation of your spending across {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <ReturnsDisplay returns={returns} earningsGoal={earningsGoal} recommendations={recommendations} />
        
        {/* Bonus Settings Note */}
        {includeBonusesInCalculation && (
          <div className="mt-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700/50">
            <p className="text-sm text-blue-300">
              <span className="font-medium">Bonus calculations included.</span>{" "}
              Manage your welcome bonus and spend bonus settings in{" "}
              <a href="/wallet" className="underline hover:text-blue-200">My Wallet</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

