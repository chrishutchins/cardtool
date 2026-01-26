import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { ReturnsDisplay } from "./returns-display";
import { BonusCalculationToggles } from "./bonus-calculation-toggles";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import {
  getCachedEarningRules,
  getCachedCardCaps,
  getCachedCurrencies,
  getCachedCategories,
  getCachedMultiplierPrograms,
  getCachedPointValueTemplates,
  getCachedCards,
  getCachedSpecialCategoryIds,
} from "@/lib/cached-data";
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
  SpendBonusInput,
  BiltSettingsInput,
} from "@/lib/returns-calculator";

export const metadata: Metadata = {
  title: "Spend Optimizer | CardTool",
  description: "See your projected annual credit card rewards and optimize your spending",
};

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

  // Get effective user ID for data reads (may be emulated user if admin is emulating)
  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();
  
  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  // Fetch all required data in parallel
  // Split into cached reference data and user-specific data
  const [
    // Cached reference data (shared across all users, rarely changes)
    rulesData,
    bonusesData,
    currenciesData,
    categoriesData,
    multiplierProgramsData,
    templatesData,
    allCardsData,
    specialCategoryIds,
    // User-specific data (must be fresh)
    walletResult,
    spendingResult,
    userCurrencyValuesResult,
    perksResult,
    debitPayResult,
    selectionsResult,
    travelPrefsResult,
    userMultiplierTiersResult,
    mobilePayCategoriesResult,
    paypalCategoriesResult,
    userPointValueSettingsResult,
    userWelcomeBonusesResult,
    userSpendBonusesResult,
    userBonusDisplaySettingsResult,
    userFeatureFlagsResult,
    userBiltSettingsResult,
  ] = await Promise.all([
    // Cached data (hits cache, not DB on subsequent requests)
    getCachedEarningRules(),
    getCachedCardCaps(),
    getCachedCurrencies(),
    getCachedCategories(),
    getCachedMultiplierPrograms(),
    getCachedPointValueTemplates(),
    getCachedCards(),
    getCachedSpecialCategoryIds(),
    // User-specific queries (always fresh)
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        cards:card_id (
          id,
          name,
          slug,
          annual_fee,
          default_earn_rate,
          primary_currency_id,
          secondary_currency_id,
          issuer_id,
          network,
          primary_currency:reward_currencies!cards_primary_currency_id_fkey (
            id, name, code, currency_type, base_value_cents
          ),
          secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (
            id, name, code, currency_type, base_value_cents
          )
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),
    
    // User's spending per category (including >$5k portions)
    supabase
      .from("user_effective_spending")
      .select("category_id, category_name, category_slug, annual_spend_cents, large_purchase_spend_cents")
      .eq("user_id", effectiveUserId),
    
    // User's custom currency values
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", effectiveUserId),
    
    // User's perks values (now keyed by wallet_card_id)
    supabase
      .from("user_card_perks_values")
      .select("wallet_card_id, perks_value")
      .eq("user_id", effectiveUserId),
    
    // User's debit pay values (now keyed by wallet_card_id)
    supabase
      .from("user_card_debit_pay")
      .select("wallet_card_id, debit_pay_percent")
      .eq("user_id", effectiveUserId),
    
    // User's category selections for "selected_category" bonuses
    // Include wallet_card_id for per-card selections (used when same card appears multiple times)
    supabase
      .from("user_card_selections")
      .select("cap_id, selected_category_id, wallet_card_id")
      .eq("user_id", effectiveUserId),
    
    // User's travel booking preferences
    supabase
      .from("user_travel_booking_preferences")
      .select("category_slug, preference_type, brand_name, portal_issuer_id")
      .eq("user_id", effectiveUserId),
    
    // User's selected multiplier tiers
    supabase
      .from("user_multiplier_tiers")
      .select("program_id, tier_id")
      .eq("user_id", effectiveUserId),
    
    // User's mobile pay categories
    supabase
      .from("user_mobile_pay_categories")
      .select("category_id")
      .eq("user_id", effectiveUserId),
    
    // User's PayPal categories
    supabase
      .from("user_paypal_categories")
      .select("category_id")
      .eq("user_id", effectiveUserId),
    
    // User's selected point value template
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // User's welcome bonuses
    supabase
      .from("user_welcome_bonuses")
      .select("id, wallet_card_id, is_active, component_type, spend_requirement_cents, time_period_months, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents")
      .eq("user_id", effectiveUserId),
    
    // User's spend bonuses
    supabase
      .from("user_spend_bonuses")
      .select("id, wallet_card_id, is_active, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, period, per_spend_cents, elite_unit_name, unit_value_cents, cap_amount, cap_period")
      .eq("user_id", effectiveUserId),
    
    // User's bonus display settings
    supabase
      .from("user_bonus_display_settings")
      .select("include_welcome_bonuses, include_spend_bonuses")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // User's feature flags (for wholesale club network restrictions)
    supabase
      .from("user_feature_flags")
      .select("wholesale_club_networks")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // User's Bilt settings (for Housing Points)
    supabase
      .from("user_bilt_settings")
      .select("wallet_card_id, bilt_option, housing_tier")
      .eq("user_id", effectiveUserId),
  ]);

  // Process wallet cards
  // Track instance counts for fee calculation (users may have multiple of same card)
  const userCardIds = new Set<string>();
  const cardInstanceCounts = new Map<string, number>();
  const walletCardIdToCardId = new Map<string, string>();
  
  type WalletRow = { id: string; card_id: string; custom_name: string | null; cards: CardInput | null };
  const walletRows = (walletResult.data as unknown as WalletRow[]) ?? [];
  
  walletRows.forEach((w) => {
    if (w.cards) {
      userCardIds.add(w.card_id);
      cardInstanceCounts.set(w.card_id, (cardInstanceCounts.get(w.card_id) ?? 0) + 1);
      walletCardIdToCardId.set(w.id, w.card_id);
    }
  });
  
  // Group wallet instances by card_id
  const walletsByCardId = new Map<string, WalletRow[]>();
  walletRows.forEach((w) => {
    if (w.cards) {
      const existing = walletsByCardId.get(w.card_id) ?? [];
      existing.push(w);
      walletsByCardId.set(w.card_id, existing);
    }
  });
  
  // Always split multiple instances of the same card into separate entries
  // This allows each card to have its own marginal value calculation
  // (e.g., "should I keep THIS Amex Platinum" vs "should I keep ANY Amex Platinums")
  const cardTypesNeedingSplit = new Set<string>();
  walletsByCardId.forEach((wallets, cardId) => {
    if (wallets.length > 1) {
      cardTypesNeedingSplit.add(cardId);
    }
  });
  
  // Build cards array: each wallet instance is a separate entry
  const cards: CardInput[] = [];
  const walletIdToEffectiveCardId = new Map<string, string>();
  
  // First, handle the normal de-duplication (most common case)
  const processedCardIds = new Set<string>();
  
  // Track base card info for split instances (wallet_id -> original card info)
  // This allows the display to aggregate multiple instances of the same card type
  const cardBaseInfo = new Map<string, { baseCardId: string; baseCardName: string }>();
  
  walletsByCardId.forEach((wallets, cardId) => {
    if (cardTypesNeedingSplit.has(cardId)) {
      // Split: each wallet instance becomes a separate "card" with wallet_id as id
      wallets.forEach((w) => {
        if (w.cards) {
          const displayName = w.custom_name || w.cards.name;
          cards.push({
            ...w.cards,
            id: w.id, // Use wallet_id as the card id
            name: displayName, // Use custom_name if set
          });
          walletIdToEffectiveCardId.set(w.id, w.id);
          // Each split instance has count of 1
          cardInstanceCounts.set(w.id, 1);
          // Track base card info for aggregation in display
          cardBaseInfo.set(w.id, {
            baseCardId: w.card_id,
            baseCardName: w.cards.name,
          });
        }
      });
      processedCardIds.add(cardId);
    } else {
      // Normal case: use first wallet's card data (all instances are the same)
      const firstWallet = wallets[0];
      if (firstWallet?.cards) {
        cards.push(firstWallet.cards);
        wallets.forEach(w => walletIdToEffectiveCardId.set(w.id, cardId));
      }
      processedCardIds.add(cardId);
    }
  });
  
  // Safety check: if cards array is somehow empty but we have wallet data, fall back to original logic
  if (cards.length === 0 && walletRows.length > 0) {
    console.warn("Card splitting logic resulted in empty cards array, falling back to original logic");
    const cardMap = new Map<string, CardInput>();
    walletRows.forEach((w) => {
      if (w.cards && !cardMap.has(w.card_id)) {
        cardMap.set(w.card_id, w.cards);
        walletIdToEffectiveCardId.set(w.id, w.card_id);
      }
    });
    cardMap.forEach((card) => cards.push(card));
  }

  // Process ALL earning rules (needed for recommendations)
  const allEarningRules: EarningRuleInput[] = rulesData
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

  // For split cards, duplicate earning rules to use wallet_id as card_id
  // This way the calculator can find earning rules for split wallet instances
  const earningRulesWithSplit: EarningRuleInput[] = [...allEarningRules];
  cardTypesNeedingSplit.forEach((cardId) => {
    const wallets = walletsByCardId.get(cardId) ?? [];
    const rulesForCard = allEarningRules.filter(r => r.card_id === cardId);
    wallets.forEach((w) => {
      rulesForCard.forEach((r) => {
        earningRulesWithSplit.push({
          ...r,
          id: `${r.id}_${w.id}`, // Unique id for the duplicate
          card_id: w.id, // Use wallet_id as card_id
        });
      });
    });
  });

  // Filter earning rules to only user's cards (including split wallet instances)
  const effectiveCardIds = new Set(cards.map(c => c.id));
  const earningRules = earningRulesWithSplit.filter((r) => effectiveCardIds.has(r.card_id));

  // Process ALL category bonuses (needed for recommendations)
  const allCategoryBonuses: CategoryBonusInput[] = bonusesData
    .map((b) => {
      const categories = (b.card_cap_categories as unknown as { category_id: number; cap_amount: number | null }[]) ?? [];
      
      // Build per-category cap amounts map for selected_category bonuses
      const categoryCaps = new Map<number, number | null>();
      if (b.cap_type === "selected_category") {
        for (const cat of categories) {
          categoryCaps.set(cat.category_id, cat.cap_amount);
        }
      }
      
      return {
        id: b.id,
        card_id: b.card_id,
        cap_type: b.cap_type,
        cap_amount: b.cap_amount ? Number(b.cap_amount) : null,
        cap_period: b.cap_period,
        elevated_rate: Number(b.elevated_rate),
        post_cap_rate: b.post_cap_rate ? Number(b.post_cap_rate) : null,
        category_ids: categories.map(c => c.category_id),
        category_cap_amounts: categoryCaps.size > 0 ? categoryCaps : undefined,
      };
    });

  // For split cards, duplicate category bonuses to use wallet_id
  const categoryBonusesWithSplit: CategoryBonusInput[] = [...allCategoryBonuses];
  cardTypesNeedingSplit.forEach((cardId) => {
    const wallets = walletsByCardId.get(cardId) ?? [];
    const bonusesForCard = allCategoryBonuses.filter(b => b.card_id === cardId);
    wallets.forEach((w) => {
      bonusesForCard.forEach((b) => {
        categoryBonusesWithSplit.push({
          ...b,
          id: `${b.id}_${w.id}`,
          card_id: w.id,
        });
      });
    });
  });

  // Filter category bonuses to only user's cards (including split wallet instances)
  const categoryBonuses = categoryBonusesWithSplit.filter((b) => effectiveCardIds.has(b.card_id));

  // Build category map with exclusion status
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  categoriesData.forEach((c) => {
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
  const templates = templatesData;
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
  currenciesData.forEach((c) => {
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

  // Build perks values map (keyed by wallet_card_id from the database)
  // For split cards, we use wallet_id directly; for non-split cards, we aggregate by card_id
  const perksValues = new Map<string, number>();
  perksResult.data?.forEach((p) => {
    perksValues.set(p.wallet_card_id, p.perks_value);
  });
  
  // For non-split cards, aggregate perks values from all wallet instances to use card_id as key
  walletsByCardId.forEach((wallets, cardId) => {
    if (!cardTypesNeedingSplit.has(cardId)) {
      // Sum perks from all wallet instances of this card type
      let totalPerks = 0;
      wallets.forEach((w) => {
        totalPerks += perksValues.get(w.id) ?? 0;
      });
      if (totalPerks > 0) {
        perksValues.set(cardId, totalPerks);
      }
    }
  });

  // Build debit pay values map (keyed by wallet_card_id from the database)
  const debitPayValues = new Map<string, number>();
  debitPayResult.data?.forEach((d) => {
    debitPayValues.set(d.wallet_card_id, Number(d.debit_pay_percent) ?? 0);
  });
  
  // For non-split cards, aggregate debit pay values from all wallet instances to use card_id as key
  // (use max value since different instances might have different debit pay settings)
  walletsByCardId.forEach((wallets, cardId) => {
    if (!cardTypesNeedingSplit.has(cardId)) {
      let maxDebitPay = 0;
      wallets.forEach((w) => {
        maxDebitPay = Math.max(maxDebitPay, debitPayValues.get(w.id) ?? 0);
      });
      if (maxDebitPay > 0) {
        debitPayValues.set(cardId, maxDebitPay);
      }
    }
  });

  // Build Bilt settings array for Housing Points
  const biltSettings: BiltSettingsInput[] = [];
  for (const setting of userBiltSettingsResult.data ?? []) {
    const cardId = walletCardIdToCardId.get(setting.wallet_card_id);
    if (cardId) {
      // Use effective card id (wallet_id for split cards, card_id for normal)
      const effectiveCardId = walletIdToEffectiveCardId.get(setting.wallet_card_id) ?? cardId;
      biltSettings.push({
        wallet_card_id: effectiveCardId,
        card_id: cardId,
        bilt_option: setting.bilt_option as 1 | 2,
        housing_tier: setting.housing_tier as "0.5x" | "0.75x" | "1x" | "1.25x",
        monthly_bilt_spend_cents: null, // Not used in new model
      });
    }
  }

  // Build user selections map
  // For split cards, bonus.id becomes "cap_id_wallet_id", so we need both keys:
  // - cap_id (for legacy/global selections and non-split cards)
  // - cap_id_wallet_id (for per-wallet selections with split cards)
  const userSelections = new Map<string, number>();
  selectionsResult.data?.forEach((s) => {
    // Always set the base cap_id (used as fallback and for non-split cards)
    userSelections.set(s.cap_id, s.selected_category_id);
    // If there's a wallet_card_id, also set the wallet-specific key for split cards
    if (s.wallet_card_id) {
      userSelections.set(`${s.cap_id}_${s.wallet_card_id}`, s.selected_category_id);
    }
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
  multiplierProgramsData.forEach((program) => {
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
  const mobilePayCategoryId = specialCategoryIds.mobilePayCategoryId;
  
  // Build PayPal categories set
  const paypalCategories = new Set<number>();
  paypalCategoriesResult.data?.forEach((p) => {
    paypalCategories.add(p.category_id);
  });
  const paypalCategoryId = specialCategoryIds.paypalCategoryId;
  
  const largePurchaseCategoryId = specialCategoryIds.largePurchaseCategoryId;

  // Process user welcome bonuses (use effective card id - wallet_id if split, card_id otherwise)
  const welcomeBonuses: WelcomeBonusInput[] = (userWelcomeBonusesResult.data ?? []).map((wb) => ({
    id: wb.id,
    wallet_card_id: wb.wallet_card_id,
    card_id: walletIdToEffectiveCardId.get(wb.wallet_card_id) ?? walletCardIdToCardId.get(wb.wallet_card_id) ?? "",
    is_active: wb.is_active,
    spend_requirement_cents: wb.spend_requirement_cents,
    time_period_months: wb.time_period_months,
    component_type: wb.component_type as "points" | "cash" | "benefit",
    points_amount: wb.points_amount,
    currency_id: wb.currency_id,
    cash_amount_cents: wb.cash_amount_cents,
    benefit_description: wb.benefit_description,
    value_cents: wb.value_cents,
  }));

  // Process user spend bonuses (use effective card id - wallet_id if split, card_id otherwise)
  const spendBonuses: SpendBonusInput[] = (userSpendBonusesResult.data ?? []).map((sb) => ({
    id: sb.id,
    wallet_card_id: sb.wallet_card_id,
    card_id: walletIdToEffectiveCardId.get(sb.wallet_card_id) ?? walletCardIdToCardId.get(sb.wallet_card_id) ?? "",
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
  }));

  // Bonus display settings
  const includeWelcomeBonuses = userBonusDisplaySettingsResult.data?.include_welcome_bonuses ?? false;
  const includeSpendBonuses = userBonusDisplaySettingsResult.data?.include_spend_bonuses ?? false;
  const includeBonusesInCalculation = includeWelcomeBonuses || includeSpendBonuses;

  // Server action to update bonus display settings
  async function updateBonusDisplaySettings(includeWelcome: boolean, includeSpend: boolean) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_bonus_display_settings")
      .upsert(
        {
          user_id: userId,
          include_welcome_bonuses: includeWelcome,
          include_spend_bonuses: includeSpend,
        },
        { onConflict: "user_id" }
      );

    revalidatePath("/spend-optimizer");
  }

  // Get wholesale club network restrictions
  const wholesaleClubNetworks = userFeatureFlagsResult.data?.wholesale_club_networks ?? null;

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
    // User-defined bonus inputs (is_active and valuations are built into each bonus)
    welcomeBonuses,
    spendBonuses,
    includeBonusesInCalculation,
    // Multi-instance support: count how many of each card for fee calculation
    cardInstanceCounts,
    // Base card info for split instances (enables aggregation in display)
    cardBaseInfo,
    // Wholesale club network restrictions (null = all networks allowed)
    wholesaleClubNetworks,
    // Bilt card settings for Housing Points
    biltSettings,
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
  const allCards = allCardsData as unknown as AllCardData[];
  
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
      <UserHeader isAdmin={isAdmin} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Spend Optimizer</h1>
          <p className="text-zinc-400 mt-1">
            Optimal allocation of your spending across {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <ReturnsDisplay returns={returns} earningsGoal={earningsGoal} recommendations={recommendations} />
        
        {/* Bonus Calculation Settings */}
        <BonusCalculationToggles
          includeWelcomeBonuses={includeWelcomeBonuses}
          includeSpendBonuses={includeSpendBonuses}
          onUpdateSettings={updateBonusDisplaySettings}
        />
      </div>
    </div>
  );
}

