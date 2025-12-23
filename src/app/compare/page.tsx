import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { ComparisonTable } from "./comparison-table";
import { isAdminEmail } from "@/lib/admin";

async function saveCompareCategories(categoryIds: number[]) {
  "use server";
  const user = await currentUser();
  if (!user) return;
  
  const supabase = await createClient();
  
  // Delete existing
  await supabase
    .from("user_compare_categories")
    .delete()
    .eq("user_id", user.id);
  
  // Insert new
  if (categoryIds.length > 0) {
    await supabase
      .from("user_compare_categories")
      .insert(categoryIds.map((id) => ({ user_id: user.id, category_id: id })));
  }
}

async function saveCompareEvalCards(cardIds: string[]) {
  "use server";
  const user = await currentUser();
  if (!user) return;
  
  const supabase = await createClient();
  
  // Delete existing
  await supabase
    .from("user_compare_evaluation_cards")
    .delete()
    .eq("user_id", user.id);
  
  // Insert new
  if (cardIds.length > 0) {
    await supabase
      .from("user_compare_evaluation_cards")
      .insert(cardIds.map((id) => ({ user_id: user.id, card_id: id })));
  }
}

async function updateBonusDisplaySettings(includeWelcomeBonuses: boolean, includeSpendBonuses: boolean, showAvailableCredit: boolean) {
  "use server";
  const user = await currentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("user_bonus_display_settings").upsert(
    {
      user_id: user.id,
      include_welcome_bonuses: includeWelcomeBonuses,
      include_spend_bonuses: includeSpendBonuses,
      show_available_credit: showAvailableCredit,
    },
    { onConflict: "user_id" }
  );
  revalidatePath("/compare");
}

