/**
 * Portfolio Returns Calculator
 * 
 * Calculates optimal allocation of spending across a user's card portfolio,
 * handling caps and overflow to maximize total return value.
 */

// ============================================================================
// Types
// ============================================================================

export interface CardInput {
  id: string;
  name: string;
  issuer_id: string;
  annual_fee: number;
  default_earn_rate: number;
  primary_currency_id: string;
  secondary_currency_id: string | null;
  primary_currency: {
    id: string;
    name: string;
    code: string;
    currency_type: string;
    base_value_cents: number | null;
  } | null;
  secondary_currency: {
    id: string;
    name: string;
    code: string;
    currency_type: string;
    base_value_cents: number | null;
  } | null;
}

export interface CategorySpending {
  category_id: number;
  category_name: string;
  category_slug: string;
  annual_spend_cents: number;
  excluded_by_default?: boolean;
  parent_category_id?: number | null;
}

export interface EarningRuleInput {
  id: string;
  card_id: string;
  category_id: number;
  rate: number;
  has_cap: boolean;
  cap_amount: number | null;
  cap_period: string;
  cap_unit: string | null;
  post_cap_rate: number | null;
  booking_method: string;
  brand_name: string | null;
}

export interface CategoryBonusInput {
  id: string;
  card_id: string;
  cap_type: string;
  cap_amount: number | null;
  cap_period: string | null;
  elevated_rate: number;
  post_cap_rate: number | null;
  category_ids: number[];
}

export interface UserSelection {
  cap_id: string;
  selected_category_id: number;
}

export interface PerksValue {
  card_id: string;
  perks_value: number;
}

export interface TravelPreference {
  category_slug: string;
  preference_type: string;
  brand_name: string | null;
  portal_issuer_id: string | null;
}

// Output Types
export interface AllocationEntry {
  cardId: string;
  cardName: string;
  currencyType: string;
  currencyName: string;
  spend: number;       // $ allocated
  rate: number;        // earning rate
  earned: number;      // points or $ earned
  earnedValue: number; // $ value of earnings
  isCashback: boolean;
}

export interface CategoryAllocation {
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  totalSpend: number;
  allocations: AllocationEntry[];
}

export interface CardCategoryBreakdown {
  categoryId: number;
  categoryName: string;
  spend: number;
  rate: number;
  earned: number;
  earnedValue: number;
}

export interface CardEarnings {
  cardId: string;
  cardName: string;
  currencyType: string;
  currencyName: string;
  isCashback: boolean;
  annualFee: number;
  perksValue: number;
  netFee: number;
  totalSpend: number;
  totalEarned: number;
  totalEarnedValue: number;
  categoryBreakdown: CardCategoryBreakdown[];
  // Marginal value fields (calculated separately)
  marginalValue?: number;         // Value this card adds over replacement
  replacementValue?: number;      // What other cards would earn if this card removed
}

export interface CurrencyEarningsBreakdown {
  currencyId: string;
  currencyName: string;
  currencyType: string;
  pointsEarned: number;
  pointsValue: number;
}

export interface PortfolioReturns {
  totalSpend: number;
  
  // Cashback breakdown
  cashbackSpend: number;
  cashbackEarned: number;
  avgCashbackRate: number;
  
  // Points breakdown
  pointsSpend: number;
  pointsEarned: number;
  avgPointsRate: number;
  totalPointsValue: number;
  avgPointValue: number;
  
  // Per-currency breakdown (for points currencies only)
  currencyBreakdown: CurrencyEarningsBreakdown[];
  
  // Summary
  totalValue: number;
  netAnnualFees: number;
  netValueEarned: number;
  netReturnRate: number;
  
  // Detailed breakdowns
  categoryBreakdown: CategoryAllocation[];
  cardBreakdown: CardEarnings[];
}

// ============================================================================
// Helper Functions
// ============================================================================

const CASH_CURRENCY_TYPES = ["cash_back", "crypto", "cash"];

function isCashbackCurrency(currencyType: string | null | undefined): boolean {
  return CASH_CURRENCY_TYPES.includes(currencyType ?? "");
}

