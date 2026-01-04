import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { WalletCardList } from "./wallet-card-list";
import { AddCardModal } from "./add-card-modal";
import { UserHeader } from "@/components/user-header";
import { ReturnsSummary } from "./returns-summary";
import { isAdminEmail } from "@/lib/admin";
import {
  calculatePortfolioReturns,
  calculateCardRecommendations,
  CardInput,
  CategorySpending,
  EarningRuleInput,
  CategoryBonusInput,
  TravelPreference,
  MultiplierProgram,
  WelcomeBonusInput,
  SpendBonusInput,
} from "@/lib/returns-calculator";
import { CardRecommendations } from "./card-recommendations";
import { UserBonusSection, UserWelcomeBonus, UserSpendBonus } from "./user-bonus-section";
import { WalletClient } from "./wallet-client";

export default async function WalletPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Fetch wallet cards and returns data in parallel
  const [
    walletResult,
    allCardsResult,
    spendingResult,
    rulesResult,
    bonusesResult,
    currenciesResult,
    userCurrencyValuesResult,
    perksResult,
    selectionsResult,
    travelPrefsResult,
    categoriesResult,
    featureFlagsResult,
    debitPayResult,
    multiplierTiersResult,
    mobilePayCategoriesResult,
    mobilePayCategoryResult,
    paypalCategoriesResult,
    paypalCategoryResult,
    largePurchaseCategoryResult,
    userPointValueSettingsResult,
    pointValueTemplatesResult,
    userWelcomeBonusesResult,
    userSpendBonusesResult,
    userBonusDisplaySettingsResult,
    allCurrenciesResult,
  ] = await Promise.all([
    // User's wallet cards with full details
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        added_at,
        approval_date,
        cards:card_id (
          id,
          name,
          slug,
          annual_fee,
          default_earn_rate,
          primary_currency_id,
          secondary_currency_id,
          issuer_id,
          issuers:issuer_id (name),
          primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
          secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
        )
      `)
      .eq("user_id", user.id),
    
    // All available cards for adding (includes default_perks_value for recommendations)
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
        issuers:issuer_id (id, name),
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
      `)
      .eq("is_active", true)
      .order("name"),
    
    // User's spending per category (including >$5k portions)
    supabase
      .from("user_effective_spending")
      .select("category_id, category_name, category_slug, annual_spend_cents, large_purchase_spend_cents")
      .eq("user_id", user.id),
    
    // All earning rules
    supabase
      .from("card_earning_rules")
      .select("id, card_id, category_id, rate, has_cap, cap_amount, cap_period, cap_unit, post_cap_rate, booking_method, brand_name"),
    
    // All category bonuses
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
    
    // All currencies for default values
    supabase
      .from("reward_currencies")
      .select("id, base_value_cents"),
    
    // User's custom currency values
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", user.id),
    
    // User's perks values (now keyed by wallet_card_id, not card_id)
    supabase
      .from("user_card_perks_values")
      .select("wallet_card_id, perks_value")
      .eq("user_id", user.id),
    
    // User's category selections
    supabase
      .from("user_card_selections")
      .select("cap_id, selected_category_id")
      .eq("user_id", user.id),
    
    // User's travel preferences
    supabase
      .from("user_travel_booking_preferences")
      .select("category_slug, preference_type, brand_name, portal_issuer_id")
      .eq("user_id", user.id),
    
    // All categories for parent lookups
    supabase
      .from("earning_categories")
      .select("id, name, slug, parent_category_id, excluded_by_default"),
    
    // User's feature flags (for debit pay, onboarding, and credit tracking)
    supabase
      .from("user_feature_flags")
      .select("debit_pay_enabled, onboarding_completed, credit_tracking_enabled")
      .eq("user_id", user.id)
      .single(),
    
    // User's debit pay values (now keyed by wallet_card_id)
    supabase
      .from("user_card_debit_pay")
      .select("wallet_card_id, debit_pay_percent")
      .eq("user_id", user.id),
      
    // Multiplier programs for recommendations
    supabase
      .from("user_multiplier_tiers")
      .select(`
        program_id,
        tier_id,
        earning_multiplier_tiers:tier_id (multiplier),
        earning_multiplier_programs:program_id (
          earning_multiplier_currencies (currency_id),
          earning_multiplier_cards (card_id)
        )
      `)
      .eq("user_id", user.id),
    
    // Mobile pay categories (for bonus calculation)
    supabase
      .from("user_mobile_pay_categories")
      .select("category_id")
      .eq("user_id", user.id),
    
    // Mobile Pay category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "mobile-pay")
      .single(),
    
    // PayPal categories (for bonus calculation)
    supabase
      .from("user_paypal_categories")
      .select("category_id")
      .eq("user_id", user.id),
    
    // PayPal category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "paypal")
      .single(),
    
    // Large purchase (>$5k) category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "over-5k")
      .single(),
    
    // User's point value settings
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", user.id)
      .single(),
    
    // Point value templates with their currency values
    supabase
      .from("point_value_templates")
      .select(`
        id,
        is_default,
        template_currency_values (currency_id, value_cents)
      `),
    
    // User's welcome bonuses (with currency name for display)
    supabase
      .from("user_welcome_bonuses")
      .select("id, wallet_card_id, is_active, component_type, spend_requirement_cents, time_period_months, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, reward_currencies:currency_id(name)")
      .eq("user_id", user.id),
    
    // User's spend bonuses (with currency name for display)
    supabase
      .from("user_spend_bonuses")
      .select("id, wallet_card_id, is_active, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, period, per_spend_cents, elite_unit_name, unit_value_cents, cap_amount, cap_period, reward_currencies:currency_id(name)")
      .eq("user_id", user.id),
    
    // User's bonus display settings
    supabase
      .from("user_bonus_display_settings")
      .select("include_welcome_bonuses, include_spend_bonuses")
      .eq("user_id", user.id)
      .single(),
    
    // All currencies for bonus creation modal
    supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type")
      .order("name"),
  ]);

  // Type assertion for wallet cards since Supabase types don't infer relations correctly
  type WalletCardData = {
    id: string;
    card_id: string;
    custom_name: string | null;
    added_at: string | null;
    approval_date: string | null;
    cards: {
      id: string;
      name: string;
      slug: string;
      annual_fee: number;
      default_earn_rate: number;
      primary_currency_id: string;
      secondary_currency_id: string | null;
      issuer_id: string;
      issuers: { name: string } | null;
      primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
      secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    } | null;
  };
  const walletCards = (walletResult.data ?? []) as unknown as WalletCardData[];
  const userCardIds = walletCards.map((wc) => wc.card_id);
  
  // Build set of currency IDs the user "owns" (from cards in wallet)
  const userPrimaryCurrencyIds = new Set(
    walletCards
      .map((wc) => wc.cards?.primary_currency_id)
      .filter((id): id is string => !!id)
  );

  // Cards with secondary currency enabled if user has a card with that as primary
  const enabledSecondaryCards = new Set<string>();
  walletCards.forEach((wc) => {
    if (wc.cards?.secondary_currency_id && 
        userPrimaryCurrencyIds.has(wc.cards.secondary_currency_id)) {
      enabledSecondaryCards.add(wc.cards.id);
    }
  });

  // Build perks map (keyed by wallet_card_id now)
  const perksMap = new Map<string, number>();
  perksResult.data?.forEach((pv) => {
    perksMap.set(pv.wallet_card_id, pv.perks_value);
  });

  // Check if debit pay is enabled
  const debitPayEnabled = featureFlagsResult.data?.debit_pay_enabled ?? false;
  
  // Check if onboarding has been completed
  const onboardingCompleted = featureFlagsResult.data?.onboarding_completed ?? false;
  
  // Credit tracking is enabled for all users
  const creditTrackingEnabled = true;
  
  // Build debit pay map (keyed by wallet_card_id now)
  const debitPayMap = new Map<string, number>();
  debitPayResult.data?.forEach((dp) => {
    debitPayMap.set(dp.wallet_card_id, Number(dp.debit_pay_percent) ?? 0);
  });

  // Type for all cards
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
    issuers: { id: string; name: string } | null;
    primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
  };
  const allCards = (allCardsResult.data ?? []) as unknown as AllCardData[];
  
  // All cards are available to add (users can add duplicates)
  const availableCardsForModal = allCards.filter((card) => card.id);

  // Calculate portfolio returns
  const userCardIdsSet = new Set(userCardIds);
  
  // Process cards for returns calculator
  // De-duplicate cards (users may have multiple instances of the same card)
  // but track instance counts for fee calculation
  const cardInstanceCounts = new Map<string, number>();
  walletCards.forEach(w => {
    if (w.cards) {
      cardInstanceCounts.set(w.cards.id, (cardInstanceCounts.get(w.cards.id) ?? 0) + 1);
    }
  });
  
  // De-duplicated cards for spend allocation (same card earns the same)
  const cards: CardInput[] = Array.from(
    new Map(
      walletCards
        .filter(w => w.cards)
        .map(w => [w.cards!.id, w.cards as unknown as CardInput])
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
  const earningRules = allEarningRules.filter((r) => userCardIdsSet.has(r.card_id));

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
  const categoryBonuses = allCategoryBonuses.filter((b) => userCardIdsSet.has(b.card_id));

  // Build category maps
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  categoriesResult.data?.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
  });

  // Process spending with >$5k tracking
  const spending: CategorySpending[] = (spendingResult.data ?? []).map((s) => ({
    category_id: s.category_id!,
    category_name: s.category_name!,
    category_slug: s.category_slug!,
    annual_spend_cents: s.annual_spend_cents!,
    large_purchase_spend_cents: s.large_purchase_spend_cents ?? 0,
    excluded_by_default: categoryExclusionMap.get(s.category_id!) ?? false,
    parent_category_id: categoryParentMap.get(s.category_id!) ?? null,
  }));

  // Get user's selected template (or default template)
  type TemplateData = {
    id: string;
    is_default: boolean;
    template_currency_values: { currency_id: string; value_cents: number }[];
  };
  const templates = (pointValueTemplatesResult.data ?? []) as unknown as TemplateData[];
  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
  const selectedTemplateId = userPointValueSettingsResult.data?.selected_template_id ?? defaultTemplate?.id ?? null;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  
  // Build template value map
  const templateValueMap = new Map<string, number>();
  if (selectedTemplate?.template_currency_values) {
    for (const tv of selectedTemplate.template_currency_values) {
      templateValueMap.set(tv.currency_id, parseFloat(String(tv.value_cents)));
    }
  }

  // Build currency value maps
  // Default values come from: template value > base currency value
  const defaultCurrencyValues = new Map<string, number>();
  currenciesResult.data?.forEach((c) => {
    const templateValue = templateValueMap.get(c.id);
    if (templateValue !== undefined) {
      defaultCurrencyValues.set(c.id, templateValue);
    } else if (c.base_value_cents) {
      defaultCurrencyValues.set(c.id, parseFloat(String(c.base_value_cents)));
    }
  });

  const userCurrencyValues = new Map<string, number>();
  userCurrencyValuesResult.data?.forEach((v) => {
    userCurrencyValues.set(v.currency_id, v.value_cents);
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

  // Build multiplier programs for calculations
  type MultiplierTierData = {
    program_id: string;
    tier_id: string | null;
    earning_multiplier_tiers: { multiplier: number } | null;
    earning_multiplier_programs: {
      earning_multiplier_currencies: { currency_id: string }[] | null;
      earning_multiplier_cards: { card_id: string }[] | null;
    } | null;
  };
  const multiplierPrograms: MultiplierProgram[] = [];
  (multiplierTiersResult.data ?? []).forEach((t: unknown) => {
    const tier = t as MultiplierTierData;
    if (tier.tier_id && tier.earning_multiplier_tiers?.multiplier) {
      multiplierPrograms.push({
        programId: tier.program_id,
        multiplier: tier.earning_multiplier_tiers.multiplier,
        applicableCurrencyIds: tier.earning_multiplier_programs?.earning_multiplier_currencies?.map((c: { currency_id: string }) => c.currency_id) ?? [],
        applicableCardIds: tier.earning_multiplier_programs?.earning_multiplier_cards?.map((c: { card_id: string }) => c.card_id) ?? [],
      });
    }
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
  
  // Large purchase category ID
  const largePurchaseCategoryId = largePurchaseCategoryResult.data?.id;

  // Build wallet card id to card_id mapping (for bonus -> card type lookup)
  const walletCardIdToCardId = new Map<string, string>();
  walletCards.forEach((wc) => {
    walletCardIdToCardId.set(wc.id, wc.card_id);
  });

  // Process user welcome bonuses (with currency name from join)
  type UserWelcomeBonusRow = {
    id: string;
    wallet_card_id: string;
    is_active: boolean;
    component_type: string;
    spend_requirement_cents: number;
    time_period_months: number;
    points_amount: number | null;
    currency_id: string | null;
    cash_amount_cents: number | null;
    benefit_description: string | null;
    value_cents: number | null;
    reward_currencies: { name: string } | null;
  };
  const userWelcomeBonuses: UserWelcomeBonus[] = ((userWelcomeBonusesResult.data ?? []) as unknown as UserWelcomeBonusRow[]).map((wb) => ({
    id: wb.id,
    wallet_card_id: wb.wallet_card_id,
    is_active: wb.is_active,
    component_type: wb.component_type as "points" | "cash" | "benefit",
    spend_requirement_cents: wb.spend_requirement_cents,
    time_period_months: wb.time_period_months,
    points_amount: wb.points_amount,
    currency_id: wb.currency_id,
    cash_amount_cents: wb.cash_amount_cents,
    benefit_description: wb.benefit_description,
    value_cents: wb.value_cents,
    currency_name: wb.reward_currencies?.name ?? null,
  }));

  // Process user spend bonuses (with currency name from join)
  type UserSpendBonusRow = {
    id: string;
    wallet_card_id: string;
    is_active: boolean;
    name: string;
    bonus_type: string;
    spend_threshold_cents: number | null;
    reward_type: string | null;
    points_amount: number | null;
    currency_id: string | null;
    cash_amount_cents: number | null;
    benefit_description: string | null;
    value_cents: number | null;
    period: string | null;
    per_spend_cents: number | null;
    elite_unit_name: string | null;
    unit_value_cents: number | null;
    cap_amount: number | null;
    cap_period: string | null;
    reward_currencies: { name: string } | null;
  };
  const userSpendBonuses: UserSpendBonus[] = ((userSpendBonusesResult.data ?? []) as unknown as UserSpendBonusRow[]).map((sb) => ({
    id: sb.id,
    wallet_card_id: sb.wallet_card_id,
    is_active: sb.is_active,
    name: sb.name,
    bonus_type: sb.bonus_type as "threshold" | "elite_earning",
    spend_threshold_cents: sb.spend_threshold_cents,
    reward_type: sb.reward_type as "points" | "cash" | "benefit" | null,
    points_amount: sb.points_amount,
    currency_id: sb.currency_id,
    cash_amount_cents: sb.cash_amount_cents,
    benefit_description: sb.benefit_description,
    value_cents: sb.value_cents,
    period: sb.period as "year" | "calendar_year" | "lifetime" | null,
    per_spend_cents: sb.per_spend_cents,
    elite_unit_name: sb.elite_unit_name,
    unit_value_cents: sb.unit_value_cents,
    cap_amount: sb.cap_amount,
    cap_period: sb.cap_period as "year" | "calendar_year" | null,
    currency_name: sb.reward_currencies?.name ?? null,
  }));

  // Convert user bonuses to calculator input format (with card_id for aggregation)
  const welcomeBonuses: WelcomeBonusInput[] = userWelcomeBonuses.map((wb) => ({
    id: wb.id,
    wallet_card_id: wb.wallet_card_id,
    card_id: walletCardIdToCardId.get(wb.wallet_card_id) ?? "",
    is_active: wb.is_active,
    spend_requirement_cents: wb.spend_requirement_cents,
    time_period_months: wb.time_period_months,
    component_type: wb.component_type,
    points_amount: wb.points_amount,
    currency_id: wb.currency_id,
    cash_amount_cents: wb.cash_amount_cents,
    benefit_description: wb.benefit_description,
    value_cents: wb.value_cents,
  }));

  const spendBonuses: SpendBonusInput[] = userSpendBonuses.map((sb) => ({
    id: sb.id,
    wallet_card_id: sb.wallet_card_id,
    card_id: walletCardIdToCardId.get(sb.wallet_card_id) ?? "",
    is_active: sb.is_active,
    name: sb.name,
    bonus_type: sb.bonus_type,
    spend_threshold_cents: sb.spend_threshold_cents,
    reward_type: sb.reward_type,
    points_amount: sb.points_amount,
    currency_id: sb.currency_id,
    cash_amount_cents: sb.cash_amount_cents,
    benefit_description: sb.benefit_description,
    value_cents: sb.value_cents,
    period: sb.period,
    per_spend_cents: sb.per_spend_cents,
    elite_unit_name: sb.elite_unit_name,
    unit_value_cents: sb.unit_value_cents,
    cap_amount: sb.cap_amount,
    cap_period: sb.cap_period,
  }));

  // Bonus display settings
  const includeBonusesInCalculation = 
    (userBonusDisplaySettingsResult.data?.include_welcome_bonuses ?? false) ||
    (userBonusDisplaySettingsResult.data?.include_spend_bonuses ?? false);
  
  const bonusDisplaySettings = {
    includeWelcomeBonuses: userBonusDisplaySettingsResult.data?.include_welcome_bonuses ?? false,
    includeSpendBonuses: userBonusDisplaySettingsResult.data?.include_spend_bonuses ?? false,
  };

  // Calculate returns (only if user has cards)
  const calculatorInput = {
    cards,
    spending,
    earningRules,
    categoryBonuses,
    userCurrencyValues,
    defaultCurrencyValues,
    cashOutValues: new Map<string, number>(), // Not used on wallet summary
    perksValues: perksMap,
    debitPayValues: debitPayMap,
    multiplierPrograms,
    mobilePayCategories,
    mobilePayCategoryId,
    paypalCategories,
    paypalCategoryId,
    largePurchaseCategoryId,
    userSelections,
    travelPreferences,
    enabledSecondaryCards,
    earningsGoal: "maximize" as const, // Default to maximize for wallet summary
    // User-defined bonus inputs (is_active and valuations are built into each bonus)
    welcomeBonuses,
    spendBonuses,
    includeBonusesInCalculation,
    // Multi-instance support: count how many of each card for fee calculation
    cardInstanceCounts,
  };
  
  const returns = cards.length > 0 ? calculatePortfolioReturns(calculatorInput) : null;

  // Calculate card recommendations (only if user has spending data)
  const recommendations = returns && returns.totalSpend > 0 ? calculateCardRecommendations(
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
    3 // Top 3 recommendations
  ) : [];

  async function addToWallet(cardId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    
    // Get the card's name and default perks value
    const { data: card } = await supabase
      .from("cards")
      .select("name, default_perks_value")
      .eq("id", cardId)
      .single();
    
    // Count how many instances of this card already exist in wallet
    const { count: existingCount } = await supabase
      .from("user_wallets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("card_id", cardId);
    
    // If this is a duplicate, set a custom name like "Card Name 2"
    const customName = (existingCount && existingCount > 0 && card?.name) 
      ? `${card.name} ${existingCount + 1}` 
      : null;
    
    // Add card to wallet and get the new wallet entry ID
    const { data: newWalletEntry } = await supabase.from("user_wallets").insert({
      user_id: user.id,
      card_id: cardId,
      custom_name: customName,
    }).select("id").single();
    
    // If card has a default perks value, set it for this wallet instance
    if (newWalletEntry && card?.default_perks_value && card.default_perks_value > 0) {
      await supabase.from("user_card_perks_values").upsert(
        {
          user_id: user.id,
          wallet_card_id: newWalletEntry.id,
          perks_value: card.default_perks_value,
        },
        { onConflict: "user_id,wallet_card_id" }
      );
    }
    
    revalidatePath("/wallet");
  }

  async function removeFromWallet(walletId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function updateCustomName(walletId: string, customName: string | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_wallets")
      .update({ custom_name: customName })
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function updateApprovalDate(walletId: string, date: string | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_wallets")
      .update({ approval_date: date })
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
    revalidatePath("/credits");
  }

  async function updatePerksValue(walletCardId: string, perksValue: number) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_card_perks_values").upsert(
      {
        user_id: user.id,
        wallet_card_id: walletCardId,
        perks_value: perksValue,
      },
      { onConflict: "user_id,wallet_card_id" }
    );
    revalidatePath("/wallet");
  }

  async function enableDebitPay() {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_feature_flags").upsert(
      {
        user_id: user.id,
        debit_pay_enabled: true,
      },
      { onConflict: "user_id" }
    );
    revalidatePath("/wallet");
  }

  async function updateDebitPay(walletCardId: string, percent: number) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_card_debit_pay").upsert(
      {
        user_id: user.id,
        wallet_card_id: walletCardId,
        debit_pay_percent: percent,
      },
      { onConflict: "user_id,wallet_card_id" }
    );
    revalidatePath("/wallet");
  }

  async function updateBonusDisplaySettings(includeWelcomeBonuses: boolean, includeSpendBonuses: boolean) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_bonus_display_settings").upsert(
      {
        user_id: user.id,
        include_welcome_bonuses: includeWelcomeBonuses,
        include_spend_bonuses: includeSpendBonuses,
      },
      { onConflict: "user_id" }
    );
    revalidatePath("/wallet");
  }

  // User-defined Welcome Bonus CRUD
  async function addUserWelcomeBonus(formData: FormData) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    const componentType = formData.get("component_type") as string;
    
    await supabase.from("user_welcome_bonuses").insert({
      user_id: user.id,
      wallet_card_id: formData.get("wallet_card_id") as string,
      component_type: componentType,
      spend_requirement_cents: parseInt(formData.get("spend_requirement_cents") as string) || 0,
      time_period_months: parseInt(formData.get("time_period_months") as string) || 3,
      points_amount: componentType === "points" ? parseInt(formData.get("points_amount") as string) || null : null,
      currency_id: componentType === "points" ? formData.get("currency_id") as string || null : null,
      cash_amount_cents: componentType === "cash" ? parseInt(formData.get("cash_amount_cents") as string) || null : null,
      benefit_description: componentType === "benefit" ? formData.get("benefit_description") as string || null : null,
      value_cents: componentType === "benefit" ? parseInt(formData.get("value_cents") as string) || null : null,
    });
    revalidatePath("/wallet");
  }

  async function updateUserWelcomeBonus(bonusId: string, formData: FormData) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    const componentType = formData.get("component_type") as string;
    
    await supabase.from("user_welcome_bonuses").update({
      component_type: componentType,
      spend_requirement_cents: parseInt(formData.get("spend_requirement_cents") as string) || 0,
      time_period_months: parseInt(formData.get("time_period_months") as string) || 3,
      points_amount: componentType === "points" ? parseInt(formData.get("points_amount") as string) || null : null,
      currency_id: componentType === "points" ? formData.get("currency_id") as string || null : null,
      cash_amount_cents: componentType === "cash" ? parseInt(formData.get("cash_amount_cents") as string) || null : null,
      benefit_description: componentType === "benefit" ? formData.get("benefit_description") as string || null : null,
      value_cents: componentType === "benefit" ? parseInt(formData.get("value_cents") as string) || null : null,
    }).eq("id", bonusId).eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function deleteUserWelcomeBonus(bonusId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_welcome_bonuses").delete().eq("id", bonusId).eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function toggleUserWelcomeBonusActive(bonusId: string, isActive: boolean) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_welcome_bonuses").update({ is_active: isActive }).eq("id", bonusId).eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  // User-defined Spend Bonus CRUD
  async function addUserSpendBonus(formData: FormData) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    const bonusType = formData.get("bonus_type") as string;
    const rewardType = formData.get("reward_type") as string;
    
    if (bonusType === "threshold") {
      await supabase.from("user_spend_bonuses").insert({
        user_id: user.id,
        wallet_card_id: formData.get("wallet_card_id") as string,
        name: formData.get("name") as string,
        bonus_type: bonusType,
        spend_threshold_cents: parseInt(formData.get("spend_threshold_cents") as string) || null,
        reward_type: rewardType,
        period: formData.get("period") as string,
        points_amount: rewardType === "points" ? parseInt(formData.get("points_amount") as string) || null : null,
        currency_id: rewardType === "points" ? formData.get("currency_id") as string || null : null,
        cash_amount_cents: rewardType === "cash" ? parseInt(formData.get("cash_amount_cents") as string) || null : null,
        benefit_description: rewardType === "benefit" ? formData.get("benefit_description") as string || null : null,
        value_cents: rewardType === "benefit" ? parseInt(formData.get("value_cents") as string) || null : null,
      });
    } else {
      const capAmount = formData.get("cap_amount") as string;
      await supabase.from("user_spend_bonuses").insert({
        user_id: user.id,
        wallet_card_id: formData.get("wallet_card_id") as string,
        name: formData.get("name") as string,
        bonus_type: bonusType,
        per_spend_cents: parseInt(formData.get("per_spend_cents") as string) || null,
        elite_unit_name: formData.get("elite_unit_name") as string || null,
        unit_value_cents: parseFloat(formData.get("unit_value_cents") as string) || null,
        cap_amount: capAmount ? parseInt(capAmount) || null : null,
        cap_period: capAmount ? formData.get("cap_period") as string || "year" : null,
      });
    }
    revalidatePath("/wallet");
  }

  async function updateUserSpendBonus(bonusId: string, formData: FormData) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    const bonusType = formData.get("bonus_type") as string;
    const rewardType = formData.get("reward_type") as string;
    
    if (bonusType === "threshold") {
      await supabase.from("user_spend_bonuses").update({
        name: formData.get("name") as string,
        spend_threshold_cents: parseInt(formData.get("spend_threshold_cents") as string) || null,
        reward_type: rewardType,
        period: formData.get("period") as string,
        points_amount: rewardType === "points" ? parseInt(formData.get("points_amount") as string) || null : null,
        currency_id: rewardType === "points" ? formData.get("currency_id") as string || null : null,
        cash_amount_cents: rewardType === "cash" ? parseInt(formData.get("cash_amount_cents") as string) || null : null,
        benefit_description: rewardType === "benefit" ? formData.get("benefit_description") as string || null : null,
        value_cents: rewardType === "benefit" ? parseInt(formData.get("value_cents") as string) || null : null,
        // Clear elite earning fields
        per_spend_cents: null,
        elite_unit_name: null,
        unit_value_cents: null,
        cap_amount: null,
        cap_period: null,
      }).eq("id", bonusId).eq("user_id", user.id);
    } else {
      const capAmount = formData.get("cap_amount") as string;
      await supabase.from("user_spend_bonuses").update({
        name: formData.get("name") as string,
        per_spend_cents: parseInt(formData.get("per_spend_cents") as string) || null,
        elite_unit_name: formData.get("elite_unit_name") as string || null,
        unit_value_cents: parseFloat(formData.get("unit_value_cents") as string) || null,
        cap_amount: capAmount ? parseInt(capAmount) || null : null,
        cap_period: capAmount ? formData.get("cap_period") as string || "year" : null,
        // Clear threshold fields
        spend_threshold_cents: null,
        reward_type: null,
        points_amount: null,
        currency_id: null,
        cash_amount_cents: null,
        benefit_description: null,
        value_cents: null,
        period: null,
      }).eq("id", bonusId).eq("user_id", user.id);
    }
    revalidatePath("/wallet");
  }

  async function deleteUserSpendBonus(bonusId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_spend_bonuses").delete().eq("id", bonusId).eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function toggleUserSpendBonusActive(bonusId: string, isActive: boolean) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_spend_bonuses").update({ is_active: isActive }).eq("id", bonusId).eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function completeOnboarding() {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_feature_flags").upsert(
      {
        user_id: user.id,
        onboarding_completed: true,
      },
      { onConflict: "user_id" }
    );
    revalidatePath("/wallet");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <WalletClient
      showOnboarding={!onboardingCompleted}
      onCompleteOnboarding={completeOnboarding}
    >
      <div className="min-h-screen bg-zinc-950">
        <UserHeader isAdmin={isAdmin} creditTrackingEnabled={creditTrackingEnabled} />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">My Wallet</h1>
              <p className="text-zinc-400 mt-1">
                {walletCards.length} card{walletCards.length !== 1 ? "s" : ""} in your wallet
              </p>
            </div>
            <AddCardModal
              availableCards={availableCardsForModal.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                annual_fee: c.annual_fee,
                issuer_name: c.issuers?.name,
                primary_currency_name: c.primary_currency?.name,
              }))}
              onAddCard={addToWallet}
              debitPayEnabled={debitPayEnabled}
              onEnableDebitPay={enableDebitPay}
              ownedCardIds={userCardIds}
            />
          </div>

          {/* Returns Summary */}
          {returns && returns.totalSpend > 0 && (
            <ReturnsSummary returns={returns} />
          )}

          {/* Card Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-8">
              <CardRecommendations 
                recommendations={recommendations}
                onAddCard={addToWallet}
              />
            </div>
          )}

          {walletCards.length > 0 ? (
            <WalletCardList
              walletCards={walletCards}
              enabledSecondaryCards={enabledSecondaryCards}
              perksMap={perksMap}
              debitPayMap={debitPayMap}
              debitPayEnabled={debitPayEnabled}
              onRemove={removeFromWallet}
              onUpdatePerks={updatePerksValue}
              onUpdateDebitPay={updateDebitPay}
              onUpdateCustomName={updateCustomName}
              onUpdateApprovalDate={updateApprovalDate}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
              <p className="text-zinc-400 mb-4">Your wallet is empty.</p>
              <p className="text-zinc-500 text-sm">
                Add cards to track your rewards and see which currencies are active.
              </p>
            </div>
          )}

          {/* User Bonus Section */}
          {walletCards.length > 0 && (
            <UserBonusSection
              walletCards={walletCards.map(wc => ({
                wallet_id: wc.id,
                card_id: wc.card_id,
                display_name: wc.custom_name ?? wc.cards?.name ?? "",
                card_name: wc.cards?.name ?? "",
                currency_name: wc.cards?.primary_currency?.name ?? null,
                currency_id: wc.cards?.primary_currency_id ?? null,
              }))}
              currencies={allCurrenciesResult.data ?? []}
              welcomeBonuses={userWelcomeBonuses}
              spendBonuses={userSpendBonuses}
              bonusDisplaySettings={bonusDisplaySettings}
              onUpdateDisplaySettings={updateBonusDisplaySettings}
              onAddWelcomeBonus={addUserWelcomeBonus}
              onUpdateWelcomeBonus={updateUserWelcomeBonus}
              onDeleteWelcomeBonus={deleteUserWelcomeBonus}
              onToggleWelcomeBonusActive={toggleUserWelcomeBonusActive}
              onAddSpendBonus={addUserSpendBonus}
              onUpdateSpendBonus={updateUserSpendBonus}
              onDeleteSpendBonus={deleteUserSpendBonus}
              onToggleSpendBonusActive={toggleUserSpendBonusActive}
            />
          )}
        </div>
      </div>
    </WalletClient>
  );
}
