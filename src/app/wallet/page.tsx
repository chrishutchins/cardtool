import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { WalletCardTable } from "./wallet-card-table";
import { AddCardModal } from "./add-card-modal";
import { RefreshBalancesButton } from "./refresh-balances-button";
import { ClosedCardsSection, ClosedCardDisplay } from "./closed-cards-section";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { calculateCreditPeriod } from "@/lib/credit-matcher";
import { calculateBillingDates } from "@/lib/billing-cycle";
import { calculateStatementBalance, type StatementEstimate } from "@/lib/statement-calculator";
import {
  getCachedEarningRules,
  getCachedCardCaps,
  getCachedCategories,
  getCachedPointValueTemplates,
  getCachedSpecialCategoryIds,
  getCachedCurrencies,
  getCachedCards,
  getCachedCardCredits,
  getCachedIssuers,
} from "@/lib/cached-data";
import { invalidateCardCaches } from "@/lib/cache-invalidation";
import {
  CardInput,
  CategorySpending,
  EarningRuleInput,
  CategoryBonusInput,
  TravelPreference,
  MultiplierProgram,
  WelcomeBonusInput,
  SpendBonusInput,
} from "@/lib/returns-calculator";

export const metadata: Metadata = {
  title: "My Wallet | CardTool",
  description: "Manage your credit cards and track rewards",
};
import { UserWelcomeBonus, UserSpendBonus } from "./user-bonus-section";
import { WalletClient } from "./wallet-client";