function annualizeCap(amount: number | null, period: string | null): number {
  if (amount === null) return Infinity;
  switch (period) {
    case "month": return amount * 12;
    case "quarter": return amount * 4;
    case "year": return amount;
    case "lifetime": return amount; // Treat as yearly for calculation
    default: return Infinity;
  }
}

function getCurrencyValueCents(
  currencyId: string,
  userCurrencyValues: Map<string, number>,
  defaultValues: Map<string, number>
): number {
  return userCurrencyValues.get(currencyId) ?? defaultValues.get(currencyId) ?? 100;
}

// ============================================================================
// Main Calculator
// ============================================================================

export type EarningsGoal = "maximize" | "cash_only" | "points_only";

export interface CalculatorInput {
  cards: CardInput[];
  spending: CategorySpending[];
  earningRules: EarningRuleInput[];
  categoryBonuses: CategoryBonusInput[];
  userCurrencyValues: Map<string, number>;
  defaultCurrencyValues: Map<string, number>;
  cashOutValues: Map<string, number>; // currency_id -> cash_out_value_cents (for cash_only mode)
  perksValues: Map<string, number>;
  userSelections: Map<string, number>; // cap_id -> selected_category_id
  travelPreferences: TravelPreference[];
  enabledSecondaryCards: Set<string>; // card IDs with secondary currency enabled
  earningsGoal: EarningsGoal; // Which optimization mode to use
}

