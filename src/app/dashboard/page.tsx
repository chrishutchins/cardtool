import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { parseLocalDate } from "@/lib/utils";
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
import {
  getCachedCards,
  getCachedCategories,
  getCachedCurrencies,
  getCachedEarningRules,
  getCachedCardCaps,
  getCachedPointValueTemplates,
  getCachedMultiplierPrograms,
  getCachedCardCredits,
  getCachedSpecialCategoryIds,
} from "@/lib/cached-data";
import { EarningsSummary } from "./earnings-summary";
import { WalletSummaryCard } from "./stats-card";
import { CardRecommendationsSection } from "./card-recommendations-section";
import { DashboardClient } from "./dashboard-client";
import { PointsSummary } from "./points-summary";
import { CreditSummary } from "./credit-summary";
import { UpcomingUnified } from "./upcoming-unified";

export const metadata: Metadata = {
  title: "Dashboard | CardTool",
  description: "Your credit card rewards overview",
};

export default async function DashboardPage() {
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

  // Fetch cached reference data and user-specific data in parallel
  const [
    // Cached reference data (shared across all users, rarely changes)
    allCardsData,
    categoriesData,
    currenciesData,
    earningRulesData,
    cardCapsData,
    templatesData,
    multiplierProgramsData,
    cardCreditsData,
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
    featureFlagsResult,
    pointBalancesResult,
    linkedAccountsResult,
    allCurrenciesResult,
  ] = await Promise.all([
    // Cached data (hits cache, not DB on subsequent requests)
    getCachedCards(),
    getCachedCategories(),
    getCachedCurrencies(),
    getCachedEarningRules(),
    getCachedCardCaps(),
    getCachedPointValueTemplates(),
    getCachedMultiplierPrograms(),
    getCachedCardCredits(),
    getCachedSpecialCategoryIds(),
    // User-specific queries (always fresh)
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        approval_date,
        closed_date,
        manual_credit_limit_cents,
        cards:card_id (
          id, name, slug, annual_fee, default_earn_rate, primary_currency_id, secondary_currency_id, issuer_id,
          primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
          secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),
    supabase
      .from("user_effective_spending")
      .select("category_id, category_name, category_slug, annual_spend_cents, large_purchase_spend_cents")
      .eq("user_id", effectiveUserId),
    supabase.from("user_currency_values").select("currency_id, value_cents").eq("user_id", effectiveUserId),
    supabase.from("user_card_perks_values").select("wallet_card_id, perks_value").eq("user_id", effectiveUserId),
    supabase.from("user_card_debit_pay").select("wallet_card_id, debit_pay_percent").eq("user_id", effectiveUserId),
    supabase.from("user_card_selections").select("cap_id, selected_category_id").eq("user_id", effectiveUserId),
    supabase.from("user_travel_booking_preferences").select("category_slug, preference_type, brand_name, portal_issuer_id").eq("user_id", effectiveUserId),
    supabase.from("user_multiplier_tiers").select("program_id, tier_id").eq("user_id", effectiveUserId),
    supabase.from("user_mobile_pay_categories").select("category_id").eq("user_id", effectiveUserId),
    supabase.from("user_paypal_categories").select("category_id").eq("user_id", effectiveUserId),
    supabase.from("user_point_value_settings").select("selected_template_id").eq("user_id", effectiveUserId).maybeSingle(),
    supabase.from("user_welcome_bonuses")
      .select("id, wallet_card_id, is_active, component_type, spend_requirement_cents, time_period_months, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents")
      .eq("user_id", effectiveUserId),
    supabase.from("user_spend_bonuses")
      .select("id, wallet_card_id, is_active, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, period, per_spend_cents, elite_unit_name, unit_value_cents, cap_amount, cap_period")
      .eq("user_id", effectiveUserId),
    supabase.from("user_bonus_display_settings")
      .select("include_welcome_bonuses, include_spend_bonuses")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    supabase.from("user_feature_flags")
      .select("onboarding_completed")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    // Points balances for dashboard summary
    supabase.from("user_point_balances")
      .select("currency_id, player_number, balance, expiration_date")
      .eq("user_id", effectiveUserId),
    // Linked accounts for credit summary
    supabase.from("user_linked_accounts")
      .select("wallet_card_id, current_balance, credit_limit, available_balance")
      .eq("user_id", effectiveUserId),
    // All currencies for points breakdown by type
    supabase.from("reward_currencies")
      .select("id, name, code, currency_type, base_value_cents"),
  ]);

  // Process wallet cards
  const userCardIds = new Set<string>();
  const cardInstanceCounts = new Map<string, number>();
  const walletCardIdToCardId = new Map<string, string>();
  
  type WalletRow = { id: string; card_id: string; custom_name: string | null; approval_date: string | null; manual_credit_limit_cents: number | null; cards: CardInput | null };
  const walletRows = (walletResult.data as unknown as WalletRow[]) ?? [];
  
  walletRows.forEach((w) => {
    if (w.cards) {
      userCardIds.add(w.card_id);
      cardInstanceCounts.set(w.card_id, (cardInstanceCounts.get(w.card_id) ?? 0) + 1);
      walletCardIdToCardId.set(w.id, w.card_id);
    }
  });

  // Build cards array (de-duplicated)
  const cardMap = new Map<string, CardInput>();
  walletRows.forEach((w) => {
    if (w.cards && !cardMap.has(w.card_id)) {
      cardMap.set(w.card_id, w.cards);
    }
  });
  const cards: CardInput[] = Array.from(cardMap.values());

  // Process earning rules from cached data
  const allEarningRules: EarningRuleInput[] = earningRulesData.map((r) => ({
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

  const earningRules = allEarningRules.filter((r) => userCardIds.has(r.card_id));

  // Process category bonuses from cached data
  const allCategoryBonuses: CategoryBonusInput[] = cardCapsData.map((b) => ({
    id: b.id,
    card_id: b.card_id,
    cap_type: b.cap_type,
    cap_amount: b.cap_amount ? Number(b.cap_amount) : null,
    cap_period: b.cap_period,
    elevated_rate: Number(b.elevated_rate),
    post_cap_rate: b.post_cap_rate ? Number(b.post_cap_rate) : null,
    category_ids: ((b.card_cap_categories as unknown as { category_id: number }[]) ?? []).map(c => c.category_id),
  }));

  const categoryBonuses = allCategoryBonuses.filter((b) => userCardIds.has(b.card_id));

  // Build category maps from cached data
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  categoriesData.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
  });

  // Process spending
  const spending: CategorySpending[] = (spendingResult.data ?? []).map((s) => ({
    category_id: s.category_id!,
    category_name: s.category_name!,
    category_slug: s.category_slug!,
    annual_spend_cents: s.annual_spend_cents!,
    large_purchase_spend_cents: s.large_purchase_spend_cents ?? 0,
    excluded_by_default: categoryExclusionMap.get(s.category_id!) ?? false,
    parent_category_id: categoryParentMap.get(s.category_id!) ?? null,
  }));

  // Build currency values from cached data + user template selection
  const defaultTemplate = templatesData.find((t) => t.is_default) ?? templatesData[0];
  const selectedTemplateId = userPointValueSettingsResult.data?.selected_template_id ?? defaultTemplate?.id ?? null;
  const selectedTemplate = templatesData.find((t) => t.id === selectedTemplateId);
  
  const templateValueMap = new Map<string, number>();
  if (selectedTemplate?.template_currency_values) {
    for (const tv of selectedTemplate.template_currency_values) {
      templateValueMap.set(tv.currency_id, parseFloat(String(tv.value_cents)));
    }
  }

  const defaultCurrencyValues = new Map<string, number>();
  const cashOutValues = new Map<string, number>();
  currenciesData.forEach((c) => {
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
    const cardId = walletCardIdToCardId.get(p.wallet_card_id);
    if (cardId) {
      perksValues.set(cardId, (perksValues.get(cardId) ?? 0) + p.perks_value);
    }
  });

  // Build debit pay values map
  const debitPayValues = new Map<string, number>();
  debitPayResult.data?.forEach((d) => {
    const cardId = walletCardIdToCardId.get(d.wallet_card_id);
    if (cardId) {
      debitPayValues.set(cardId, Math.max(debitPayValues.get(cardId) ?? 0, Number(d.debit_pay_percent) ?? 0));
    }
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
  cards.forEach((c) => userPrimaryCurrencyIds.add(c.primary_currency_id));
  const enabledSecondaryCards = new Set<string>();
  cards.forEach((c) => {
    if (c.secondary_currency_id && userPrimaryCurrencyIds.has(c.secondary_currency_id)) {
      enabledSecondaryCards.add(c.id);
    }
  });

  // Build multiplier programs from cached data + user selections
  const userTierMap = new Map<string, string>();
  userMultiplierTiersResult.data?.forEach((t) => {
    if (t.program_id && t.tier_id) {
      userTierMap.set(t.program_id, t.tier_id);
    }
  });

  const multiplierPrograms: MultiplierProgram[] = [];
  multiplierProgramsData.forEach((program) => {
    const selectedTierId = userTierMap.get(program.id);
    if (!selectedTierId) return;
    
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

  // Build mobile pay and PayPal categories
  const mobilePayCategories = new Set<number>();
  mobilePayCategoriesResult.data?.forEach((m) => mobilePayCategories.add(m.category_id));
  const mobilePayCategoryId = specialCategoryIds.mobilePayCategoryId;
  
  const paypalCategories = new Set<number>();
  paypalCategoriesResult.data?.forEach((p) => paypalCategories.add(p.category_id));
  const paypalCategoryId = specialCategoryIds.paypalCategoryId;
  
  const largePurchaseCategoryId = specialCategoryIds.largePurchaseCategoryId;

  // Process bonuses
  const welcomeBonuses: WelcomeBonusInput[] = (userWelcomeBonusesResult.data ?? []).map((wb) => ({
    id: wb.id,
    wallet_card_id: wb.wallet_card_id,
    card_id: walletCardIdToCardId.get(wb.wallet_card_id) ?? "",
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

  const spendBonuses: SpendBonusInput[] = (userSpendBonusesResult.data ?? []).map((sb) => ({
    id: sb.id,
    wallet_card_id: sb.wallet_card_id,
    card_id: walletCardIdToCardId.get(sb.wallet_card_id) ?? "",
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
    earningsGoal: "maximize" as const,
    welcomeBonuses,
    spendBonuses,
    includeBonusesInCalculation,
    cardInstanceCounts,
  };
  
  const returns = cards.length > 0 ? calculatePortfolioReturns(calculatorInput) : null;

  // Calculate recommendations using cached all cards data
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
    card_charge_type: "credit" | "charge" | null;
    primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    issuer: { id: string; name: string } | null;
  };
  const allCards = allCardsData as unknown as AllCardData[];
  
  const rawRecommendations = returns && returns.totalSpend > 0 ? calculateCardRecommendations(
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

  // Build allCards map for issuer lookup
  const allCardsMap = new Map(allCards.map(c => [c.id, c]));

  // Build preview data maps for recommendations
  const earningRulesMap = new Map<string, typeof earningRulesData>();
  earningRulesData.forEach(rule => {
    const cardRules = earningRulesMap.get(rule.card_id) ?? [];
    cardRules.push(rule);
    earningRulesMap.set(rule.card_id, cardRules);
  });

  const categoryBonusesMap = new Map<string, typeof cardCapsData>();
  cardCapsData.forEach(cap => {
    const cardCaps = categoryBonusesMap.get(cap.card_id) ?? [];
    cardCaps.push(cap);
    categoryBonusesMap.set(cap.card_id, cardCaps);
  });

  const creditsMap = new Map<string, typeof cardCreditsData>();
  cardCreditsData.forEach(credit => {
    const cardCredits = creditsMap.get(credit.card_id) ?? [];
    cardCredits.push(credit);
    creditsMap.set(credit.card_id, cardCredits);
  });

  // Transform recommendations to the format expected by CardRecommendationsSection
  // Note: rec.improvement is already in dollars (not cents)
  const recommendations = rawRecommendations.map(rec => {
    const fullCard = allCardsMap.get(rec.card.id);
    const defaultPerksValue = fullCard?.default_perks_value ?? 0;
    const netFee = rec.card.annual_fee - defaultPerksValue;
    const spendingEarnings = Math.round(rec.improvement) + netFee;
    
    // Build preview data for this card
    const cardEarningRules = (earningRulesMap.get(rec.card.id) ?? []).map(rule => ({
      category_id: rule.category_id,
      category_name: categoriesData.find(c => c.id === rule.category_id)?.name ?? `Category ${rule.category_id}`,
      rate: rule.rate,
      booking_method: rule.booking_method ?? "",
      has_cap: rule.has_cap,
      cap_amount: rule.cap_amount,
      cap_period: rule.cap_period,
      cap_unit: rule.cap_unit ?? null,
      post_cap_rate: rule.post_cap_rate,
      brand_name: rule.brand_name ?? null,
    }));

    const cardCategoryBonuses = (categoryBonusesMap.get(rec.card.id) ?? []).map(cap => ({
      id: cap.id,
      cap_type: cap.cap_type,
      cap_amount: cap.cap_amount,
      cap_period: cap.cap_period,
      elevated_rate: cap.elevated_rate ?? 0,
      post_cap_rate: cap.post_cap_rate,
      categories: (cap.card_cap_categories ?? []).map(cc => ({
        id: cc.category_id,
        name: categoriesData.find(c => c.id === cc.category_id)?.name ?? `Category ${cc.category_id}`,
      })),
    }));

    const cardCredits = (creditsMap.get(rec.card.id) ?? []).map(credit => ({
      id: credit.id,
      name: credit.name,
      brand_name: credit.brand_name,
      reset_cycle: credit.reset_cycle,
      default_value_cents: credit.default_value_cents,
      default_quantity: credit.default_quantity,
      unit_name: credit.unit_name,
      notes: credit.notes,
      credit_count: credit.credit_count,
    }));
    
    return {
      cardId: rec.card.id,
      cardName: rec.card.name,
      cardSlug: fullCard?.slug ?? rec.card.id,
      issuerName: fullCard?.issuer?.name ?? null,
      currencyName: fullCard?.primary_currency?.name ?? "Cash Back",
      annualFee: rec.card.annual_fee,
      defaultEarnRate: fullCard?.default_earn_rate ?? 1,
      defaultPerksValue,
      netFee,
      spendingEarnings,
      totalEarnings: Math.round(rec.improvement),
      chargeType: fullCard?.card_charge_type ?? null,
      primaryCurrency: fullCard?.primary_currency ? {
        id: fullCard.primary_currency.id,
        name: fullCard.primary_currency.name,
        code: fullCard.primary_currency.code,
        currency_type: fullCard.primary_currency.currency_type,
        base_value_cents: fullCard.primary_currency.base_value_cents,
      } : null,
      previewEarningRules: cardEarningRules,
      previewCategoryBonuses: cardCategoryBonuses,
      previewCredits: cardCredits,
    };
  });

  // Process credits for expiring credits calculation
  const cardIdToWalletIds = new Map<string, string[]>();
  walletRows.forEach((w) => {
    if (w.cards) {
      const existing = cardIdToWalletIds.get(w.card_id) ?? [];
      existing.push(w.id);
      cardIdToWalletIds.set(w.card_id, existing);
    }
  });

  // Filter credits to only those for user's cards (using cached card credits)
  const userCredits = cardCreditsData.filter((c) => userCardIds.has(c.card_id));

  // Get credit usage for user's wallet cards
  const walletEntryIds = walletRows.map((w) => w.id);
  const { data: creditUsageData } = await supabase
    .from("user_credit_usage")
    .select("id, user_wallet_id, credit_id, period_start, period_end, amount_used")
    .in("user_wallet_id", walletEntryIds.length > 0 ? walletEntryIds : ["none"]);

  // Get credit settings
  const { data: creditSettingsData } = await supabase
    .from("user_credit_settings")
    .select("user_wallet_id, credit_id, is_hidden, notes")
    .in("user_wallet_id", walletEntryIds.length > 0 ? walletEntryIds : ["none"]);

  // Build credit settings map
  const creditSettingsMap = new Map<string, { is_hidden: boolean; notes: string | null }>();
  creditSettingsData?.forEach((s) => {
    creditSettingsMap.set(`${s.user_wallet_id}:${s.credit_id}`, { is_hidden: s.is_hidden, notes: s.notes });
  });

  // Calculate expiring credits
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  // Helper to create anniversary date, handling edge cases like Feb 29 in non-leap years
  function createAnniversaryDate(year: number, month: number, day: number): Date {
    const date = new Date(year, month, day);
    // If the month rolled over (e.g., Feb 29 in non-leap year → Mar 1), use last day of intended month
    if (date.getMonth() !== month) {
      return new Date(year, month + 1, 0); // Day 0 of next month = last day of intended month
    }
    return date;
  }

  interface ExpiringCredit {
    creditId: string;
    creditName: string;
    cardName: string;
    expiresAt: Date;
    value: number;
    isValueBased: boolean;
    unitName: string | null;
  }

  const expiringCredits: ExpiringCredit[] = [];

  for (const credit of userCredits) {
    const walletIdsForCard = cardIdToWalletIds.get(credit.card_id) ?? [];
    
    for (const walletId of walletIdsForCard) {
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
        periodEnd = new Date(year, month + 1, 0); // Last day of current month
      } else if (credit.reset_cycle === "quarterly") {
        const q = Math.floor(month / 3);
        periodEnd = new Date(year, (q + 1) * 3, 0);
      } else if (credit.reset_cycle === "semiannual") {
        const h = month < 6 ? 0 : 1;
        periodEnd = new Date(year, (h + 1) * 6, 0);
      } else if (credit.reset_cycle === "annual") {
        periodEnd = new Date(year, 11, 31);
      } else if (credit.reset_cycle === "cardmember_year") {
        // Need approval date from wallet card to calculate cardmember year end
        const walletCard = walletRows.find(w => w.id === walletId);
        if (!walletCard || !walletCard.approval_date) {
          // Skip if no wallet card or no approval date
          continue;
        }
        // Calculate period end based on approval date anniversary
        const approvalDate = parseLocalDate(walletCard.approval_date);
        const approvalMonth = approvalDate.getMonth();
        const approvalDay = approvalDate.getDate();
        
        // Find next cardmember year end (day before next anniversary)
        let anniversaryYear = year;
        const thisYearAnniversary = createAnniversaryDate(year, approvalMonth, approvalDay);
        if (now >= thisYearAnniversary) {
          anniversaryYear = year + 1;
        }
        // Period ends the day before the anniversary
        periodEnd = createAnniversaryDate(anniversaryYear, approvalMonth, approvalDay);
        periodEnd.setDate(periodEnd.getDate() - 1);
      }

      if (!periodEnd || periodEnd < now || periodEnd > ninetyDaysFromNow) continue;

      // Check if credit is already used this period
      const periodStartStr = getPeriodStart(credit.reset_cycle, now);
      const usage = creditUsageData?.filter(
        (u) => u.credit_id === credit.id && u.user_wallet_id === walletId && u.period_start === periodStartStr
      ) ?? [];
      
      const totalUsed = usage.reduce((sum, u) => sum + u.amount_used, 0);
      const maxAmount = credit.default_value_cents 
        ? credit.default_value_cents / 100 
        : (credit.default_quantity ?? 1);
      
      if (totalUsed >= maxAmount) continue; // Already fully used

      const walletCard = walletRows.find(w => w.id === walletId);
      const cardName = walletCard?.custom_name ?? walletCard?.cards?.name ?? "Unknown Card";

      expiringCredits.push({
        creditId: credit.id,
        creditName: credit.brand_name ? `${credit.name} (${credit.brand_name})` : credit.name,
        cardName,
        expiresAt: periodEnd,
        value: credit.default_value_cents ? credit.default_value_cents / 100 : (credit.default_quantity ?? 1),
        isValueBased: !!credit.default_value_cents,
        unitName: credit.unit_name,
      });
    }
  }

  // Sort by expiration date
  expiringCredits.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

  // Calculate totals for stats
  const totalAnnualFees = Array.from(cardInstanceCounts.entries()).reduce((sum, [cardId, count]) => {
    const card = cardMap.get(cardId);
    return sum + (card?.annual_fee ?? 0) * count;
  }, 0);

  const totalPerksValue = Array.from(perksValues.values()).reduce((sum, v) => sum + v, 0);
  const netFees = totalAnnualFees - totalPerksValue;

  // ============================================================================
  // Points Balances Summary
  // ============================================================================
  
  // Build currency lookup for points breakdown by type
  type CurrencyInfo = { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null };
  const currencyInfoMap = new Map<string, CurrencyInfo>();
  (allCurrenciesResult.data ?? []).forEach((c: CurrencyInfo) => {
    currencyInfoMap.set(c.id, c);
  });

  // Get currency values (user override > template > base)
  const getCurrencyValueCents = (currencyId: string): number => {
    // User override
    const userValue = userCurrencyValues.get(currencyId);
    if (userValue !== undefined) return userValue;
    // Template value
    const templateValue = templateValueMap.get(currencyId);
    if (templateValue !== undefined) return templateValue;
    // Default base value
    const currency = currencyInfoMap.get(currencyId);
    return currency?.base_value_cents ?? 1;
  };

  // Calculate points totals
  type PointBalance = { currency_id: string; player_number: number; balance: number; expiration_date: string | null };
  const pointBalances = (pointBalancesResult.data ?? []) as PointBalance[];
  
  let totalPoints = 0;
  let totalPointsValue = 0;
  const pointsByType = { bank: 0, airline: 0, hotel: 0 };
  
  // Expiring points in next 30 days
  interface ExpiringPoint {
    currencyName: string;
    balance: number;
    expirationDate: Date;
    playerNumber?: number;
  }
  const expiringPoints: ExpiringPoint[] = [];
  
  pointBalances.forEach((pb) => {
    if (pb.balance <= 0) return;
    
    const currency = currencyInfoMap.get(pb.currency_id);
    if (!currency) return;
    
    totalPoints += pb.balance;
    
    // Calculate value
    const valueCents = getCurrencyValueCents(pb.currency_id);
    totalPointsValue += (pb.balance * valueCents) / 100; // Convert to dollars
    
    // Categorize by type (same as points page)
    const currencyType = currency.currency_type;
    if (currencyType === "airline_miles") {
      pointsByType.airline += pb.balance;
    } else if (currencyType === "hotel_points") {
      pointsByType.hotel += pb.balance;
    } else if (
      currencyType === "transferable_points" || 
      currencyType === "non_transferable_points" || 
      currencyType === "cash_back" || 
      currencyType === "crypto"
    ) {
      pointsByType.bank += pb.balance;
    }
    
    // Check for expiring points (within 90 days)
    if (pb.expiration_date) {
      const expDate = parseLocalDate(pb.expiration_date);
      if (expDate >= now && expDate <= ninetyDaysFromNow) {
        expiringPoints.push({
          currencyName: currency.name,
          balance: pb.balance,
          expirationDate: expDate,
          playerNumber: pb.player_number,
        });
      }
    }
  });
  
  // Sort expiring points by date
  expiringPoints.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

  // ============================================================================
  // Credit Summary (from linked accounts + manual credit limits)
  // ============================================================================
  
  type LinkedAccountData = { wallet_card_id: string | null; current_balance: number | null; credit_limit: number | null; available_balance: number | null };
  const linkedAccounts = (linkedAccountsResult.data ?? []) as LinkedAccountData[];
  const hasPlaidAccounts = linkedAccounts.length > 0;
  
  // Build a map of wallet_card_id -> linked account for looking up limits
  const linkedAccountByWalletId = new Map<string, LinkedAccountData>();
  linkedAccounts.forEach((la) => {
    if (la.wallet_card_id) {
      linkedAccountByWalletId.set(la.wallet_card_id, la);
    }
  });
  
  let totalBalance = 0;
  let totalAvailable = 0;
  let totalCreditLine = 0;
  
  // Sum balances from Plaid linked accounts
  linkedAccounts.forEach((la) => {
    if (la.current_balance != null) {
      totalBalance += la.current_balance;
    }
    if (la.available_balance != null) {
      totalAvailable += la.available_balance;
    }
    if (la.credit_limit != null && la.credit_limit > 0) {
      totalCreditLine += la.credit_limit;
    }
  });
  
  // Add manual credit limits from wallet cards (only if not already counted via Plaid)
  walletRows.forEach((wc) => {
    const linkedAccount = linkedAccountByWalletId.get(wc.id);
    // If no Plaid account or Plaid has no limit, use manual limit
    if (!linkedAccount || linkedAccount.credit_limit == null || linkedAccount.credit_limit === 0) {
      if (wc.manual_credit_limit_cents != null && wc.manual_credit_limit_cents > 0) {
        totalCreditLine += wc.manual_credit_limit_cents / 100; // Convert cents to dollars
      }
    }
  });

  // ============================================================================
  // Upcoming Annual Fees (cards with anniversary in next 30 days)
  // ============================================================================
  
  interface UpcomingFee {
    cardName: string;
    annualFee: number;
    anniversaryDate: Date;
    walletId: string;
  }
  const upcomingFees: UpcomingFee[] = [];
  
  walletRows.forEach((wc) => {
    if (!wc.approval_date || !wc.cards) return;
    if (wc.cards.annual_fee <= 0) return; // Skip cards with no annual fee
    
    const approvalDate = parseLocalDate(wc.approval_date);
    const approvalMonth = approvalDate.getMonth();
    const approvalDay = approvalDate.getDate();
    
    // Find next anniversary
    let anniversaryYear = now.getFullYear();
    let nextAnniversary = createAnniversaryDate(anniversaryYear, approvalMonth, approvalDay);
    
    // If anniversary already passed this year, check next year
    if (nextAnniversary < now) {
      anniversaryYear++;
      nextAnniversary = createAnniversaryDate(anniversaryYear, approvalMonth, approvalDay);
    }
    
    // Check if within 90 days
    if (nextAnniversary >= now && nextAnniversary <= ninetyDaysFromNow) {
      upcomingFees.push({
        cardName: wc.custom_name ?? wc.cards.name,
        annualFee: wc.cards.annual_fee,
        anniversaryDate: nextAnniversary,
        walletId: wc.id,
      });
    }
  });
  
  // Sort by date
  upcomingFees.sort((a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime());

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Check if onboarding has been completed
  const onboardingCompleted = featureFlagsResult.data?.onboarding_completed ?? false;

  async function completeOnboarding() {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { getEffectiveUserId } = await import("@/lib/emulation");
    const { revalidatePath } = await import("next/cache");
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    
    if (!userId) return;
    
    await supabase
      .from("user_feature_flags")
      .upsert({
        user_id: userId,
        onboarding_completed: true,
      }, { onConflict: "user_id" });
    
    revalidatePath("/dashboard");
  }

  return (
    <DashboardClient
      showOnboarding={!onboardingCompleted}
      onCompleteOnboarding={completeOnboarding}
    >
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            Your credit card rewards at a glance
          </p>
        </div>

        {/* Summary Row: 3 Equal-Width Widgets */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <WalletSummaryCard
            cardCount={walletRows.length}
            totalFees={totalAnnualFees}
            perksValue={totalPerksValue}
            netFees={netFees}
          />
          <PointsSummary
            totalPoints={totalPoints}
            totalValue={totalPointsValue}
            pointsByType={pointsByType}
          />
          <CreditSummary
            totalBalance={totalBalance}
            totalAvailable={totalAvailable}
            totalCreditLine={totalCreditLine}
            hasPlaidAccounts={hasPlaidAccounts}
          />
        </div>

        {/* Upcoming Section - Full Width */}
        <div className="mb-6">
          <UpcomingUnified
            expiringPoints={expiringPoints}
            expiringCredits={expiringCredits}
            upcomingFees={upcomingFees}
          />
        </div>

        {/* Earnings Summary - Full Width */}
        <div className="mb-6">
          <EarningsSummary returns={returns} cardCount={cards.length} />
        </div>

        {/* Card Recommendations */}
        {recommendations.length > 0 && (
          <CardRecommendationsSection 
            recommendations={recommendations}
            existingCardIds={userCardIds}
          />
        )}
      </div>
    </div>
    </DashboardClient>
  );
}

// Helper function to get period start string
function getPeriodStart(resetCycle: string, date: Date): string {
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
    default:
      return `${year}-01-01`;
  }
}