export default async function ComparePage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get all active cards with their details
  const { data: allCards } = await supabase
    .from("cards")
    .select(`
      id,
      name,
      slug,
      annual_fee,
      default_earn_rate,
      primary_currency_id,
      issuers:issuer_id (id, name),
      primary_currency:reward_currencies!cards_primary_currency_id_fkey (
        id, name, code, base_value_cents, currency_type
      )
    `)
    .eq("is_active", true)
    .order("name");

  // Get all earning rules
  const { data: allEarningRules } = await supabase
    .from("card_earning_rules")
    .select("card_id, category_id, rate, booking_method, has_cap, cap_amount, cap_period, post_cap_rate");

  // Get all category bonuses (card_caps) with their categories
  const { data: allCategoryBonuses } = await supabase
    .from("card_caps")
    .select(`
      id,
      card_id,
      cap_type,
      elevated_rate,
      post_cap_rate,
      cap_amount,
      cap_period,
      card_cap_categories (category_id)
    `);

  // Get user's wallet cards with custom names
  const { data: userWallet } = await supabase
    .from("user_wallets")
    .select("id, card_id, custom_name")
    .eq("user_id", user.id);

  const userCardIds = new Set(userWallet?.map((w) => w.card_id) ?? []);
  
  // Build a map of card_id to wallet entries for multi-instance support
  const walletEntriesByCardId = new Map<string, { walletId: string; customName: string | null }[]>();
  for (const entry of userWallet ?? []) {
    const existing = walletEntriesByCardId.get(entry.card_id) ?? [];
    existing.push({ walletId: entry.id, customName: entry.custom_name });
    walletEntriesByCardId.set(entry.card_id, existing);
  }

  // Get user's custom currency values and template values
  const [
    { data: userCurrencyValues },
    { data: userPointSettings },
    { data: defaultTemplate },
  ] = await Promise.all([
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", user.id),
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("point_value_templates")
      .select("id")
      .eq("is_default", true)
      .single(),
  ]);

  // Get the user's selected template (or default)
  const selectedTemplateId = userPointSettings?.selected_template_id ?? defaultTemplate?.id;
  
  // Fetch template values if a template is selected
  let templateValuesByCurrency = new Map<string, number>();
  if (selectedTemplateId) {
    const { data: templateValues } = await supabase
      .from("template_currency_values")
      .select("currency_id, value_cents")
      .eq("template_id", selectedTemplateId);
    
    templateValuesByCurrency = new Map(
      templateValues?.map((v) => [v.currency_id, parseFloat(String(v.value_cents))]) ?? []
    );
  }

  // User overrides take precedence over template values
  const userValuesByCurrency = new Map(
    userCurrencyValues?.map((v) => [v.currency_id, v.value_cents]) ?? []
  );

  // Get user's debit pay values and feature flags
  const [{ data: featureFlags }, { data: debitPayValues }, { data: linkedAccountsData }] = await Promise.all([
    supabase.from("user_feature_flags").select("debit_pay_enabled, account_linking_enabled").eq("user_id", user.id).single(),
    supabase.from("user_card_debit_pay").select("card_id, debit_pay_percent").eq("user_id", user.id),
    supabase.from("user_linked_accounts").select("wallet_card_id, available_balance, current_balance, credit_limit, manual_credit_limit").eq("user_id", user.id).not("wallet_card_id", "is", null),
  ]);

  const debitPayMap: Record<string, number> = {};
  if (featureFlags?.debit_pay_enabled) {
    for (const dp of debitPayValues ?? []) {
      debitPayMap[dp.card_id] = Number(dp.debit_pay_percent) || 0;
    }
  }

  // Build available credit map: cardId -> available_balance (only for linked & paired cards)
  // If manual_credit_limit is set, calculate available credit from that
  const accountLinkingEnabled = featureFlags?.account_linking_enabled ?? false;
  const availableCreditMap: Record<string, number> = {};
  if (accountLinkingEnabled) {
    for (const account of linkedAccountsData ?? []) {
      if (!account.wallet_card_id) continue;
      
      // Priority: Use manual_credit_limit if set, then fall back to Plaid data
      const effectiveLimit = account.manual_credit_limit ?? account.credit_limit;
      const currentBalance = account.current_balance;
      
      let availableCredit: number | null = null;
      if (effectiveLimit != null && currentBalance != null) {
        // Calculate available credit from limit - balance
        availableCredit = Number(effectiveLimit) - Number(currentBalance);
      } else if (account.available_balance != null) {
        // Fall back to Plaid's available_balance
        availableCredit = Number(account.available_balance);
      }
      
      if (availableCredit != null) {
        availableCreditMap[account.wallet_card_id] = availableCredit;
      }
    }
  }

  // Get multiplier programs, spend bonuses, and bonus display settings
  const [
    { data: multiplierProgramsData },
    { data: userMultiplierTiers },
    { data: spendBonusesData },
    { data: userSpendBonusValuesData },
    { data: welcomeBonusesData },
    { data: userWelcomeBonusSettings },
    { data: bonusDisplaySettingsData },
  ] = await Promise.all([
    supabase
      .from("earning_multiplier_programs")
      .select(`
        id,
        name,
        earning_multiplier_tiers (id, name, multiplier),
        earning_multiplier_currencies (currency_id),
        earning_multiplier_cards (card_id)
      `),
    supabase
      .from("user_multiplier_tiers")
      .select("program_id, tier_id")
      .eq("user_id", user.id),
    supabase
      .from("card_spend_bonuses")
      .select("id, card_id, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, default_value_cents, period, per_spend_cents, elite_unit_name, default_unit_value_cents, cap_amount, cap_period"),
    supabase
      .from("user_spend_bonus_values")
      .select("spend_bonus_id, value_cents")
      .eq("user_id", user.id),
    supabase
      .from("card_welcome_bonuses")
      .select("id, card_id, spend_requirement_cents, time_period_months, component_type, points_amount, currency_id, cash_amount_cents, benefit_description, default_benefit_value_cents"),
    supabase
      .from("user_welcome_bonus_settings")
      .select("card_id, is_active, spend_requirement_override, time_period_override")
      .eq("user_id", user.id),
    supabase
      .from("user_bonus_display_settings")
      .select("include_welcome_bonuses, include_spend_bonuses, show_available_credit")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Build multiplier map: cardId -> multiplier
  const cardMultipliers: Record<string, number> = {};
  const userTierMap = new Map<string, string>();
  (userMultiplierTiers ?? []).forEach((t) => {
    if (t.program_id && t.tier_id) {
      userTierMap.set(t.program_id, t.tier_id);
    }
  });

  type MultiplierProgramData = {
    id: string;
    name: string;
    earning_multiplier_tiers: { id: string; name: string; multiplier: number }[] | null;
    earning_multiplier_currencies: { currency_id: string }[] | null;
    earning_multiplier_cards: { card_id: string }[] | null;
  };

  for (const program of (multiplierProgramsData ?? []) as unknown as MultiplierProgramData[]) {
    const selectedTierId = userTierMap.get(program.id);
    if (!selectedTierId) continue;
    
    const selectedTier = program.earning_multiplier_tiers?.find((t) => t.id === selectedTierId);
    if (!selectedTier) continue;
    
    const applicableCurrencyIds = (program.earning_multiplier_currencies ?? []).map((c) => c.currency_id);
    const applicableCardIds = (program.earning_multiplier_cards ?? []).map((c) => c.card_id);
    
    // Apply to cards based on currency or direct card link
    for (const card of (allCards ?? [])) {
      const currencyId = card.primary_currency_id;
      const isEligible = 
        applicableCardIds.includes(card.id) ||
        (currencyId && applicableCurrencyIds.includes(currencyId));
      
      if (isEligible) {
        const existing = cardMultipliers[card.id] ?? 1;
        cardMultipliers[card.id] = Math.max(existing, selectedTier.multiplier);
      }
    }
  }

  // Calculate spend bonus rates per card
  const spendBonusValues = new Map<string, number>();
  (userSpendBonusValuesData ?? []).forEach((v) => {
    spendBonusValues.set(v.spend_bonus_id, parseFloat(String(v.value_cents)));
  });

  const cardSpendBonusRates: Record<string, number> = {};
  for (const sb of (spendBonusesData ?? [])) {
    let bonusRate = 0;
    
    if (sb.bonus_type === "threshold" && sb.spend_threshold_cents) {
      // Threshold: reward_value / spend_threshold
      let rewardValue = 0;
      
      if (sb.reward_type === "points" && sb.points_amount && sb.currency_id) {
        const currencyValue = userValuesByCurrency.get(sb.currency_id) 
          ?? templateValuesByCurrency.get(sb.currency_id) 
          ?? 1;
        rewardValue = (sb.points_amount * currencyValue) / 100;
      } else if (sb.reward_type === "cash" && sb.cash_amount_cents) {
        rewardValue = sb.cash_amount_cents / 100;
      } else if (sb.reward_type === "benefit") {
        const valueCents = spendBonusValues.get(sb.id) ?? sb.default_value_cents ?? 0;
        rewardValue = valueCents / 100;
      }
      
      bonusRate = rewardValue / (sb.spend_threshold_cents / 100);
    } else if (sb.bonus_type === "elite_earning" && sb.per_spend_cents) {
      // Elite earning: unit_value / per_spend
      const unitValueCents = spendBonusValues.get(sb.id) ?? sb.default_unit_value_cents ?? 0;
      bonusRate = (unitValueCents / 100) / (sb.per_spend_cents / 100);
    }
    
    if (bonusRate > 0) {
      cardSpendBonusRates[sb.card_id] = (cardSpendBonusRates[sb.card_id] ?? 0) + bonusRate;
    }
  }

  // Calculate welcome bonus rates per card (for active bonuses)
  const welcomeBonusSettings = new Map<string, { is_active: boolean; spend_requirement_override: number | null; time_period_override: number | null }>();
  (userWelcomeBonusSettings ?? []).forEach((s) => {
    welcomeBonusSettings.set(s.card_id, {
      is_active: s.is_active,
      spend_requirement_override: s.spend_requirement_override,
      time_period_override: s.time_period_override,
    });
  });

  const cardWelcomeBonusRates: Record<string, number> = {};
  for (const wb of (welcomeBonusesData ?? [])) {
    const settings = welcomeBonusSettings.get(wb.card_id);
    if (!settings?.is_active) continue;
    
    // Calculate bonus value
    let bonusValue = 0;
    if (wb.component_type === "points" && wb.points_amount && wb.currency_id) {
      const currencyValue = userValuesByCurrency.get(wb.currency_id) 
        ?? templateValuesByCurrency.get(wb.currency_id) 
        ?? 1;
      bonusValue = (wb.points_amount * currencyValue) / 100;
    } else if (wb.component_type === "cash" && wb.cash_amount_cents) {
      bonusValue = wb.cash_amount_cents / 100;
    } else if (wb.component_type === "benefit" && wb.default_benefit_value_cents) {
      bonusValue = wb.default_benefit_value_cents / 100;
    }
    
    // Calculate spend requirement
    const spendRequirement = (settings.spend_requirement_override ?? wb.spend_requirement_cents) / 100;
    
    if (spendRequirement > 0) {
      const bonusRate = bonusValue / spendRequirement;
      cardWelcomeBonusRates[wb.card_id] = (cardWelcomeBonusRates[wb.card_id] ?? 0) + bonusRate;
    }
  }

  // Bonus display settings
  const bonusDisplaySettings = {
    includeWelcomeBonuses: bonusDisplaySettingsData?.include_welcome_bonuses ?? false,
    includeSpendBonuses: bonusDisplaySettingsData?.include_spend_bonuses ?? false,
    showAvailableCredit: bonusDisplaySettingsData?.show_available_credit ?? false,
  };

  // Get user's category spending and spending defaults
  const [
    { data: userSpendingData }, 
    { data: spendingDefaults },
    { data: userLargePurchaseSpending },
    { data: userMobilePayCategories },
    { data: mobilePayCategory },
    { data: over5kCategory },
  ] = await Promise.all([
    supabase
      .from("user_category_spend")
      .select("category_id, annual_spend_cents")
      .eq("user_id", user.id),
    supabase
      .from("spending_defaults")
      .select("category_id, annual_spend_cents"),
    // Get large purchase spending amounts
    supabase
      .from("user_category_spend")
      .select("category_id, large_purchase_spend_cents")
      .eq("user_id", user.id)
      .not("large_purchase_spend_cents", "is", null),
    // Get user's mobile pay category selections
    supabase
      .from("user_mobile_pay_categories")
      .select("category_id")
      .eq("user_id", user.id),
    // Get mobile pay category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "mobile-pay")
      .single(),
    // Get >5k category ID
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "over-5k")
      .single(),
  ]);

  // Build spending map: user values override defaults
  const userSpending: Record<number, number> = {};
  // First, populate with defaults
  for (const def of spendingDefaults ?? []) {
    userSpending[def.category_id] = def.annual_spend_cents;
  }
  // Then override with user-specific values
  for (const spend of userSpendingData ?? []) {
    userSpending[spend.category_id] = spend.annual_spend_cents;
  }

  // Calculate Mobile Pay spending (sum of spending in categories user selected for mobile pay)
  if (mobilePayCategory?.id) {
    const mobilePayCategoryIds = new Set((userMobilePayCategories ?? []).map((c) => c.category_id));
    let mobilePayTotal = 0;
    for (const [catId, spend] of Object.entries(userSpending)) {
      if (mobilePayCategoryIds.has(Number(catId))) {
        mobilePayTotal += spend;
      }
    }
    userSpending[mobilePayCategory.id] = mobilePayTotal;
  }

  // Calculate >$5k spending (sum of all large_purchase_spend_cents)
  if (over5kCategory?.id) {
    let over5kTotal = 0;
    for (const lp of userLargePurchaseSpending ?? []) {
      if (lp.large_purchase_spend_cents) {
        over5kTotal += lp.large_purchase_spend_cents;
      }
    }
    userSpending[over5kCategory.id] = over5kTotal;
  }

  // Get user's saved compare preferences
  const [{ data: savedCategories }, { data: savedEvalCards }] = await Promise.all([
    supabase
      .from("user_compare_categories")
      .select("category_id")
      .eq("user_id", user.id),
    supabase
      .from("user_compare_evaluation_cards")
      .select("card_id")
      .eq("user_id", user.id),
  ]);

  const savedCategoryIds = savedCategories?.map((c) => c.category_id) ?? [];
  const savedEvalCardIds = savedEvalCards?.map((c) => c.card_id) ?? [];

  // Get all categories
  const { data: allCategories } = await supabase
    .from("earning_categories")
    .select("id, name, slug, parent_category_id, excluded_by_default")
    .order("name");

  // Build a map of parent category IDs for inheritance lookup
  const parentCategoryMap = new Map<number, number>();
  for (const cat of allCategories ?? []) {
    if (cat.parent_category_id) {
      parentCategoryMap.set(cat.id, cat.parent_category_id);
    }
  }

  // Build category bonuses map: cardId -> categoryId -> elevated_rate
  // This includes both specific categories and "all_categories" bonuses
  const categoryBonusesMap: Record<string, Record<number, number>> = {};
  const allCategoriesBonusMap: Record<string, number> = {}; // cardId -> rate for all_categories bonuses
  
  type BonusData = {
    id: string;
    card_id: string;
    cap_type: string;
    elevated_rate: number | null;
    post_cap_rate: number | null;
    cap_amount: number | null;
    cap_period: string | null;
    card_cap_categories: { category_id: number }[] | null;
  };
  
  // Build cap info for tooltips: cardId -> categoryId -> cap details
  type CapInfo = {
    capAmount: number | null;
    capPeriod: string | null;
    capType: string;
    postCapRate: number | null;
    elevatedRate: number;
  };
  const capInfoMap: Record<string, Record<number, CapInfo>> = {};
  
  for (const bonus of (allCategoryBonuses ?? []) as unknown as BonusData[]) {
    if (bonus.cap_type === "all_categories") {
      // For all_categories, store the elevated rate (or post_cap_rate if it's a threshold bonus)
      // Use higher of elevated_rate and post_cap_rate for "best possible" display
      const bestRate = Math.max(bonus.elevated_rate ?? 0, bonus.post_cap_rate ?? 0);
      if (bestRate > (allCategoriesBonusMap[bonus.card_id] ?? 0)) {
        allCategoriesBonusMap[bonus.card_id] = bestRate;
      }
    } else {
      // For specific category bonuses, map to each category
      const categoryIds = bonus.card_cap_categories?.map((c: { category_id: number }) => c.category_id) ?? [];
      for (const categoryId of categoryIds) {
        if (!categoryBonusesMap[bonus.card_id]) {
          categoryBonusesMap[bonus.card_id] = {};
        }
        const currentRate = categoryBonusesMap[bonus.card_id][categoryId] ?? 0;
        if ((bonus.elevated_rate ?? 0) > currentRate) {
          categoryBonusesMap[bonus.card_id][categoryId] = bonus.elevated_rate ?? 0;
        }
        
        // Store cap info for this card/category
        if (!capInfoMap[bonus.card_id]) {
          capInfoMap[bonus.card_id] = {};
        }
        capInfoMap[bonus.card_id][categoryId] = {
          capAmount: bonus.cap_amount,
          capPeriod: bonus.cap_period,
          capType: bonus.cap_type,
          postCapRate: bonus.post_cap_rate,
          elevatedRate: bonus.elevated_rate ?? 0,
        };
      }
    }
  }

  // Build earning rules map: cardId -> categoryId -> rate
  // Only uses 'any' (direct) booking method rules
  const earningRulesMap: Record<string, Record<number, number>> = {};
  for (const rule of allEarningRules ?? []) {
    // Only use 'any' (direct) rules for base comparison
    if (rule.booking_method !== "any") continue;
    if (!earningRulesMap[rule.card_id]) {
      earningRulesMap[rule.card_id] = {};
    }
    const currentRate = earningRulesMap[rule.card_id][rule.category_id] ?? 0;
    if (rule.rate > currentRate) {
      earningRulesMap[rule.card_id][rule.category_id] = rule.rate;
    }
  }
  
  // Build earning rule cap info: cardId -> categoryId -> cap details
  // This will be merged with category bonus caps later
  type EarningRuleCapInfo = {
    capAmount: number | null;
    capPeriod: string | null;
    capType: string;
    postCapRate: number | null;
    elevatedRate: number;
  };
  const earningRuleCapInfoMap: Record<string, Record<number, EarningRuleCapInfo>> = {};
  for (const rule of allEarningRules ?? []) {
    if (rule.booking_method !== "any") continue;
    if (rule.has_cap && rule.cap_amount) {
      if (!earningRuleCapInfoMap[rule.card_id]) {
        earningRuleCapInfoMap[rule.card_id] = {};
      }
      earningRuleCapInfoMap[rule.card_id][rule.category_id] = {
        capAmount: rule.cap_amount,
        capPeriod: rule.cap_period,
        capType: "single_category",
        postCapRate: rule.post_cap_rate,
        elevatedRate: rule.rate,
      };
    }
  }
  
  // Merge earning rule caps into capInfoMap (category bonus caps take precedence)
  for (const cardId in earningRuleCapInfoMap) {
    if (!capInfoMap[cardId]) {
      capInfoMap[cardId] = {};
    }
    for (const categoryId in earningRuleCapInfoMap[cardId]) {
      const catId = Number(categoryId);
      // Only add if no category bonus cap exists
      if (!capInfoMap[cardId][catId]) {
        capInfoMap[cardId][catId] = earningRuleCapInfoMap[cardId][catId];
      }
    }
  }

  // Helper: Get the best rate for a card + category using "highest rate wins"
  // Applies multiplier if available
  const getBestRate = (cardId: string, categoryId: number, defaultRate: number): number => {
    const rates: number[] = [defaultRate];
    
    // 1. Check direct earning rule for this category
    const directRule = earningRulesMap[cardId]?.[categoryId];
    if (directRule) rates.push(directRule);
    
    // 2. Check parent category rule (e.g., All Travel for Flights)
    const parentId = parentCategoryMap.get(categoryId);
    if (parentId) {
      const parentRule = earningRulesMap[cardId]?.[parentId];
      if (parentRule) rates.push(parentRule);
    }
    
    // 3. Check category bonuses for this specific category
    const categoryBonus = categoryBonusesMap[cardId]?.[categoryId];
    if (categoryBonus) rates.push(categoryBonus);
    
    // 4. Check "all categories" bonus (applies to all non-excluded categories)
    const allCatBonus = allCategoriesBonusMap[cardId];
    if (allCatBonus) rates.push(allCatBonus);
    
    // Apply multiplier (e.g., BoA Preferred Rewards, Alaska Checking Bonus)
    const baseRate = Math.max(...rates);
    const multiplier = cardMultipliers[cardId] ?? 1;
    return baseRate * multiplier;
  };

  // Get non-excluded category IDs for computing earning rates
  const nonExcludedCategoryIds = (allCategories ?? [])
    .filter((cat) => !cat.excluded_by_default)
    .map((cat) => cat.id);

  // Transform cards for the client component
  // For owned cards with multiple instances, create one row per wallet entry
  type CardData = {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    primary_currency_id: string;
    issuers: { id: string; name: string } | null;
    primary_currency: { id: string; name: string; code: string; base_value_cents: number | null; currency_type: string } | null;
  };
  
  const cardsForTable: {
    id: string;
    cardId: string; // Original card_id for looking up earning rates, etc.
    name: string;
    slug: string;
    annualFee: number;
    defaultEarnRate: number;
    issuerName: string;
    currencyCode: string;
    currencyName: string;
    pointValue: number;
    isOwned: boolean;
    earningRates: Record<number, number>;
    multiplier: number;
    spendBonusRate: number;
    welcomeBonusRate: number;
  }[] = [];
  
  for (const card of (allCards ?? []) as unknown as CardData[]) {
    const currency = card.primary_currency;
    // Priority: user override > template value > base value
    const pointValue = currency?.id 
      ? userValuesByCurrency.get(currency.id) 
        ?? templateValuesByCurrency.get(currency.id) 
        ?? currency.base_value_cents 
        ?? 1
      : 1;

    // Build earning rates using "highest rate wins" logic (with multiplier applied)
    const earningRates: Record<number, number> = {};
    for (const categoryId of nonExcludedCategoryIds) {
      // Pass raw default_earn_rate - getBestRate applies the multiplier
      earningRates[categoryId] = getBestRate(card.id, categoryId, card.default_earn_rate ?? 1);
    }

    const baseCardData = {
      cardId: card.id, // Keep original card_id for lookups
      slug: card.slug,
      annualFee: card.annual_fee,
      defaultEarnRate: (card.default_earn_rate ?? 1) * (cardMultipliers[card.id] ?? 1),
      issuerName: card.issuers?.name ?? "Unknown",
      currencyCode: currency?.code ?? "???",
      currencyName: currency?.name ?? "Unknown",
      pointValue,
      earningRates,
      multiplier: cardMultipliers[card.id] ?? 1,
      spendBonusRate: cardSpendBonusRates[card.id] ?? 0,
      welcomeBonusRate: cardWelcomeBonusRates[card.id] ?? 0,
    };

    const walletEntries = walletEntriesByCardId.get(card.id);
    
    if (walletEntries && walletEntries.length > 0) {
      // Card is owned - create one row per wallet instance
      for (const entry of walletEntries) {
        cardsForTable.push({
          ...baseCardData,
          id: entry.walletId, // Use wallet_id as the unique identifier
          name: entry.customName ?? card.name, // Use custom name if set
          isOwned: true,
        });
      }
    } else {
      // Card is not owned - show once with card_id
      cardsForTable.push({
        ...baseCardData,
        id: card.id,
        name: card.name,
        isOwned: false,
      });
    }
  }

  // Transform categories for the client component
  const categoriesForTable = (allCategories ?? [])
    .filter((cat) => !cat.excluded_by_default)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentCategoryId: cat.parent_category_id,
    }));

  // Default category slugs to show (used only if user has no saved preferences)
  const defaultCategorySlugs = [
    "gas-ev",
    "grocery",
    "dining",
    "all-travel",
    "flights",
    "hotels",
    "streaming",
    "amazon",
    "online-retail",
    "entertainment",
    "everything-else",
  ];

  // Convert saved category IDs to slugs, or use defaults if none saved
  const initialCategorySlugs = savedCategoryIds.length > 0
    ? (allCategories ?? [])
        .filter((cat) => savedCategoryIds.includes(cat.id))
        .map((cat) => cat.slug)
    : defaultCategorySlugs;

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} />
      <div className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Compare Cards</h1>
          <p className="text-zinc-400 mt-1">
            See effective earning rates across all your cards
          </p>
        </div>

        <ComparisonTable
          cards={cardsForTable}
          categories={categoriesForTable}
          defaultCategorySlugs={defaultCategorySlugs}
          initialCategorySlugs={initialCategorySlugs}
          initialEvalCardIds={savedEvalCardIds}
          debitPayValues={debitPayMap}
          userSpending={userSpending}
          capInfo={capInfoMap}
          bonusDisplaySettings={bonusDisplaySettings}
          availableCredit={availableCreditMap}
          accountLinkingEnabled={accountLinkingEnabled}
          onSaveCategories={saveCompareCategories}
          onSaveEvalCards={saveCompareEvalCards}
          onUpdateBonusSettings={updateBonusDisplaySettings}
        />
      </div>
    </div>
  );
}