export function calculatePortfolioReturns(input: CalculatorInput): PortfolioReturns {
  const {
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
  } = input;

  // Build category map for parent lookups
  const categoryMap = new Map<number, CategorySpending>();
  spending.forEach(s => categoryMap.set(s.category_id, s));

  // Determine which categories are "top N" for each card's category bonuses
  const topCategoriesMap = calculateTopCategories(cards, categoryBonuses, spending, categoryMap);

  // Build earning rate lookup: card_id -> category_id -> { rate, annualCap, postCapRate }
  const earningRateMap = buildEarningRateMap(
    cards,
    earningRules,
    categoryBonuses,
    categoryMap,
    userSelections,
    topCategoriesMap,
    travelPreferences
  );

  // Track cap usage per card per category (for rules with caps)
  const capUsage = new Map<string, number>(); // key: `${cardId}:${categoryId}` or `${cardId}:combined:${bonusId}`

  // Currency types that qualify for "points_only" mode
  const POINTS_ONLY_TYPES = ["airline_miles", "hotel_points", "transferable_points"];

  // Get currency value for each card (considering secondary currency enablement and earnings goal)
  const getCardCurrencyInfo = (card: CardInput): { 
    currencyId: string; 
    currencyType: string; 
    currencyName: string;
    valueCents: number;
    isCashback: boolean;
    excluded: boolean; // Card excluded from earning due to goal
  } => {
    const useSecondary = enabledSecondaryCards.has(card.id) && card.secondary_currency;
    const currency = useSecondary ? card.secondary_currency! : card.primary_currency;
    const currencyId = useSecondary ? card.secondary_currency_id! : card.primary_currency_id;
    const currencyType = currency?.currency_type ?? "other";
    const currencyName = currency?.name ?? "Unknown";
    const isCashback = isCashbackCurrency(currencyType);
    
    // Determine value based on earnings goal
    let valueCents: number;
    let excluded = false;
    
    switch (earningsGoal) {
      case "cash_only":
        if (isCashback) {
          // Cash back cards work as normal (their "rate" is already a percentage)
          valueCents = 100; // 100 cents = $1 (for cashback, rate IS the value)
        } else {
          // For points currencies, use cash out value
          const cashOutValue = cashOutValues.get(currencyId);
          if (cashOutValue) {
            valueCents = cashOutValue;
          } else {
            // No cash out value available - exclude this card
            valueCents = 0;
            excluded = true;
          }
        }
        break;
        
      case "points_only":
        if (POINTS_ONLY_TYPES.includes(currencyType)) {
          // Use normal point value
          valueCents = getCurrencyValueCents(currencyId, userCurrencyValues, defaultCurrencyValues);
        } else {
          // Not a qualifying points currency - exclude
          valueCents = 0;
          excluded = true;
        }
        break;
        
      case "maximize":
      default:
        // Use normal point value
        valueCents = getCurrencyValueCents(currencyId, userCurrencyValues, defaultCurrencyValues);
        break;
    }
    
    return { currencyId, currencyType, currencyName, valueCents, isCashback, excluded };
  };

  // Initialize tracking structures
  const categoryAllocations: CategoryAllocation[] = [];
  const cardEarningsMap = new Map<string, CardEarnings>();
  // Track per-currency earnings: currencyId -> { name, type, earned, value }
  const currencyEarningsMap = new Map<string, { name: string; type: string; earned: number; value: number }>();

  // Initialize card earnings for all cards
  cards.forEach(card => {
    const currencyInfo = getCardCurrencyInfo(card);
    cardEarningsMap.set(card.id, {
      cardId: card.id,
      cardName: card.name,
      currencyType: currencyInfo.currencyType,
      currencyName: currencyInfo.currencyName,
      isCashback: currencyInfo.isCashback,
      annualFee: card.annual_fee,
      perksValue: perksValues.get(card.id) ?? 0,
      netFee: card.annual_fee - (perksValues.get(card.id) ?? 0),
      totalSpend: 0,
      totalEarned: 0,
      totalEarnedValue: 0,
      categoryBreakdown: [],
    });
  });

  // Process each category with non-zero spending
  for (const categorySpend of spending) {
    if (categorySpend.annual_spend_cents <= 0) continue;
    if (categorySpend.excluded_by_default) continue;

    const spendDollars = categorySpend.annual_spend_cents / 100;
    let remainingSpend = spendDollars;

    const allocations: AllocationEntry[] = [];

    // Rank cards by effective value for this category
    const rankedCards = rankCardsForCategory(
      cards,
      categorySpend.category_id,
      earningRateMap,
      capUsage,
      getCardCurrencyInfo
    );

    // Allocate spending to cards in order of value
    for (const rankedCard of rankedCards) {
      if (remainingSpend <= 0) break;

      const { card, rate, annualCap, postCapRate, capKey } = rankedCard;
      const currencyInfo = getCardCurrencyInfo(card);

      // Calculate available cap room
      const usedCap = capUsage.get(capKey) ?? 0;
      const availableCap = annualCap - usedCap;

      if (availableCap <= 0 && postCapRate !== null) {
        // Cap exhausted, use post-cap rate for remaining
        const spendAmount = remainingSpend;
        const earned = currencyInfo.isCashback 
          ? spendAmount * (postCapRate / 100)  // Cash back: rate is percentage
          : spendAmount * postCapRate;          // Points: rate is multiplier
        const earnedValue = currencyInfo.isCashback 
          ? earned 
          : earned * (currencyInfo.valueCents / 100);

        allocations.push({
          cardId: card.id,
          cardName: card.name,
          currencyType: currencyInfo.currencyType,
          currencyName: currencyInfo.currencyName,
          spend: spendAmount,
          rate: postCapRate,
          earned,
          earnedValue,
          isCashback: currencyInfo.isCashback,
        });

        // Update card earnings
        updateCardEarnings(cardEarningsMap, currencyEarningsMap, card.id, categorySpend, spendAmount, postCapRate, earned, earnedValue, currencyInfo.currencyId, currencyInfo.currencyName, currencyInfo.currencyType, currencyInfo.isCashback);
        
        remainingSpend = 0;
        break;
      }

      // Calculate how much we can allocate at the elevated rate
      const spendAtElevated = Math.min(remainingSpend, availableCap);
      
      if (spendAtElevated > 0) {
        const earned = currencyInfo.isCashback 
          ? spendAtElevated * (rate / 100)
          : spendAtElevated * rate;
        const earnedValue = currencyInfo.isCashback 
          ? earned 
          : earned * (currencyInfo.valueCents / 100);

        allocations.push({
          cardId: card.id,
          cardName: card.name,
          currencyType: currencyInfo.currencyType,
          currencyName: currencyInfo.currencyName,
          spend: spendAtElevated,
          rate,
          earned,
          earnedValue,
          isCashback: currencyInfo.isCashback,
        });

        // Update cap usage
        if (annualCap !== Infinity) {
          capUsage.set(capKey, usedCap + spendAtElevated);
        }

        // Update card earnings
        updateCardEarnings(cardEarningsMap, currencyEarningsMap, card.id, categorySpend, spendAtElevated, rate, earned, earnedValue, currencyInfo.currencyId, currencyInfo.currencyName, currencyInfo.currencyType, currencyInfo.isCashback);

        remainingSpend -= spendAtElevated;
      }
    }

    // If still have remaining spend, allocate to best uncapped card at default rate
    if (remainingSpend > 0 && cards.length > 0) {
      let bestCard: CardInput | null = null;
      let bestValue = -1;
      
      for (const card of cards) {
        const currencyInfo = getCardCurrencyInfo(card);
        // Skip excluded cards
        if (currencyInfo.excluded) continue;
        
        const rate = card.default_earn_rate;
        const value = currencyInfo.isCashback 
          ? rate / 100 
          : rate * (currencyInfo.valueCents / 100);
        if (value > bestValue) {
          bestValue = value;
          bestCard = card;
        }
      }

      // Only allocate if we found a non-excluded card
      if (bestCard) {
        const currencyInfo = getCardCurrencyInfo(bestCard);
        const rate = bestCard.default_earn_rate;
        const earned = currencyInfo.isCashback 
          ? remainingSpend * (rate / 100)
          : remainingSpend * rate;
        const earnedValue = currencyInfo.isCashback 
          ? earned 
          : earned * (currencyInfo.valueCents / 100);

        allocations.push({
          cardId: bestCard.id,
          cardName: bestCard.name,
          currencyType: currencyInfo.currencyType,
          currencyName: currencyInfo.currencyName,
          spend: remainingSpend,
          rate,
          earned,
          earnedValue,
          isCashback: currencyInfo.isCashback,
        });

        updateCardEarnings(cardEarningsMap, currencyEarningsMap, bestCard.id, categorySpend, remainingSpend, rate, earned, earnedValue, currencyInfo.currencyId, currencyInfo.currencyName, currencyInfo.currencyType, currencyInfo.isCashback);
      }
      // Note: If all cards are excluded, remaining spend is not allocated (this is intentional for goal-based filtering)
    }

    categoryAllocations.push({
      categoryId: categorySpend.category_id,
      categoryName: categorySpend.category_name,
      categorySlug: categorySpend.category_slug,
      totalSpend: spendDollars,
      allocations,
    });
  }

  // Calculate aggregates
  const cardBreakdown = Array.from(cardEarningsMap.values());
  
  let totalSpend = 0;
  let cashbackSpend = 0;
  let cashbackEarned = 0;
  let pointsSpend = 0;
  let pointsEarned = 0;
  let totalPointsValue = 0;
  let netAnnualFees = 0;

  for (const card of cardBreakdown) {
    totalSpend += card.totalSpend;
    netAnnualFees += card.netFee;
    
    if (card.isCashback) {
      cashbackSpend += card.totalSpend;
      cashbackEarned += card.totalEarned;
    } else {
      pointsSpend += card.totalSpend;
      pointsEarned += card.totalEarned;
      totalPointsValue += card.totalEarnedValue;
    }
  }

  const avgCashbackRate = cashbackSpend > 0 ? (cashbackEarned / cashbackSpend) * 100 : 0;
  const avgPointsRate = pointsSpend > 0 ? pointsEarned / pointsSpend : 0;
  const avgPointValue = pointsEarned > 0 ? (totalPointsValue / pointsEarned) * 100 : 0;
  const totalValue = cashbackEarned + totalPointsValue;
  const netValueEarned = totalValue - netAnnualFees;
  const netReturnRate = totalSpend > 0 ? (netValueEarned / totalSpend) * 100 : 0;

  // Build currency breakdown array
  const currencyBreakdown: CurrencyEarningsBreakdown[] = Array.from(currencyEarningsMap.entries())
    .map(([currencyId, data]) => ({
      currencyId,
      currencyName: data.name,
      currencyType: data.type,
      pointsEarned: data.earned,
      pointsValue: data.value,
    }))
    .sort((a, b) => b.pointsValue - a.pointsValue);

  return {
    totalSpend,
    cashbackSpend,
    cashbackEarned,
    avgCashbackRate,
    pointsSpend,
    pointsEarned,
    avgPointsRate,
    totalPointsValue,
    avgPointValue,
    currencyBreakdown,
    totalValue,
    netAnnualFees,
    netValueEarned,
    netReturnRate,
    categoryBreakdown: categoryAllocations,
    cardBreakdown,
  };
}