export default async function WalletPage() {
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

  // Fetch wallet cards and returns data in parallel
  // Split into cached reference data and user-specific data
  const [
    // Cached reference data (shared across all users, rarely changes)
    rulesData,
    bonusesData,
    categoriesData,
    templatesData,
    specialCategoryIds,
    currenciesData,
    allCardsData,
    cardCreditsData,
    issuersData,
    // User-specific data (must be fresh)
    walletResult,
    spendingResult,
    userCurrencyValuesResult,
    perksResult,
    selectionsResult,
    travelPrefsResult,
    featureFlagsResult,
    debitPayResult,
    multiplierTiersResult,
    mobilePayCategoriesResult,
    paypalCategoriesResult,
    userPointValueSettingsResult,
    userWelcomeBonusesResult,
    userSpendBonusesResult,
    userBonusDisplaySettingsResult,
    playersResult,
    linkedAccountsResult,
    transactionsResult,
    bankAccountsResult,
    paymentSettingsResult,
  ] = await Promise.all([
    // Cached data (hits cache, not DB on subsequent requests)
    getCachedEarningRules(),
    getCachedCardCaps(),
    getCachedCategories(),
    getCachedPointValueTemplates(),
    getCachedSpecialCategoryIds(),
    getCachedCurrencies(),
    getCachedCards(),
    getCachedCardCredits(),
    getCachedIssuers(),
    // User-specific queries (always fresh)
    // User's wallet cards with full details (including closed cards)
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        added_at,
        approval_date,
        player_number,
        closed_date,
        closed_reason,
        product_changed_to_id,
        statement_close_day,
        payment_due_day,
        manual_balance_cents,
        manual_credit_limit_cents,
        annual_fee_override,
        notes,
        network_override,
        cards:card_id (
          id,
          name,
          slug,
          annual_fee,
          default_earn_rate,
          primary_currency_id,
          secondary_currency_id,
          issuer_id,
          product_type,
          card_charge_type,
          network,
          brand,
          issuers:issuer_id (id, name, billing_cycle_formula),
          primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
          secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
        )
      `)
      .eq("user_id", effectiveUserId),
    
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
    
    // User's perks values (now keyed by wallet_card_id, not card_id)
    supabase
      .from("user_card_perks_values")
      .select("wallet_card_id, perks_value")
      .eq("user_id", effectiveUserId),
    
    // User's category selections
    supabase
      .from("user_card_selections")
      .select("cap_id, selected_category_id")
      .eq("user_id", effectiveUserId),
    
    // User's travel preferences
    supabase
      .from("user_travel_booking_preferences")
      .select("category_slug, preference_type, brand_name, portal_issuer_id")
      .eq("user_id", effectiveUserId),
    
    // User's feature flags (for debit pay, onboarding, and account linking)
    supabase
      .from("user_feature_flags")
      .select("debit_pay_enabled, onboarding_completed, account_linking_enabled")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // User's debit pay values (now keyed by wallet_card_id)
    supabase
      .from("user_card_debit_pay")
      .select("wallet_card_id, debit_pay_percent")
      .eq("user_id", effectiveUserId),
      
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
      .eq("user_id", effectiveUserId),
    
    // Mobile pay categories (for bonus calculation)
    supabase
      .from("user_mobile_pay_categories")
      .select("category_id")
      .eq("user_id", effectiveUserId),
    
    // PayPal categories (for bonus calculation)
    supabase
      .from("user_paypal_categories")
      .select("category_id")
      .eq("user_id", effectiveUserId),
    
    // User's point value settings
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // User's welcome bonuses (with currency name for display)
    supabase
      .from("user_welcome_bonuses")
      .select("id, wallet_card_id, is_active, component_type, spend_requirement_cents, time_period_months, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, reward_currencies:currency_id(name)")
      .eq("user_id", effectiveUserId),
    
    // User's spend bonuses (with currency name for display)
    supabase
      .from("user_spend_bonuses")
      .select("id, wallet_card_id, is_active, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, period, per_spend_cents, elite_unit_name, unit_value_cents, cap_amount, cap_period, reward_currencies:currency_id(name)")
      .eq("user_id", effectiveUserId),
    
    // User's bonus display settings
    supabase
      .from("user_bonus_display_settings")
      .select("include_welcome_bonuses, include_spend_bonuses")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // User's player configurations
    supabase
      .from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId)
      .order("player_number"),
    
    // User's linked Plaid accounts for balance/credit limit data
    supabase
      .from("user_linked_accounts")
      .select(`
        id,
        wallet_card_id,
        current_balance,
        credit_limit,
        manual_credit_limit,
        available_balance,
        last_balance_update,
        last_statement_balance,
        last_statement_issue_date,
        next_payment_due_date,
        last_payment_amount,
        last_payment_date,
        is_overdue
      `)
      .eq("user_id", effectiveUserId),
    
    // Recent transactions for statement balance calculation (last 60 days)
    supabase
      .from("user_plaid_transactions")
      .select(`
        id,
        linked_account_id,
        amount_cents,
        date,
        pending
      `)
      .eq("user_id", effectiveUserId)
      .eq("pending", false)
      .gte("date", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: false }),
    
    // User's linked bank accounts for "Pay From" feature
    supabase
      .from("user_bank_accounts")
      .select(`
        id,
        name,
        official_name,
        display_name,
        type,
        subtype,
        mask,
        institution_name,
        current_balance,
        available_balance,
        iso_currency_code,
        last_balance_update,
        is_primary,
        is_manual
      `)
      .eq("user_id", effectiveUserId)
      .order("is_primary", { ascending: false })
      .order("institution_name", { ascending: true }),
    // User's card payment settings
    supabase
      .from("user_card_payment_settings")
      .select("wallet_card_id, pay_from_account_id, is_autopay, autopay_type")
      .eq("user_id", effectiveUserId),
  ]);

  // Category selection data for cards with selectable categories
  const capIds = bonusesData?.filter(b => b.cap_type === "selected_category").map((c) => c.id) ?? [];
  const [capCategoriesResult, userCategorySelectionsResult] = capIds.length > 0
    ? await Promise.all([
        supabase
          .from("card_cap_categories")
          .select("cap_id, category_id, earning_categories(id, name)")
          .in("cap_id", capIds),
        supabase
          .from("user_card_selections")
          .select("cap_id, selected_category_id, wallet_card_id")
          .eq("user_id", effectiveUserId)
          .in("cap_id", capIds),
      ])
    : [{ data: [] }, { data: [] }];

  // Build caps with categories structure
  type CapCategoryData = { cap_id: string; earning_categories: { id: number; name: string } | null };
  const cardCapsWithCategories = (bonusesData ?? [])
    .filter(cap => cap.cap_type === "selected_category")
    .map((cap) => ({
      id: cap.id,
      card_id: cap.card_id,
      cap_type: cap.cap_type,
      cap_amount: cap.cap_amount ? Number(cap.cap_amount) : null,
      categories: ((capCategoriesResult.data ?? []) as unknown as CapCategoryData[])
        .filter((cc) => cc.cap_id === cap.id)
        .map((cc) => cc.earning_categories)
        .filter((cat): cat is { id: number; name: string } => cat !== null),
    }));

  // Group caps by card_id
  const categorySelectionCapsMap = new Map<string, typeof cardCapsWithCategories>();
  for (const cap of cardCapsWithCategories) {
    const existing = categorySelectionCapsMap.get(cap.card_id) ?? [];
    existing.push(cap);
    categorySelectionCapsMap.set(cap.card_id, existing);
  }

  const userCategorySelections = (userCategorySelectionsResult.data ?? []) as { 
    cap_id: string; 
    selected_category_id: number; 
    wallet_card_id?: string | null;
  }[];

  // Bilt settings for housing bonus
  const walletIds = walletResult.data?.map(wc => wc.id) ?? [];
  const { data: userBiltSettingsData } = walletIds.length > 0
    ? await supabase
        .from("user_bilt_settings")
        .select("wallet_card_id, bilt_option, housing_tier, monthly_bilt_spend_cents")
        .eq("user_id", effectiveUserId)
    : { data: [] };
  
  // Build map of wallet_card_id -> Bilt settings (only for Bilt cards)
  const biltSettingsMap = new Map<string, { biltOption: number; housingTier: string; monthlyBiltSpendCents: number | null }>();
  for (const setting of userBiltSettingsData ?? []) {
    biltSettingsMap.set(setting.wallet_card_id, {
      biltOption: setting.bilt_option,
      housingTier: setting.housing_tier,
      monthlyBiltSpendCents: setting.monthly_bilt_spend_cents,
    });
  }
  
  // Identify Bilt cards in user's wallet (cards with "bilt-" in slug, excluding legacy "bilt-card")
  const biltCardWalletIds = new Set<string>();
  for (const wc of walletResult.data ?? []) {
    const cards = wc.cards as { slug: string } | null;
    if (cards?.slug?.includes("bilt-") && cards.slug !== "bilt-card") {
      biltCardWalletIds.add(wc.id);
      // Initialize default settings for Bilt cards without settings
      if (!biltSettingsMap.has(wc.id)) {
        biltSettingsMap.set(wc.id, { biltOption: 1, housingTier: "1x", monthlyBiltSpendCents: null });
      }
    }
  }

  // Players data
  const players = (playersResult.data ?? []) as { player_number: number; description: string | null }[];
  const playerCount = players.length > 0 ? Math.max(...players.map(p => p.player_number)) : 1;

  // Type assertion for wallet cards since Supabase types don't infer relations correctly
  // Note: statement_close_day, payment_due_day, manual_balance_cents, manual_credit_limit_cents
  // are optional until migration 20260109000000_wallet_card_fields.sql is applied
  // Note: closed_date, closed_reason, product_changed_to_id are from migration 20260110000000_wallet_card_closure.sql
  type WalletCardData = {
    id: string;
    card_id: string;
    custom_name: string | null;
    added_at: string | null;
    approval_date: string | null;
    player_number: number | null;
    closed_date: string | null;
    closed_reason: string | null;
    product_changed_to_id: string | null;
    statement_close_day?: number | null;
    payment_due_day?: number | null;
    manual_balance_cents?: number | null;
    manual_credit_limit_cents?: number | null;
    cards: {
      id: string;
      name: string;
      slug: string;
      annual_fee: number;
      default_earn_rate: number;
      primary_currency_id: string;
      secondary_currency_id: string | null;
      issuer_id: string;
      card_charge_type?: "credit" | "charge" | null;
      issuers: { id: string; name: string; billing_cycle_formula?: string | null } | null;
      primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
      secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    } | null;
  };
  const allWalletCards = (walletResult.data ?? []) as unknown as WalletCardData[];
  
  // Separate active and closed cards
  const walletCards = allWalletCards.filter((wc) => !wc.closed_date);
  const closedWalletCards = allWalletCards.filter((wc) => wc.closed_date);
  
  const userCardIds = walletCards.map((wc) => wc.card_id);
  
  // Build set of primary currency IDs per player (currency is only "owned" if same player has the card)
  // Map: player_number -> Set<currency_id>
  const primaryCurrencyIdsByPlayer = new Map<number, Set<string>>();
  walletCards.forEach((wc) => {
    if (!wc.cards?.primary_currency_id) return;
    const player = wc.player_number ?? 1;
    if (!primaryCurrencyIdsByPlayer.has(player)) {
      primaryCurrencyIdsByPlayer.set(player, new Set());
    }
    primaryCurrencyIdsByPlayer.get(player)!.add(wc.cards.primary_currency_id);
  });

  // Cards with secondary currency enabled - per wallet card ID (player-scoped)
  // A wallet card has secondary enabled if the same player has another card that earns that currency as primary
  const enabledSecondaryCards = new Map<string, boolean>();
  walletCards.forEach((wc) => {
    if (!wc.cards?.secondary_currency_id) {
      enabledSecondaryCards.set(wc.id, false);
      return;
    }
    const player = wc.player_number ?? 1;
    const playerCurrencies = primaryCurrencyIdsByPlayer.get(player) ?? new Set();
    enabledSecondaryCards.set(wc.id, playerCurrencies.has(wc.cards.secondary_currency_id));
  });

  // Build a mapping from wallet_card_id → card_id for lookups
  const walletToCardIdMap = new Map<string, string>();
  walletCards.forEach((wc) => {
    if (wc.cards) {
      walletToCardIdMap.set(wc.id, wc.cards.id);
    }
  });

  // Build TWO perks maps:
  // 1. perksMapByWalletId - for display in WalletCardList (keyed by wallet_card_id)
  // 2. perksMapByCardId - for the calculator (keyed by card_id, summed across instances)
  const perksMapByWalletId = new Map<string, number>();
  const perksMapByCardId = new Map<string, number>();
  perksResult.data?.forEach((pv) => {
    // For display: keyed by wallet_card_id
    perksMapByWalletId.set(pv.wallet_card_id, pv.perks_value);
    // For calculator: keyed by card_id, summed across all instances
    const cardId = walletToCardIdMap.get(pv.wallet_card_id);
    if (cardId) {
      perksMapByCardId.set(cardId, (perksMapByCardId.get(cardId) ?? 0) + pv.perks_value);
    }
  });

  // Check if debit pay is enabled
  const debitPayEnabled = featureFlagsResult.data?.debit_pay_enabled ?? false;
  
  // Check if account linking (Plaid) is enabled
  const accountLinkingEnabled = featureFlagsResult.data?.account_linking_enabled ?? false;
  
  // Build TWO debit pay maps:
  // 1. debitPayMapByWalletId - for display in WalletCardList (keyed by wallet_card_id)
  // 2. debitPayMapByCardId - for the calculator (keyed by card_id, max value across instances)
  const debitPayMapByWalletId = new Map<string, number>();
  const debitPayMapByCardId = new Map<string, number>();
  debitPayResult.data?.forEach((dp) => {
    const value = Number(dp.debit_pay_percent) ?? 0;
    // For display: keyed by wallet_card_id
    debitPayMapByWalletId.set(dp.wallet_card_id, value);
    // For calculator: keyed by card_id, use max value
    const cardId = walletToCardIdMap.get(dp.wallet_card_id);
    if (cardId) {
      debitPayMapByCardId.set(cardId, Math.max(debitPayMapByCardId.get(cardId) ?? 0, value));
    }
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
    search_aliases: string[] | null;
    network: "visa" | "mastercard" | "amex" | "discover" | null;
    issuers: { id: string; name: string } | null;
    primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
  };
  const allCards = allCardsData as unknown as AllCardData[];
  
  // All cards are available to add (users can add duplicates)
  // Filter out cards that are excluded from recommendations
  const availableCardsForModal = allCards.filter((card) => card.id && !card.exclude_from_recommendations);

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

  // Filter earning rules to only user's cards (for current returns calculation)
  const earningRules = allEarningRules.filter((r) => userCardIdsSet.has(r.card_id));

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

  // Filter category bonuses to only user's cards (for current returns calculation)
  const categoryBonuses = allCategoryBonuses.filter((b) => userCardIdsSet.has(b.card_id));

  // Build category maps
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  const categoryNameMap = new Map<number, string>();
  const categorySlugMap = new Map<number, string>();
  categoriesData.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
    categoryNameMap.set(c.id, c.name);
    categorySlugMap.set(c.id, c.slug);
  });
  
  // Build earning rules map per card_id for display in WalletCardList
  const earningRulesPerCard = new Map<string, Array<{
    id: string;
    category_id: number;
    category_name: string;
    category_slug: string;
    rate: number;
    has_cap: boolean;
    cap_amount: number | null;
    cap_period: "month" | "quarter" | "year" | "lifetime" | null;
    cap_unit: "spend" | "points" | null;
    post_cap_rate: number | null;
    booking_method: "any" | "portal" | "brand";
    brand_name: string | null;
  }>>();
  allEarningRules.forEach((rule) => {
    const existing = earningRulesPerCard.get(rule.card_id) ?? [];
    existing.push({
      id: rule.id,
      category_id: rule.category_id,
      category_name: categoryNameMap.get(rule.category_id) ?? "Unknown",
      category_slug: categorySlugMap.get(rule.category_id) ?? "",
      rate: rule.rate,
      has_cap: rule.has_cap,
      cap_amount: rule.cap_amount,
      cap_period: rule.cap_period as "month" | "quarter" | "year" | "lifetime" | null,
      cap_unit: rule.cap_unit as "spend" | "points" | null,
      post_cap_rate: rule.post_cap_rate,
      booking_method: rule.booking_method as "any" | "portal" | "brand",
      brand_name: rule.brand_name,
    });
    earningRulesPerCard.set(rule.card_id, existing);
  });
  
  // Build category bonuses map per card_id for display in WalletCardList
  const categoryBonusesPerCard = new Map<string, Array<{
    id: string;
    cap_type: string;
    cap_amount: number | null;
    cap_period: string | null;
    elevated_rate: number;
    post_cap_rate: number | null;
    category_ids: number[];
    category_names: string[];
  }>>();
  allCategoryBonuses.forEach((bonus) => {
    const existing = categoryBonusesPerCard.get(bonus.card_id) ?? [];
    existing.push({
      id: bonus.id,
      cap_type: bonus.cap_type,
      cap_amount: bonus.cap_amount,
      cap_period: bonus.cap_period,
      elevated_rate: bonus.elevated_rate,
      post_cap_rate: bonus.post_cap_rate,
      category_ids: bonus.category_ids,
      category_names: bonus.category_ids.map(id => categoryNameMap.get(id) ?? "Unknown"),
    });
    categoryBonusesPerCard.set(bonus.card_id, existing);
  });
  
  // Build credits per card map for display in table
  type CardCreditData = {
    id: string;
    card_id: string;
    name: string;
    brand_name: string | null;
    reset_cycle: string;
    default_value_cents: number | null;
    default_quantity: number | null;
    unit_name: string | null;
    notes: string | null;
    credit_count: number;
  };
  const creditsPerCard = new Map<string, CardCreditData[]>();
  cardCreditsData.forEach((credit: unknown) => {
    const c = credit as CardCreditData;
    const existing = creditsPerCard.get(c.card_id) ?? [];
    existing.push(c);
    creditsPerCard.set(c.card_id, existing);
  });
  
  // Build linked accounts map (keyed by wallet_card_id)
  type LinkedAccountData = {
    id: string;
    wallet_card_id: string | null;
    current_balance: number | null;
    credit_limit: number | null;
    manual_credit_limit: number | null;
    available_balance: number | null;
    last_balance_update: string | null;
    last_statement_balance: number | null;
    last_statement_issue_date: string | null;
    next_payment_due_date: string | null;
    last_payment_amount: number | null;
    last_payment_date: string | null;
    is_overdue: boolean;
  };
  const linkedAccountsMap = new Map<string, LinkedAccountData>();
  // Also build reverse map: linked_account_id -> wallet_card_id
  const linkedAccountIdToWalletCardId = new Map<string, string>();
  (linkedAccountsResult.data ?? []).forEach((account: unknown) => {
    const a = account as LinkedAccountData;
    if (a.wallet_card_id) {
      linkedAccountsMap.set(a.wallet_card_id, a);
      linkedAccountIdToWalletCardId.set(a.id, a.wallet_card_id);
    }
  });

  // Build transactions map (keyed by wallet_card_id)
  type TransactionData = {
    id: string;
    linked_account_id: string | null;
    amount_cents: number;
    date: string;
    pending: boolean;
  };
  const transactionsByWalletCardId = new Map<string, TransactionData[]>();
  (transactionsResult.data ?? []).forEach((tx: unknown) => {
    const t = tx as TransactionData;
    if (t.linked_account_id) {
      const walletCardId = linkedAccountIdToWalletCardId.get(t.linked_account_id);
      if (walletCardId) {
        const existing = transactionsByWalletCardId.get(walletCardId) ?? [];
        existing.push(t);
        transactionsByWalletCardId.set(walletCardId, existing);
      }
    }
  });

  // Calculate statement estimates for wallet cards with billing dates and linked accounts
  const statementEstimatesMap = new Map<string, StatementEstimate>();
  walletCards.forEach((wc) => {
    if (!wc.cards) return;
    
    // Need linked account with current balance
    const linkedAccount = linkedAccountsMap.get(wc.id);
    if (!linkedAccount?.current_balance) return;
    
    // Need statement close day to calculate billing dates
    const formula = wc.cards.issuers?.billing_cycle_formula ?? null;
    // For Chase, use different formula for business vs personal cards
    let billingFormula = formula;
    if (billingFormula === 'due_plus_3' && wc.cards.name.toLowerCase().includes('business')) {
      billingFormula = 'due_plus_6';
    }
    
    const billingDates = calculateBillingDates(
      billingFormula,
      wc.statement_close_day ?? null,
      wc.payment_due_day ?? null
    );
    
    // Need last statement close date
    if (!billingDates.lastCloseDate) return;
    
    // Get transactions for this card
    const transactions = transactionsByWalletCardId.get(wc.id) ?? [];
    
    // Current balance from Plaid is in dollars, convert to cents
    const currentBalanceCents = Math.round(linkedAccount.current_balance * 100);
    
    // Calculate statement estimate
    const estimate = calculateStatementBalance(
      currentBalanceCents,
      transactions.map(t => ({ amount_cents: t.amount_cents, date: t.date })),
      billingDates.lastCloseDate
    );
    
    statementEstimatesMap.set(wc.id, estimate);
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
  const templates = templatesData as unknown as TemplateData[];
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
  currenciesData.forEach((c) => {
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
  const mobilePayCategoryId = specialCategoryIds.mobilePayCategoryId;
  
  // Build PayPal categories set
  const paypalCategories = new Set<number>();
  paypalCategoriesResult.data?.forEach((p) => {
    paypalCategories.add(p.category_id);
  });
  const paypalCategoryId = specialCategoryIds.paypalCategoryId;
  
  // Large purchase category ID
  const largePurchaseCategoryId = specialCategoryIds.largePurchaseCategoryId;

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

  // Build maps for per-card bonus display in settings modal
  const welcomeBonusesMap = new Map<string, typeof userWelcomeBonuses>();
  for (const wb of userWelcomeBonuses) {
    const existing = welcomeBonusesMap.get(wb.wallet_card_id) ?? [];
    existing.push(wb);
    welcomeBonusesMap.set(wb.wallet_card_id, existing);
  }

  const spendBonusesMap = new Map<string, typeof userSpendBonuses>();
  for (const sb of userSpendBonuses) {
    const existing = spendBonusesMap.get(sb.wallet_card_id) ?? [];
    existing.push(sb);
    spendBonusesMap.set(sb.wallet_card_id, existing);
  }

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

  // Build closed cards display data with product_changed_to_name lookup
  const closedCardsForDisplay: ClosedCardDisplay[] = closedWalletCards.map((wc) => {
    // Find the card that this was product changed to
    let productChangedToName: string | null = null;
    if (wc.product_changed_to_id) {
      const targetCard = allWalletCards.find((c) => c.id === wc.product_changed_to_id);
      if (targetCard?.cards) {
        productChangedToName = targetCard.custom_name ?? targetCard.cards.name;
      }
    }

    return {
      id: wc.id,
      card_id: wc.card_id,
      card_name: wc.cards?.name ?? "Unknown",
      custom_name: wc.custom_name,
      approval_date: wc.approval_date,
      closed_date: wc.closed_date,
      closed_reason: wc.closed_reason as "product_change" | "closed" | null,
      product_changed_to_id: wc.product_changed_to_id,
      product_changed_to_name: productChangedToName,
      player_number: wc.player_number,
      issuer_name: wc.cards?.issuers?.name ?? null,
    };
  });

  // Build data for product change modal (all cards from same issuer, closed cards for reactivation)
  const allCardsForProductChange = allCards.map((c) => ({
    id: c.id,
    name: c.name,
    issuer_id: c.issuer_id,
    issuer_name: c.issuers?.name ?? "",
    annual_fee: c.annual_fee,
    primary_currency_name: c.primary_currency?.name ?? null,
  }));

  const closedCardsForReactivation = closedWalletCards.map((wc) => ({
    id: wc.id,
    card_id: wc.card_id,
    card_name: wc.cards?.name ?? "Unknown",
    custom_name: wc.custom_name,
    approval_date: wc.approval_date,
    closed_date: wc.closed_date,
    closed_reason: wc.closed_reason,
  }));

  async function addToWallet(cardId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
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
      .eq("user_id", userId)
      .eq("card_id", cardId);
    
    // If this is a duplicate, set a custom name like "Card Name 2"
    const customName = (existingCount && existingCount > 0 && card?.name) 
      ? `${card.name} ${existingCount + 1}` 
      : null;
    
    // Add card to wallet and get the new wallet entry ID
    const { data: newWalletEntry } = await supabase.from("user_wallets").insert({
      user_id: userId,
      card_id: cardId,
      custom_name: customName,
    }).select("id").single();
    
    // If card has a default perks value, set it for this wallet instance
    if (newWalletEntry && card?.default_perks_value && card.default_perks_value > 0) {
      await supabase.from("user_card_perks_values").upsert(
        {
          user_id: userId,
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
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", userId);
    revalidatePath("/wallet");
  }

  async function updateCustomName(walletId: string, customName: string | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_wallets")
      .update({ custom_name: customName })
      .eq("id", walletId)
      .eq("user_id", userId);
    revalidatePath("/wallet");
  }

  async function updateApprovalDate(walletId: string, date: string | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    // Update the approval date
    await supabase
      .from("user_wallets")
      .update({ approval_date: date })
      .eq("id", walletId)
      .eq("user_id", userId);

    // Recalculate credit periods for cardmember_year credits on this wallet
    if (date) {
      // Get all usage records for this wallet with cardmember_year credits
      const { data: usageRecords } = await supabase
        .from("user_credit_usage")
        .select(`
          id,
          used_at,
          card_credits:credit_id (
            reset_cycle,
            reset_day_of_month
          )
        `)
        .eq("user_wallet_id", walletId);

      if (usageRecords && usageRecords.length > 0) {
        for (const usage of usageRecords) {
          const credit = usage.card_credits as unknown as { 
            reset_cycle: string; 
            reset_day_of_month: number | null 
          };
          
          if (credit?.reset_cycle === "cardmember_year") {
            // Recalculate the period based on the new approval date
            const usedAtDate = usage.used_at.split("T")[0];
            const { periodStart, periodEnd } = calculateCreditPeriod(
              usedAtDate,
              "cardmember_year",
              date,
              credit.reset_day_of_month
            );

            // Update the period
            await supabase
              .from("user_credit_usage")
              .update({
                period_start: periodStart.toISOString().split("T")[0],
                period_end: periodEnd.toISOString().split("T")[0],
              })
              .eq("id", usage.id);
          }
        }
      }
    }

    revalidatePath("/wallet");
    revalidatePath("/credits");
  }

  async function updatePlayerNumber(walletId: string, playerNumber: number) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_wallets")
      .update({ player_number: playerNumber })
      .eq("id", walletId)
      .eq("user_id", userId);
    revalidatePath("/wallet");
    revalidatePath("/application-rules");
  }

  async function updatePerksValue(walletCardId: string, perksValue: number) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_card_perks_values").upsert(
      {
        user_id: userId,
        wallet_card_id: walletCardId,
        perks_value: perksValue,
      },
      { onConflict: "user_id,wallet_card_id" }
    );
    revalidatePath("/wallet");
  }

  async function enableDebitPay() {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_feature_flags").upsert(
      {
        user_id: userId,
        debit_pay_enabled: true,
      },
      { onConflict: "user_id" }
    );
    revalidatePath("/wallet");
  }

  async function updateDebitPay(walletCardId: string, percent: number) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_card_debit_pay").upsert(
      {
        user_id: userId,
        wallet_card_id: walletCardId,
        debit_pay_percent: percent,
      },
      { onConflict: "user_id,wallet_card_id" }
    );
    revalidatePath("/wallet");
  }

  async function updateStatementFields(walletId: string, fields: {
    statement_close_day: number | null;
    payment_due_day: number | null;
    manual_balance_cents: number | null;
    manual_credit_limit_cents: number | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[updateStatementFields] No user ID");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_wallets")
      .update(fields)
      .eq("id", walletId)
      .eq("user_id", userId);
    
    if (error) {
      console.error("[updateStatementFields] Error:", error);
      throw new Error(`Failed to update statement fields: ${error.message}`);
    }
    
    revalidatePath("/wallet");
  }

  async function updatePaymentSettings(walletCardId: string, settings: {
    pay_from_account_id: string | null;
    is_autopay: boolean;
    autopay_type: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[updatePaymentSettings] No user ID");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_card_payment_settings")
      .upsert({
        user_id: userId,
        wallet_card_id: walletCardId,
        pay_from_account_id: settings.pay_from_account_id,
        is_autopay: settings.is_autopay,
        autopay_type: settings.autopay_type,
      }, { onConflict: "wallet_card_id" });
    
    if (error) {
      console.error("[updatePaymentSettings] Error:", error);
      throw new Error(`Failed to update payment settings: ${error.message}`);
    }
    
    revalidatePath("/wallet");
  }

  async function updateAnnualFeeOverride(walletId: string, feeOverride: number | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[updateAnnualFeeOverride] No user ID");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_wallets")
      .update({ annual_fee_override: feeOverride })
      .eq("id", walletId)
      .eq("user_id", userId);
    
    if (error) {
      console.error("[updateAnnualFeeOverride] Error:", error);
      throw new Error(`Failed to update annual fee override: ${error.message}`);
    }
    
    revalidatePath("/wallet");
  }

  async function updateNotes(walletId: string, notes: string | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[updateNotes] No user ID");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_wallets")
      .update({ notes })
      .eq("id", walletId)
      .eq("user_id", userId);
    
    if (error) {
      console.error("[updateNotes] Error:", error);
      throw new Error(`Failed to update notes: ${error.message}`);
    }
    
    revalidatePath("/wallet");
  }

  async function updateNetworkOverride(walletId: string, network: "visa" | "mastercard" | "amex" | "discover" | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[updateNetworkOverride] No user ID");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_wallets")
      .update({ network_override: network })
      .eq("id", walletId)
      .eq("user_id", userId);
    
    if (error) {
      console.error("[updateNetworkOverride] Error:", error);
      throw new Error(`Failed to update network override: ${error.message}`);
    }
    
    revalidatePath("/wallet");
  }

  async function submitNewCard(data: {
    name: string;
    issuer_id: string;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    product_type: "personal" | "business";
    card_charge_type: "credit" | "charge" | "debit";
    annual_fee: number;
    default_earn_rate: number;
    no_foreign_transaction_fees: boolean;
    network: "visa" | "mastercard" | "amex" | "discover" | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[submitNewCard] No user ID");
      throw new Error("Not authenticated");
    }

    const supabase = createClient();
    
    // Generate a slug from the name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now().toString(36);

    // Insert the card with created_by_user_id set
    const { data: newCard, error: insertError } = await supabase
      .from("cards")
      .insert({
        name: data.name,
        slug,
        issuer_id: data.issuer_id,
        primary_currency_id: data.primary_currency_id,
        secondary_currency_id: data.secondary_currency_id,
        product_type: data.product_type,
        card_charge_type: data.card_charge_type,
        annual_fee: data.annual_fee,
        default_earn_rate: data.default_earn_rate,
        no_foreign_transaction_fees: data.no_foreign_transaction_fees,
        network: data.network,
        created_by_user_id: userId,
        is_approved: false, // Not approved by default
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError || !newCard) {
      console.error("[submitNewCard] Insert error:", insertError);
      throw new Error(`Failed to create card: ${insertError?.message ?? "Unknown error"}`);
    }

    // Also add to user's wallet
    const { error: walletError } = await supabase
      .from("user_wallets")
      .insert({
        user_id: userId,
        card_id: newCard.id,
        added_at: new Date().toISOString(),
      });

    if (walletError) {
      console.error("[submitNewCard] Wallet insert error:", walletError);
      // Card was created, but couldn't add to wallet - don't throw
    }

    invalidateCardCaches();
    revalidatePath("/wallet");
  }

  async function selectCategory(capId: string, categoryId: number, walletCardId?: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    // Handle NULL wallet_card_id separately since PostgreSQL treats NULLs as distinct in unique constraints
    if (walletCardId) {
      // With a specific wallet_card_id, upsert works correctly
      await supabase.from("user_card_selections").upsert(
        {
          user_id: userId,
          cap_id: capId,
          selected_category_id: categoryId,
          wallet_card_id: walletCardId,
        },
        { onConflict: "user_id,cap_id,wallet_card_id" }
      );
    } else {
      // For NULL wallet_card_id, manually check and update/insert
      const { data: existing } = await supabase
        .from("user_card_selections")
        .select("id")
        .eq("user_id", userId)
        .eq("cap_id", capId)
        .is("wallet_card_id", null)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_card_selections")
          .update({ selected_category_id: categoryId })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_card_selections").insert({
          user_id: userId,
          cap_id: capId,
          selected_category_id: categoryId,
          wallet_card_id: null,
        });
      }
    }
    
    revalidatePath("/wallet");
    revalidatePath("/settings");
  }

  async function saveBiltSettings(
    walletCardId: string,
    biltOption: number,
    housingTier: string,
    monthlyBiltSpendCents: number | null
  ) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_bilt_settings")
      .upsert(
        {
          user_id: userId,
          wallet_card_id: walletCardId,
          bilt_option: biltOption,
          housing_tier: housingTier,
          monthly_bilt_spend_cents: monthlyBiltSpendCents,
        },
        { onConflict: "user_id,wallet_card_id" }
      );

    revalidatePath("/wallet");
    revalidatePath("/spend-optimizer");
    revalidatePath("/compare");
    revalidatePath("/dashboard");
  }

  async function updateBonusDisplaySettings(includeWelcomeBonuses: boolean, includeSpendBonuses: boolean) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_bonus_display_settings").upsert(
      {
        user_id: userId,
        include_welcome_bonuses: includeWelcomeBonuses,
        include_spend_bonuses: includeSpendBonuses,
      },
      { onConflict: "user_id" }
    );
    revalidatePath("/wallet");
  }

  // User-defined Welcome Bonus CRUD
  async function addUserWelcomeBonusForCard(walletCardId: string, formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    const componentType = formData.get("component_type") as string;
    
    await supabase.from("user_welcome_bonuses").insert({
      user_id: userId,
      wallet_card_id: walletCardId,
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
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
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
    }).eq("id", bonusId).eq("user_id", userId);
    revalidatePath("/wallet");
  }

  async function deleteUserWelcomeBonus(bonusId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_welcome_bonuses").delete().eq("id", bonusId).eq("user_id", userId);
    revalidatePath("/wallet");
  }

  async function toggleUserWelcomeBonusActive(bonusId: string, isActive: boolean) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_welcome_bonuses").update({ is_active: isActive }).eq("id", bonusId).eq("user_id", userId);
    revalidatePath("/wallet");
  }

  // User-defined Spend Bonus CRUD
  async function addUserSpendBonusForCard(walletCardId: string, formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    const bonusType = formData.get("bonus_type") as string;
    const rewardType = formData.get("reward_type") as string;
    
    if (bonusType === "threshold") {
      await supabase.from("user_spend_bonuses").insert({
        user_id: userId,
        wallet_card_id: walletCardId,
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
        user_id: userId,
        wallet_card_id: walletCardId,
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
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
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
      }).eq("id", bonusId).eq("user_id", userId);
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
      }).eq("id", bonusId).eq("user_id", userId);
    }
    revalidatePath("/wallet");
  }

  async function deleteUserSpendBonus(bonusId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_spend_bonuses").delete().eq("id", bonusId).eq("user_id", userId);
    revalidatePath("/wallet");
  }

  async function toggleUserSpendBonusActive(bonusId: string, isActive: boolean) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase.from("user_spend_bonuses").update({ is_active: isActive }).eq("id", bonusId).eq("user_id", userId);
    revalidatePath("/wallet");
  }

  async function productChangeCard(data: {
    currentWalletId: string;
    newCardId: string;
    effectiveDate: string;
    customName: string | null;
    reactivateWalletId: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    // Get current wallet card details (include all account-level settings to transfer)
    const { data: currentWallet } = await supabase
      .from("user_wallets")
      .select("id, player_number, approval_date, statement_close_day, payment_due_day")
      .eq("id", data.currentWalletId)
      .eq("user_id", userId)
      .single();
    
    if (!currentWallet) return;

    let newWalletId: string;

    if (data.reactivateWalletId) {
      // Reactivating an existing closed card
      // Clear the closed fields to reactivate
      const { error: reactivateError } = await supabase
        .from("user_wallets")
        .update({
          closed_date: null,
          closed_reason: null,
          product_changed_to_id: null,
        })
        .eq("id", data.reactivateWalletId)
        .eq("user_id", userId);
      
      if (reactivateError) {
        console.error("Error reactivating card:", reactivateError);
        return;
      }
      
      newWalletId = data.reactivateWalletId;
    } else {
      // Create new wallet entry
      const { data: newWallet, error: createError } = await supabase
        .from("user_wallets")
        .insert({
          user_id: userId,
          card_id: data.newCardId,
          custom_name: data.customName,
          player_number: currentWallet.player_number,
          // Product change preserves the original account opened date
          approval_date: currentWallet.approval_date,
          // Transfer statement/payment day settings from old card (these are account-level settings)
          statement_close_day: currentWallet.statement_close_day,
          payment_due_day: currentWallet.payment_due_day,
        })
        .select("id")
        .single();
      
      if (createError || !newWallet) {
        console.error("Error creating new wallet entry:", createError);
        return;
      }
      
      newWalletId = newWallet.id;
      
      // Copy perks value from old card if it exists
      const { data: oldPerks } = await supabase
        .from("user_card_perks_values")
        .select("perks_value")
        .eq("wallet_card_id", data.currentWalletId)
        .eq("user_id", userId)
        .single();
      
      if (oldPerks) {
        await supabase.from("user_card_perks_values").insert({
          user_id: userId,
          wallet_card_id: newWalletId,
          perks_value: oldPerks.perks_value,
        });
      }
      
      // Copy debit pay if exists
      const { data: oldDebitPay } = await supabase
        .from("user_card_debit_pay")
        .select("debit_pay_percent")
        .eq("wallet_card_id", data.currentWalletId)
        .eq("user_id", userId)
        .single();
      
      if (oldDebitPay) {
        await supabase.from("user_card_debit_pay").insert({
          user_id: userId,
          wallet_card_id: newWalletId,
          debit_pay_percent: oldDebitPay.debit_pay_percent,
        });
      }
    }

    // Archive the current card
    await supabase
      .from("user_wallets")
      .update({
        closed_date: data.effectiveDate,
        closed_reason: "product_change",
        product_changed_to_id: newWalletId,
      })
      .eq("id", data.currentWalletId)
      .eq("user_id", userId);

    // Transfer Plaid linked account to new wallet
    await supabase
      .from("user_linked_accounts")
      .update({ wallet_card_id: newWalletId })
      .eq("wallet_card_id", data.currentWalletId)
      .eq("user_id", userId);

    revalidatePath("/wallet");
    revalidatePath("/credits");
  }

  async function closeCard(walletId: string, closedDate: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    await supabase
      .from("user_wallets")
      .update({
        closed_date: closedDate,
        closed_reason: "closed",
      })
      .eq("id", walletId)
      .eq("user_id", userId);

    revalidatePath("/wallet");
    revalidatePath("/credits");
  }

  async function deleteCard(walletId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    // Delete related records first
    await supabase
      .from("user_credit_usage")
      .delete()
      .eq("user_wallet_id", walletId);
    
    await supabase
      .from("user_credit_settings")
      .delete()
      .eq("user_wallet_id", walletId);
    
    await supabase
      .from("user_card_perks_values")
      .delete()
      .eq("wallet_card_id", walletId)
      .eq("user_id", userId);
    
    await supabase
      .from("user_card_debit_pay")
      .delete()
      .eq("wallet_card_id", walletId)
      .eq("user_id", userId);
    
    await supabase
      .from("user_welcome_bonuses")
      .delete()
      .eq("wallet_card_id", walletId)
      .eq("user_id", userId);
    
    await supabase
      .from("user_spend_bonuses")
      .delete()
      .eq("wallet_card_id", walletId)
      .eq("user_id", userId);
    
    // Unlink Plaid account (but don't delete the connection)
    await supabase
      .from("user_linked_accounts")
      .update({ wallet_card_id: null })
      .eq("wallet_card_id", walletId)
      .eq("user_id", userId);
    
    // Finally delete the wallet entry
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", userId);

    revalidatePath("/wallet");
    revalidatePath("/credits");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Bank account server actions
  async function deleteBankAccount(accountId: string) {
    "use server";
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    // Get the plaid_item_id before deleting
    const { data: account } = await supabase
      .from("user_bank_accounts")
      .select("plaid_item_id, is_manual")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (!account) return;

    // Delete the bank account
    await supabase
      .from("user_bank_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);

    // If this was a Plaid-linked account, check if we need to clean up the Plaid item
    if (!account.is_manual && account.plaid_item_id) {
      // Check if there are any other accounts from this Plaid item
      const { count } = await supabase
        .from("user_bank_accounts")
        .select("id", { count: "exact", head: true })
        .eq("plaid_item_id", account.plaid_item_id);

      // If no more accounts from this item, delete the Plaid item too
      if (count === 0) {
        await supabase
          .from("user_plaid_items")
          .delete()
          .eq("id", account.plaid_item_id);
      }
    }

    revalidatePath("/wallet");
  }

  async function setBankAccountPrimary(accountId: string) {
    "use server";
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    await supabase
      .from("user_bank_accounts")
      .update({ is_primary: true })
      .eq("id", accountId)
      .eq("user_id", userId);

    revalidatePath("/wallet");
  }

  async function updateBankAccountDisplayName(accountId: string, displayName: string | null) {
    "use server";
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    await supabase
      .from("user_bank_accounts")
      .update({ display_name: displayName })
      .eq("id", accountId)
      .eq("user_id", userId);

    revalidatePath("/wallet");
  }

  // Bank accounts data
  const bankAccounts = (bankAccountsResult.data ?? []) as {
    id: string;
    name: string;
    official_name: string | null;
    display_name: string | null;
    type: string;
    subtype: string | null;
    mask: string | null;
    institution_name: string | null;
    current_balance: number | null;
    available_balance: number | null;
    iso_currency_code: string | null;
    last_balance_update: string | null;
    is_primary: boolean | null;
    is_manual: boolean;
  }[];

  // Payment settings data and map
  type PaymentSettings = {
    wallet_card_id: string;
    pay_from_account_id: string | null;
    is_autopay: boolean;
    autopay_type: string | null;
  };
  const paymentSettingsData = (paymentSettingsResult.data ?? []) as PaymentSettings[];
  const paymentSettingsMap = new Map<string, { pay_from_account_id: string | null; is_autopay: boolean; autopay_type: string | null }>();
  paymentSettingsData.forEach(ps => {
    paymentSettingsMap.set(ps.wallet_card_id, {
      pay_from_account_id: ps.pay_from_account_id,
      is_autopay: ps.is_autopay,
      autopay_type: ps.autopay_type,
    });
  });

  // Bank accounts for card settings (simplified type for the modal)
  const bankAccountsForSettings = bankAccounts.map(ba => ({
    id: ba.id,
    name: ba.name,
    display_name: ba.display_name,
    institution_name: ba.institution_name,
    mask: ba.mask,
    available_balance: ba.available_balance,
    is_primary: ba.is_primary,
  }));

  return (
    <WalletClient>
      <div className="min-h-screen bg-zinc-950">
        <UserHeader 
          isAdmin={isAdmin} 
          emulationInfo={emulationInfo}
        />
        <div className="mx-auto max-w-[1600px] px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">My Wallet</h1>
            </div>
            <div className="flex items-center gap-3">
              <RefreshBalancesButton hasLinkedAccounts={!!(linkedAccountsResult.data && linkedAccountsResult.data.length > 0)} />
              <AddCardModal
                availableCards={availableCardsForModal.map(c => ({
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  annual_fee: c.annual_fee,
                  issuer_name: c.issuers?.name,
                  primary_currency_name: c.primary_currency?.name,
                  search_aliases: c.search_aliases,
                }))}
                onAddCard={addToWallet}
                debitPayEnabled={debitPayEnabled}
                onEnableDebitPay={enableDebitPay}
                ownedCardIds={userCardIds}
                issuers={issuersData.map(i => ({ id: i.id, name: i.name }))}
                currencies={currenciesData.map(c => ({ id: c.id, name: c.name }))}
                onSubmitNewCard={submitNewCard}
              />
            </div>
          </div>

          {walletCards.length > 0 ? (
            <WalletCardTable
              walletCards={walletCards}
              enabledSecondaryCards={enabledSecondaryCards}
              perksMap={perksMapByWalletId}
              debitPayMap={debitPayMapByWalletId}
              debitPayEnabled={debitPayEnabled}
              accountLinkingEnabled={accountLinkingEnabled}
              players={players}
              playerCount={playerCount}
              earningRulesPerCard={earningRulesPerCard}
              categoryBonusesPerCard={categoryBonusesPerCard}
              creditsPerCard={creditsPerCard}
              linkedAccountsMap={linkedAccountsMap}
              statementEstimatesMap={statementEstimatesMap}
              allCardsForProductChange={allCardsForProductChange}
              closedCardsForReactivation={closedCardsForReactivation}
              onRemove={removeFromWallet}
              onUpdatePerks={updatePerksValue}
              onUpdateDebitPay={updateDebitPay}
              onUpdateCustomName={updateCustomName}
              onUpdateApprovalDate={updateApprovalDate}
              onUpdatePlayerNumber={updatePlayerNumber}
              onUpdateStatementFields={updateStatementFields}
              onUpdateAnnualFeeOverride={updateAnnualFeeOverride}
              onUpdateNotes={updateNotes}
              onUpdateNetworkOverride={updateNetworkOverride}
              bankAccounts={bankAccountsForSettings}
              paymentSettingsMap={paymentSettingsMap}
              onUpdatePaymentSettings={updatePaymentSettings}
              onProductChange={productChangeCard}
              onCloseCard={closeCard}
              onDeleteCard={deleteCard}
              categorySelectionCapsMap={categorySelectionCapsMap}
              categorySelections={userCategorySelections}
              onSelectCategory={selectCategory}
              currencies={currenciesData.map(c => ({ id: c.id, name: c.name, code: c.code, currency_type: c.currency_type }))}
              welcomeBonusesMap={welcomeBonusesMap}
              spendBonusesMap={spendBonusesMap}
              onToggleWelcomeBonusActive={toggleUserWelcomeBonusActive}
              onToggleSpendBonusActive={toggleUserSpendBonusActive}
              onAddWelcomeBonus={addUserWelcomeBonusForCard}
              onUpdateWelcomeBonus={updateUserWelcomeBonus}
              onDeleteWelcomeBonus={deleteUserWelcomeBonus}
              onAddSpendBonus={addUserSpendBonusForCard}
              onUpdateSpendBonus={updateUserSpendBonus}
              onDeleteSpendBonus={deleteUserSpendBonus}
              biltSettingsMap={biltSettingsMap}
              onSaveBiltSettings={saveBiltSettings}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
              <p className="text-zinc-400 mb-4">Your wallet is empty.</p>
              <p className="text-zinc-500 text-sm">
                Add cards to track your rewards and see which currencies are active.
              </p>
            </div>
          )}

          {/* Closed Cards Section */}
          <ClosedCardsSection
            closedCards={closedCardsForDisplay}
            playerCount={playerCount}
          />

        </div>
      </div>
    </WalletClient>
  );
}