// ============================================================================
// Helper: Calculate Top Categories for each card's category bonuses
// ============================================================================

function calculateTopCategories(
  cards: CardInput[],
  categoryBonuses: CategoryBonusInput[],
  spending: CategorySpending[],
  categoryMap: Map<number, CategorySpending>
): Map<string, Set<number>> {
  // Map: cardId -> Set of category IDs that qualify for top N bonuses
  const result = new Map<string, Set<number>>();

  for (const card of cards) {
    const cardBonuses = categoryBonuses.filter(b => b.card_id === card.id);
    
    for (const bonus of cardBonuses) {
      if (!["top_category", "top_two_categories", "top_three_categories", "second_top_category"].includes(bonus.cap_type)) {
        continue;
      }

      // Get spending for eligible categories
      const eligibleSpending = bonus.category_ids
        .map(catId => ({
          categoryId: catId,
          spend: categoryMap.get(catId)?.annual_spend_cents ?? 0,
        }))
        .sort((a, b) => b.spend - a.spend);

      let qualifyingCategories: number[] = [];
      
      switch (bonus.cap_type) {
        case "top_category":
          qualifyingCategories = eligibleSpending.slice(0, 1).map(s => s.categoryId);
          break;
        case "top_two_categories":
          qualifyingCategories = eligibleSpending.slice(0, 2).map(s => s.categoryId);
          break;
        case "top_three_categories":
          qualifyingCategories = eligibleSpending.slice(0, 3).map(s => s.categoryId);
          break;
        case "second_top_category":
          qualifyingCategories = eligibleSpending.slice(1, 2).map(s => s.categoryId);
          break;
      }

      if (!result.has(card.id)) {
        result.set(card.id, new Set());
      }
      qualifyingCategories.forEach(catId => result.get(card.id)!.add(catId));
    }
  }

  return result;
}

// ============================================================================
// Helper: Build Earning Rate Map
// ============================================================================

interface RateInfo {
  rate: number;
  annualCap: number;
  postCapRate: number | null;
  capKey: string;
}

function buildEarningRateMap(
  cards: CardInput[],
  earningRules: EarningRuleInput[],
  categoryBonuses: CategoryBonusInput[],
  categoryMap: Map<number, CategorySpending>,
  userSelections: Map<string, number>,
  topCategoriesMap: Map<string, Set<number>>,
  travelPreferences: TravelPreference[]
): Map<string, Map<number, RateInfo[]>> {
  // card_id -> category_id -> array of RateInfo (multiple rates possible with different caps)
  const result = new Map<string, Map<number, RateInfo[]>>();

  // Process earning rules
  for (const rule of earningRules) {
    // Only use 'any' booking method for base calculation (simplification)
    if (rule.booking_method !== "any") continue;

    if (!result.has(rule.card_id)) {
      result.set(rule.card_id, new Map());
    }
    const cardMap = result.get(rule.card_id)!;
    
    if (!cardMap.has(rule.category_id)) {
      cardMap.set(rule.category_id, []);
    }

    const annualCap = rule.has_cap ? annualizeCap(rule.cap_amount, rule.cap_period) : Infinity;
    const capKey = `${rule.card_id}:rule:${rule.id}`;

    cardMap.get(rule.category_id)!.push({
      rate: Number(rule.rate),
      annualCap,
      postCapRate: rule.post_cap_rate !== null ? Number(rule.post_cap_rate) : null,
      capKey,
    });
  }

  // Process category bonuses
  for (const bonus of categoryBonuses) {
    if (!result.has(bonus.card_id)) {
      result.set(bonus.card_id, new Map());
    }
    const cardMap = result.get(bonus.card_id)!;

    const annualCap = annualizeCap(bonus.cap_amount, bonus.cap_period);
    const baseCapKey = `${bonus.card_id}:bonus:${bonus.id}`;

    let targetCategories: number[] = [];

    switch (bonus.cap_type) {
      case "single_category":
      case "combined_categories":
        targetCategories = bonus.category_ids;
        break;
      
      case "selected_category": {
        const selectedId = userSelections.get(bonus.id);
        if (selectedId && bonus.category_ids.includes(selectedId)) {
          targetCategories = [selectedId];
        }
        break;
      }
      
      case "top_category":
      case "top_two_categories":
      case "top_three_categories":
      case "second_top_category": {
        const topCategories = topCategoriesMap.get(bonus.card_id);
        if (topCategories) {
          targetCategories = bonus.category_ids.filter(catId => topCategories.has(catId));
        }
        break;
      }
      
      case "all_categories":
        // All non-excluded categories
        categoryMap.forEach((cat, catId) => {
          if (!cat.excluded_by_default) {
            targetCategories.push(catId);
          }
        });
        break;
    }

    for (const categoryId of targetCategories) {
      if (!cardMap.has(categoryId)) {
        cardMap.set(categoryId, []);
      }

      // For combined categories, use shared cap key
      const capKey = bonus.cap_type === "combined_categories" 
        ? baseCapKey 
        : `${baseCapKey}:${categoryId}`;

      cardMap.get(categoryId)!.push({
        rate: Number(bonus.elevated_rate),
        annualCap,
        postCapRate: bonus.post_cap_rate !== null ? Number(bonus.post_cap_rate) : null,
        capKey,
      });
    }
  }

  return result;
}

// ============================================================================
// Helper: Rank Cards for a Category
// ============================================================================

interface RankedCard {
  card: CardInput;
  rate: number;
  annualCap: number;
  postCapRate: number | null;
  capKey: string;
  effectiveValue: number;
}

function rankCardsForCategory(
  cards: CardInput[],
  categoryId: number,
  earningRateMap: Map<string, Map<number, RateInfo[]>>,
  capUsage: Map<string, number>,
  getCardCurrencyInfo: (card: CardInput) => { valueCents: number; isCashback: boolean; excluded: boolean }
): RankedCard[] {
  const ranked: RankedCard[] = [];

  for (const card of cards) {
    const currencyInfo = getCardCurrencyInfo(card);
    
    // Skip excluded cards entirely (they shouldn't receive any spending)
    if (currencyInfo.excluded) continue;
    
    const cardRates = earningRateMap.get(card.id)?.get(categoryId) ?? [];

    if (cardRates.length === 0) {
      // Use default rate
      const rate = card.default_earn_rate;
      const effectiveValue = currencyInfo.isCashback 
        ? rate / 100 
        : rate * (currencyInfo.valueCents / 100);
      
      ranked.push({
        card,
        rate,
        annualCap: Infinity,
        postCapRate: null,
        capKey: `${card.id}:default`,
        effectiveValue,
      });
    } else {
      // Add each rate option
      for (const rateInfo of cardRates) {
        const usedCap = capUsage.get(rateInfo.capKey) ?? 0;
        const hasRoomInCap = usedCap < rateInfo.annualCap;
        
        const effectiveValue = currencyInfo.isCashback 
          ? rateInfo.rate / 100 
          : rateInfo.rate * (currencyInfo.valueCents / 100);

        // Only add if there's room in cap or there's a post-cap rate
        if (hasRoomInCap || rateInfo.postCapRate !== null) {
          ranked.push({
            card,
            rate: rateInfo.rate,
            annualCap: rateInfo.annualCap,
            postCapRate: rateInfo.postCapRate,
            capKey: rateInfo.capKey,
            effectiveValue: hasRoomInCap ? effectiveValue : 0, // If cap exhausted, value is 0 for sorting
          });
        }
      }
    }
  }

  // Sort by effective value descending
  ranked.sort((a, b) => b.effectiveValue - a.effectiveValue);
  
  return ranked;
}

// ============================================================================
// Helper: Update Card Earnings
// ============================================================================

function updateCardEarnings(
  cardEarningsMap: Map<string, CardEarnings>,
  currencyEarningsMap: Map<string, { name: string; type: string; earned: number; value: number }>,
  cardId: string,
  category: CategorySpending,
  spend: number,
  rate: number,
  earned: number,
  earnedValue: number,
  currencyId: string,
  currencyName: string,
  currencyType: string,
  isCashback: boolean
): void {
  const cardEarnings = cardEarningsMap.get(cardId);
  if (!cardEarnings) return;

  cardEarnings.totalSpend += spend;
  cardEarnings.totalEarned += earned;
  cardEarnings.totalEarnedValue += earnedValue;

  // Update per-currency breakdown (for non-cashback currencies)
  if (!isCashback) {
    const existing = currencyEarningsMap.get(currencyId);
    if (existing) {
      existing.earned += earned;
      existing.value += earnedValue;
    } else {
      currencyEarningsMap.set(currencyId, {
        name: currencyName,
        type: currencyType,
        earned,
        value: earnedValue,
      });
    }
  }

  // Find or create category breakdown entry
  let catBreakdown = cardEarnings.categoryBreakdown.find(
    cb => cb.categoryId === category.category_id
  );
  
  if (!catBreakdown) {
    catBreakdown = {
      categoryId: category.category_id,
      categoryName: category.category_name,
      spend: 0,
      rate: 0,
      earned: 0,
      earnedValue: 0,
    };
    cardEarnings.categoryBreakdown.push(catBreakdown);
  }

  // Weighted average rate
  const prevTotal = catBreakdown.spend * catBreakdown.rate;
  const newTotal = prevTotal + (spend * rate);
  catBreakdown.spend += spend;
  catBreakdown.rate = catBreakdown.spend > 0 ? newTotal / catBreakdown.spend : 0;
  catBreakdown.earned += earned;
  catBreakdown.earnedValue += earnedValue;
}

// ============================================================================
// Calculate Marginal Value for Each Card
// ============================================================================

/**
 * Calculates the marginal value of each card in a portfolio.
 * Marginal Value = Card's Current Value - Replacement Value - Net Fee
 * Where Replacement Value = what other cards would earn if this card were removed
 */
export function calculateMarginalValues(
  input: CalculatorInput,
  currentReturns: PortfolioReturns
): Map<string, { marginalValue: number; replacementValue: number }> {
  const result = new Map<string, { marginalValue: number; replacementValue: number }>();
  
  // For each card with non-zero spend or non-zero fee, calculate its marginal value
  for (const cardEarnings of currentReturns.cardBreakdown) {
    if (cardEarnings.totalSpend === 0 && cardEarnings.netFee === 0) {
      // Card has no impact, skip
      result.set(cardEarnings.cardId, { marginalValue: 0, replacementValue: 0 });
      continue;
    }

    // Create input without this card
    const cardsWithout = input.cards.filter(c => c.id !== cardEarnings.cardId);
    
    if (cardsWithout.length === 0) {
      // This is the only card - no replacement possible
      result.set(cardEarnings.cardId, { 
        marginalValue: cardEarnings.totalEarnedValue - cardEarnings.netFee,
        replacementValue: 0 
      });
      continue;
    }

    // Also need to update enabledSecondaryCards since removing a card may affect secondary currency enablement
    const userPrimaryCurrencyIdsWithout = new Set<string>();
    cardsWithout.forEach((c) => {
      userPrimaryCurrencyIdsWithout.add(c.primary_currency_id);
    });
    
    const enabledSecondaryCardsWithout = new Set<string>();
    cardsWithout.forEach((c) => {
      if (c.secondary_currency_id && userPrimaryCurrencyIdsWithout.has(c.secondary_currency_id)) {
        enabledSecondaryCardsWithout.add(c.id);
      }
    });

    // Calculate returns without this card
    const returnsWithout = calculatePortfolioReturns({
      ...input,
      cards: cardsWithout,
      enabledSecondaryCards: enabledSecondaryCardsWithout,
    });

    // Replacement value = what other cards would earn on spend that was allocated to this card
    // This is the difference in total value (excluding this card's value and fee)
    const currentTotalValueExcludingThisCard = currentReturns.totalValue - cardEarnings.totalEarnedValue;
    const replacementValue = returnsWithout.totalValue - currentTotalValueExcludingThisCard;

    // Marginal Value = What this card earns - What replacement earns - Net Fee
    const marginalValue = cardEarnings.totalEarnedValue - replacementValue - cardEarnings.netFee;

    result.set(cardEarnings.cardId, { marginalValue, replacementValue });
  }

  return result;
}

