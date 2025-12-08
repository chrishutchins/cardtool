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
  large_purchase_spend_cents?: number; // >$5k purchases (subset of parent category)
  excluded_by_default?: boolean;
  parent_category_id?: number | null;
  // Virtual category marker - when true, this is a >$5k portion that should use MAX logic
  is_large_purchase_portion?: boolean;
  // Reference to original category for >$5k portions
  original_category_id?: number;
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

export interface MultiplierProgram {
  programId: string;
  multiplier: number;
  applicableCurrencyIds: string[]; // currencies this multiplier applies to
  applicableCardIds: string[]; // specific cards this multiplier applies to
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
  earnedValue: number; // $ value of earnings (including debit pay)
  debitPayBonus: number; // $ from debit pay bonus
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
  totalDebitPay: number;          // Total debit pay bonus for this card
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
  
  // Debit pay bonus (extra cash earned on all spending)
  totalDebitPay: number;
  
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

/**
 * Expands spending into virtual sub-categories for >$5k tracking.
 * Categories with large_purchase_spend_cents > 0 are split into two entries:
 * - Original category with reduced spend (annual_spend_cents only)
 * - Virtual >$5k portion with large_purchase_spend_cents as its spend
 * 
 * The >$5k portions are marked with is_large_purchase_portion=true so the
 * allocation logic can use MAX(parent_rate, >$5k_rate) when ranking cards.
 */
function expandSpendingForLargePurchases(
  spending: CategorySpending[],
  largePurchaseCategoryId?: number
): CategorySpending[] {
  const expanded: CategorySpending[] = [];
  
  for (const cat of spending) {
    const largePurchaseAmount = cat.large_purchase_spend_cents ?? 0;
    
    if (largePurchaseAmount > 0 && largePurchaseCategoryId) {
      // Add the <$5k portion (original category with reduced spend)
      expanded.push({
        ...cat,
        // annual_spend_cents already represents the <$5k portion from the view
        large_purchase_spend_cents: 0,
      });
      
      // Add the >$5k portion as a virtual category
      // This will compete for card allocation independently
      expanded.push({
        category_id: cat.category_id, // Keep original category_id for display
        category_name: `${cat.category_name} (>$5k)`,
        category_slug: `${cat.category_slug}-large-purchases`,
        annual_spend_cents: largePurchaseAmount,
        large_purchase_spend_cents: 0,
        excluded_by_default: cat.excluded_by_default,
        parent_category_id: cat.parent_category_id,
        is_large_purchase_portion: true,
        original_category_id: cat.category_id,
      });
    } else {
      // No >$5k tracking, pass through as-is
      expanded.push(cat);
    }
  }
  
  return expanded;
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
  debitPayValues?: Map<string, number>; // card_id -> debit_pay_percent bonus
  multiplierPrograms?: MultiplierProgram[]; // earning multipliers (e.g., BoA Preferred Rewards)
  mobilePayCategories?: Set<number>; // category_ids where user uses mobile pay
  mobilePayCategoryId?: number; // the category_id for "Mobile Pay" itself
  paypalCategories?: Set<number>; // category_ids where user pays via PayPal
  paypalCategoryId?: number; // the category_id for "Paypal" itself
  largePurchaseCategoryId?: number; // the category_id for ">$5k Purchases"
  userSelections: Map<string, number>; // cap_id -> selected_category_id
  travelPreferences: TravelPreference[];
  enabledSecondaryCards: Set<string>; // card IDs with secondary currency enabled
  earningsGoal: EarningsGoal; // Which optimization mode to use
  // For recommendations: pre-computed top categories using ONLY user's original cards
  // This prevents candidate cards from affecting existing cards' top category selections
  preComputedTopCategories?: Map<string, Set<number>>;
}

export function calculatePortfolioReturns(input: CalculatorInput): PortfolioReturns {
  const {
    cards,
    spending: rawSpending,
    earningRules,
    categoryBonuses,
    userCurrencyValues,
    defaultCurrencyValues,
    cashOutValues,
    perksValues,
    debitPayValues = new Map(),
    multiplierPrograms = [],
    mobilePayCategories = new Set(),
    mobilePayCategoryId,
    paypalCategories = new Set(),
    paypalCategoryId,
    largePurchaseCategoryId,
    userSelections,
    travelPreferences,
    enabledSecondaryCards,
    earningsGoal,
  } = input;

  // Expand spending to handle >$5k tracking
  // Categories with large_purchase_spend_cents are split into <$5k and >$5k portions
  const spending = expandSpendingForLargePurchases(rawSpending, largePurchaseCategoryId);

  // Build a map of card_id -> multiplier (for earning multiplier programs like BoA Preferred Rewards)
  const cardMultipliers = new Map<string, number>();
  for (const program of multiplierPrograms) {
    for (const card of cards) {
      // Check if this card is eligible for this multiplier program
      const currencyId = enabledSecondaryCards.has(card.id) && card.secondary_currency
        ? card.secondary_currency.id
        : card.primary_currency?.id;
      
      const isEligible = 
        program.applicableCardIds.includes(card.id) ||
        (currencyId && program.applicableCurrencyIds.includes(currencyId));
      
      if (isEligible) {
        // If multiple programs apply, use the highest multiplier
        const existing = cardMultipliers.get(card.id) ?? 1;
        cardMultipliers.set(card.id, Math.max(existing, program.multiplier));
      }
    }
  }

  // Build category map for parent lookups
  const categoryMap = new Map<number, CategorySpending>();
  spending.forEach(s => categoryMap.set(s.category_id, s));

  // Build combined currency values map for top category calculation
  const combinedCurrencyValues = new Map<string, number>();
  defaultCurrencyValues.forEach((v, k) => combinedCurrencyValues.set(k, v));
  userCurrencyValues.forEach((v, k) => combinedCurrencyValues.set(k, v)); // User values override defaults

  // Determine which categories are "top N" for each card's category bonuses
  // This now picks categories based on MARGINAL VALUE (where the bonus beats alternatives most)
  // rather than just highest spending
  // If preComputedTopCategories is provided (for recommendations), use that instead
  // to prevent candidate cards from affecting existing cards' top category selections
  const topCategoriesMap = input.preComputedTopCategories ?? calculateTopCategories(
    cards, 
    categoryBonuses, 
    spending, 
    categoryMap,
    earningRules,
    combinedCurrencyValues,
    enabledSecondaryCards,
    cardMultipliers
  );

  // Build earning rate lookup: card_id -> category_id -> { rate, annualCap, postCapRate }
  const earningRateMap = buildEarningRateMap(
    cards,
    earningRules,
    categoryBonuses,
    categoryMap,
    userSelections,
    topCategoriesMap,
    travelPreferences,
    mobilePayCategories,
    mobilePayCategoryId,
    paypalCategories,
    paypalCategoryId
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
      totalDebitPay: 0,
      categoryBreakdown: [],
    });
  });

  // Sort categories to optimize shared cap allocation
  // Categories where the best card uses a shared cap AND provides big marginal benefit
  // should be processed first so they get priority for limited cap room
  // NOTE: We include excluded_by_default categories (like Rent/Mortgage) because
  // some cards (like Bilt) CAN earn on them. The allocation logic will handle
  // cases where no card can earn on a category (they just get $0 allocated).
  const sortedSpending = [...spending]
    .filter(s => s.annual_spend_cents > 0)
    .map(categorySpend => {
      // Get ranked cards for this category to calculate marginal benefit
      const rankedCards = rankCardsForCategory(
        cards,
        categorySpend.category_id,
        earningRateMap,
        new Map(), // Empty cap usage for initial ranking
        getCardCurrencyInfo,
        debitPayValues,
        cardMultipliers,
        categorySpend.excluded_by_default ?? false,
        categorySpend.is_large_purchase_portion ?? false,
        categorySpend.original_category_id,
        largePurchaseCategoryId
      );
      
      // Calculate marginal benefit: difference between best and second-best
      const bestValue = rankedCards[0]?.effectiveValue ?? 0;
      const secondBestValue = rankedCards[1]?.effectiveValue ?? 0;
      const marginalBenefit = (bestValue - secondBestValue) * (categorySpend.annual_spend_cents / 100);
      
      return { categorySpend, marginalBenefit };
    })
    // Sort by marginal benefit descending - categories that benefit most from their best card go first
    .sort((a, b) => b.marginalBenefit - a.marginalBenefit)
    .map(x => x.categorySpend);

  // Process each category with non-zero spending (now sorted by optimization priority)
  for (const categorySpend of sortedSpending) {
    const spendDollars = categorySpend.annual_spend_cents / 100;
    let remainingSpend = spendDollars;

    const allocations: AllocationEntry[] = [];

    // Rank cards by effective value for this category (with current cap usage)
    // For >$5k portions, this uses MAX(parent category rate, >$5k rate)
    const rankedCards = rankCardsForCategory(
      cards,
      categorySpend.category_id,
      earningRateMap,
      capUsage,
      getCardCurrencyInfo,
      debitPayValues,
      cardMultipliers,
      categorySpend.excluded_by_default ?? false,
      categorySpend.is_large_purchase_portion ?? false,
      categorySpend.original_category_id,
      largePurchaseCategoryId
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
        // Note: postCapRate from rankedCard is already multiplied by cardMultipliers in rankCardsForCategory
        const spendAmount = remainingSpend;
        const earned = currencyInfo.isCashback 
          ? spendAmount * (postCapRate / 100)  // Cash back: rate is percentage
          : spendAmount * postCapRate;          // Points: rate is multiplier
        const baseEarnedValue = currencyInfo.isCashback 
          ? earned 
          : earned * (currencyInfo.valueCents / 100);
        // Add debit pay bonus (extra % of spend)
        const debitPayBonus = spendAmount * ((debitPayValues.get(card.id) ?? 0) / 100);
        const earnedValue = baseEarnedValue + debitPayBonus;

        allocations.push({
          cardId: card.id,
          cardName: card.name,
          currencyType: currencyInfo.currencyType,
          currencyName: currencyInfo.currencyName,
          spend: spendAmount,
          rate: postCapRate,
          earned,
          earnedValue,
          debitPayBonus,
          isCashback: currencyInfo.isCashback,
        });

        // Update card earnings
        updateCardEarnings(cardEarningsMap, currencyEarningsMap, card.id, categorySpend, spendAmount, postCapRate, earned, earnedValue, debitPayBonus, currencyInfo.currencyId, currencyInfo.currencyName, currencyInfo.currencyType, currencyInfo.isCashback);
        
        remainingSpend = 0;
        break;
      }

      // Calculate how much we can allocate at the elevated rate
      const spendAtElevated = Math.min(remainingSpend, availableCap);
      
      if (spendAtElevated > 0) {
        // Note: rate from rankedCard is already multiplied by cardMultipliers in rankCardsForCategory
        const earned = currencyInfo.isCashback 
          ? spendAtElevated * (rate / 100)
          : spendAtElevated * rate;
        const baseEarnedValue = currencyInfo.isCashback 
          ? earned 
          : earned * (currencyInfo.valueCents / 100);
        // Add debit pay bonus (extra % of spend)
        const debitPayBonus = spendAtElevated * ((debitPayValues.get(card.id) ?? 0) / 100);
        const earnedValue = baseEarnedValue + debitPayBonus;

        allocations.push({
          cardId: card.id,
          cardName: card.name,
          currencyType: currencyInfo.currencyType,
          currencyName: currencyInfo.currencyName,
          spend: spendAtElevated,
          rate,
          earned,
          earnedValue,
          debitPayBonus,
          isCashback: currencyInfo.isCashback,
        });

        // Update cap usage
        if (annualCap !== Infinity) {
          capUsage.set(capKey, usedCap + spendAtElevated);
        }

        // Update card earnings
        updateCardEarnings(cardEarningsMap, currencyEarningsMap, card.id, categorySpend, spendAtElevated, rate, earned, earnedValue, debitPayBonus, currencyInfo.currencyId, currencyInfo.currencyName, currencyInfo.currencyType, currencyInfo.isCashback);

        remainingSpend -= spendAtElevated;
      }
    }

    // If still have remaining spend, allocate to best uncapped card at default rate
    // BUT: Skip this for excluded_by_default categories (like Rent/Mortgage) - 
    // cards without explicit earning rules should NOT earn on these categories
    const isCategoryExcluded = categorySpend.excluded_by_default ?? false;
    if (remainingSpend > 0 && cards.length > 0 && !isCategoryExcluded) {
      let bestCard: CardInput | null = null;
      let bestValue = -1;
      
      for (const card of cards) {
        const currencyInfo = getCardCurrencyInfo(card);
        // Skip excluded cards
        if (currencyInfo.excluded) continue;
        
        const baseRate = card.default_earn_rate;
        // Apply earning multiplier (e.g., BoA Preferred Rewards 1.75x)
        const multiplier = cardMultipliers.get(card.id) ?? 1;
        const rate = baseRate * multiplier;
        const baseValue = currencyInfo.isCashback 
          ? rate / 100 
          : rate * (currencyInfo.valueCents / 100);
        // Include debit pay bonus in value comparison
        const debitPayBonus = (debitPayValues.get(card.id) ?? 0) / 100;
        const value = baseValue + debitPayBonus;
        if (value > bestValue) {
          bestValue = value;
          bestCard = card;
        }
      }

      // Only allocate if we found a non-excluded card
      if (bestCard) {
        const currencyInfo = getCardCurrencyInfo(bestCard);
        const baseRate = bestCard.default_earn_rate;
        // Apply earning multiplier (e.g., BoA Preferred Rewards 1.75x)
        const multiplier = cardMultipliers.get(bestCard.id) ?? 1;
        const rate = baseRate * multiplier;
        const earned = currencyInfo.isCashback 
          ? remainingSpend * (rate / 100)
          : remainingSpend * rate;
        const baseEarnedValue = currencyInfo.isCashback 
          ? earned 
          : earned * (currencyInfo.valueCents / 100);
        // Add debit pay bonus (extra % of spend)
        const debitPayBonus = remainingSpend * ((debitPayValues.get(bestCard.id) ?? 0) / 100);
        const earnedValue = baseEarnedValue + debitPayBonus;

        allocations.push({
          cardId: bestCard.id,
          cardName: bestCard.name,
          currencyType: currencyInfo.currencyType,
          currencyName: currencyInfo.currencyName,
          spend: remainingSpend,
          rate,
          earned,
          earnedValue,
          debitPayBonus,
          isCashback: currencyInfo.isCashback,
        });

        updateCardEarnings(cardEarningsMap, currencyEarningsMap, bestCard.id, categorySpend, remainingSpend, rate, earned, earnedValue, debitPayBonus, currencyInfo.currencyId, currencyInfo.currencyName, currencyInfo.currencyType, currencyInfo.isCashback);
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
  let totalDebitPay = 0;

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

  // Calculate total debit pay bonus from CASHBACK allocations only
  // (Points cards already include debit pay in totalEarnedValue)
  for (const category of categoryAllocations) {
    for (const alloc of category.allocations) {
      if (alloc.isCashback) {
        totalDebitPay += alloc.debitPayBonus;
      }
    }
  }

  const avgCashbackRate = cashbackSpend > 0 ? (cashbackEarned / cashbackSpend) * 100 : 0;
  const avgPointsRate = pointsSpend > 0 ? pointsEarned / pointsSpend : 0;
  const avgPointValue = pointsEarned > 0 ? (totalPointsValue / pointsEarned) * 100 : 0;
  const totalValue = cashbackEarned + totalPointsValue + totalDebitPay;
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
    totalDebitPay,
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
  categoryMap: Map<number, CategorySpending>,
  earningRules: EarningRuleInput[],
  currencyValues: Map<string, number>,
  enabledSecondaryCards: Set<string>,
  cardMultipliers: Map<string, number>
): Map<string, Set<number>> {
  // Map: cardId -> Set of category IDs that qualify for top N bonuses
  const result = new Map<string, Set<number>>();

  // Helper to get point value for a card
  const getCardPointValue = (card: CardInput): number => {
    const useSecondary = enabledSecondaryCards.has(card.id) && card.secondary_currency;
    const currency = useSecondary ? card.secondary_currency : card.primary_currency;
    const currencyId = useSecondary ? card.secondary_currency_id : card.primary_currency_id;
    return currencyValues.get(currencyId!) ?? currency?.base_value_cents ?? 100;
  };

  // Helper to check if a currency is cash back
  const isCashbackCurrency = (type: string): boolean => {
    return ["cash_back", "cash", "crypto"].includes(type);
  };

  // Helper to get best rate from OTHER cards for a category
  // This considers both earning rules AND category bonuses (like Ink Preferred's 3x on Ads)
  const getBestOtherCardValue = (excludeCardId: string, categoryId: number): number => {
    let bestValue = 0;
    
    for (const card of cards) {
      if (card.id === excludeCardId) continue;
      
      const pointValue = getCardPointValue(card);
      const currencyType = card.primary_currency?.currency_type ?? "other";
      const isCashback = isCashbackCurrency(currencyType);
      const multiplier = cardMultipliers.get(card.id) ?? 1;
      
      // Get this card's rate for the category from earning rules
      const rule = earningRules.find(r => r.card_id === card.id && r.category_id === categoryId && r.booking_method === "any");
      let rate = rule?.rate ?? card.default_earn_rate;
      
      // Also check category bonuses (card_caps) for this card and category
      // This includes combined_categories, single_category, all_categories bonuses
      for (const bonus of categoryBonuses) {
        if (bonus.card_id !== card.id) continue;
        
        // Check if this bonus applies to the category
        const appliesToCategory = 
          bonus.cap_type === "all_categories" || 
          bonus.category_ids.includes(categoryId);
        
        if (appliesToCategory && bonus.elevated_rate > rate) {
          rate = bonus.elevated_rate;
        }
      }
      
      rate *= multiplier;
      
      // Calculate effective value per dollar spent
      const effectiveValue = isCashback 
        ? rate // Cash back: rate IS the percentage
        : rate * (pointValue / 100); // Points: rate × point value in cents
      
      if (effectiveValue > bestValue) {
        bestValue = effectiveValue;
      }
    }
    
    return bestValue;
  };

  for (const card of cards) {
    const cardBonuses = categoryBonuses.filter(b => b.card_id === card.id);
    
    for (const bonus of cardBonuses) {
      if (!["top_category", "top_two_categories", "top_three_categories", "second_top_category"].includes(bonus.cap_type)) {
        continue;
      }

      const pointValue = getCardPointValue(card);
      const currencyType = card.primary_currency?.currency_type ?? "other";
      const isCashback = isCashbackCurrency(currencyType);
      const multiplier = cardMultipliers.get(card.id) ?? 1;
      
      // Calculate marginal value for each eligible category
      // Marginal value = (bonus_rate × point_value × spend) - (best_other_card_value × spend)
      const eligibleCategories = bonus.category_ids
        .map(catId => {
          const catSpending = categoryMap.get(catId);
          const spend = catSpending?.annual_spend_cents ?? 0;
          const catName = catSpending?.category_name ?? `ID:${catId}`;
          if (spend === 0) return { categoryId: catId, categoryName: catName, marginalValue: -Infinity, spend: 0, cardValue: 0, bestOtherValue: 0 };
          
          const bonusRate = bonus.elevated_rate * multiplier;
          const cardValue = isCashback 
            ? bonusRate 
            : bonusRate * (pointValue / 100);
          const bestOtherValue = getBestOtherCardValue(card.id, catId);
          
          // Marginal value = how much BETTER this card's bonus is than the best alternative
          // (per dollar spent, times total spend for ranking purposes)
          const marginalValue = (cardValue - bestOtherValue) * (spend / 100);
          
          return { categoryId: catId, categoryName: catName, marginalValue, spend, cardValue, bestOtherValue };
        })
        .filter(s => s.spend > 0)
        .sort((a, b) => b.marginalValue - a.marginalValue); // Sort by marginal value, not spend!
      
      // Debug logging for Amex Business Gold
      if (card.name.includes("Business Gold")) {
        console.error(`[TOP CATEGORY DEBUG] ${card.name} - ${bonus.cap_type}:`);
        eligibleCategories.forEach((ec, idx) => {
          console.error(`  ${idx + 1}. ${ec.categoryName}: spend=$${ec.spend/100}, cardValue=${ec.cardValue.toFixed(2)}¢, bestOther=${ec.bestOtherValue.toFixed(2)}¢, marginal=$${ec.marginalValue.toFixed(0)}`);
        });
      }

      let qualifyingCategories: number[] = [];
      
      switch (bonus.cap_type) {
        case "top_category":
          // Pick the category where this card's bonus provides the MOST value over alternatives
          qualifyingCategories = eligibleCategories.slice(0, 1).map(s => s.categoryId);
          break;
        case "top_two_categories":
          qualifyingCategories = eligibleCategories.slice(0, 2).map(s => s.categoryId);
          break;
        case "top_three_categories":
          qualifyingCategories = eligibleCategories.slice(0, 3).map(s => s.categoryId);
          break;
        case "second_top_category":
          // For "second top", we still use spending-based ranking since this is
          // typically used with "top_category" on the same card (e.g., Venmo)
          const bySpend = eligibleCategories.sort((a, b) => b.spend - a.spend);
          qualifyingCategories = bySpend.slice(1, 2).map(s => s.categoryId);
          break;
      }

      if (!result.has(card.id)) {
        result.set(card.id, new Set());
      }
      qualifyingCategories.forEach(catId => result.get(card.id)!.add(catId));
      
      // Debug: Log selected categories
      if (card.name.includes("Business Gold")) {
        const selectedNames = qualifyingCategories.map(id => categoryMap.get(id)?.category_name ?? id);
        console.error(`  => Selected: ${selectedNames.join(", ")}`);
      }
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
  travelPreferences: TravelPreference[],
  mobilePayCategories: Set<number> = new Set(),
  mobilePayCategoryId?: number,
  paypalCategories: Set<number> = new Set(),
  paypalCategoryId?: number
): Map<string, Map<number, RateInfo[]>> {
  // card_id -> category_id -> array of RateInfo (multiple rates possible with different caps)
  const result = new Map<string, Map<number, RateInfo[]>>();

  // First, build a map of card_id -> Mobile Pay rate info (for applying to user's mobile pay categories)
  const mobilePayRates = new Map<string, { rate: number; cap: number; postCapRate: number | null; ruleId: string }>();
  if (mobilePayCategoryId) {
    for (const rule of earningRules) {
      if (rule.category_id === mobilePayCategoryId && rule.booking_method === "any") {
        const annualCap = rule.has_cap ? annualizeCap(rule.cap_amount, rule.cap_period) : Infinity;
        mobilePayRates.set(rule.card_id, {
          rate: Number(rule.rate),
          cap: annualCap,
          postCapRate: rule.post_cap_rate !== null ? Number(rule.post_cap_rate) : null,
          ruleId: rule.id,
        });
      }
    }
  }

  // Build a map of card_id -> PayPal rate info (for applying to user's paypal categories)
  const paypalRates = new Map<string, { rate: number; cap: number; postCapRate: number | null; ruleId: string }>();
  if (paypalCategoryId) {
    for (const rule of earningRules) {
      if (rule.category_id === paypalCategoryId && rule.booking_method === "any") {
        const annualCap = rule.has_cap ? annualizeCap(rule.cap_amount, rule.cap_period) : Infinity;
        paypalRates.set(rule.card_id, {
          rate: Number(rule.rate),
          cap: annualCap,
          postCapRate: rule.post_cap_rate !== null ? Number(rule.post_cap_rate) : null,
          ruleId: rule.id,
        });
      }
    }
  }

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

  // Apply Mobile Pay rates to categories user has selected for mobile pay
  for (const categoryId of mobilePayCategories) {
    // Skip the Mobile Pay category itself (it already has the rule)
    if (categoryId === mobilePayCategoryId) continue;

    for (const [cardId, mobilePayRate] of mobilePayRates) {
      if (!result.has(cardId)) {
        result.set(cardId, new Map());
      }
      const cardMap = result.get(cardId)!;
      
      if (!cardMap.has(categoryId)) {
        cardMap.set(categoryId, []);
      }

      // Add Mobile Pay rate as an option for this category
      // IMPORTANT: Use the same cap key as the Mobile Pay rule itself so all
      // mobile pay spending shares the same cap (e.g., $5k/month)
      const capKey = `${cardId}:rule:${mobilePayRate.ruleId}`;
      
      cardMap.get(categoryId)!.push({
        rate: mobilePayRate.rate,
        annualCap: mobilePayRate.cap,
        postCapRate: mobilePayRate.postCapRate,
        capKey,
      });
    }
  }

  // Apply PayPal rates to categories user has selected for PayPal
  for (const categoryId of paypalCategories) {
    // Skip the PayPal category itself (it already has the rule)
    if (categoryId === paypalCategoryId) continue;

    for (const [cardId, paypalRate] of paypalRates) {
      if (!result.has(cardId)) {
        result.set(cardId, new Map());
      }
      const cardMap = result.get(cardId)!;
      
      if (!cardMap.has(categoryId)) {
        cardMap.set(categoryId, []);
      }

      // Add PayPal rate as an option for this category
      // IMPORTANT: Use the same cap key as the PayPal rule itself so all
      // PayPal spending shares the same cap
      const capKey = `${cardId}:rule:${paypalRate.ruleId}`;
      
      cardMap.get(categoryId)!.push({
        rate: paypalRate.rate,
        annualCap: paypalRate.cap,
        postCapRate: paypalRate.postCapRate,
        capKey,
      });
    }
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

      // For combined_categories and all_categories, use shared cap key
      // (cap is shared across all applicable categories)
      // For other types, each category has its own cap
      const capKey = (bonus.cap_type === "combined_categories" || bonus.cap_type === "all_categories")
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
  getCardCurrencyInfo: (card: CardInput) => { valueCents: number; isCashback: boolean; excluded: boolean },
  debitPayValues: Map<string, number> = new Map(),
  cardMultipliers: Map<string, number> = new Map(),
  isCategoryExcluded: boolean = false,
  // For >$5k portions: also consider rates from the >$5k category and use MAX
  isLargePurchasePortion: boolean = false,
  originalCategoryId?: number,
  largePurchaseCategoryId?: number
): RankedCard[] {
  const ranked: RankedCard[] = [];

  for (const card of cards) {
    const currencyInfo = getCardCurrencyInfo(card);
    
    // Skip excluded cards entirely (they shouldn't receive any spending)
    if (currencyInfo.excluded) continue;
    
    // Get rates for the category
    let cardRates = earningRateMap.get(card.id)?.get(categoryId) ?? [];
    
    // For >$5k portions, also check the >$5k category rates and use MAX
    if (isLargePurchasePortion && largePurchaseCategoryId && originalCategoryId) {
      // Get both parent category rates and >$5k rates
      const parentRates = earningRateMap.get(card.id)?.get(originalCategoryId) ?? [];
      const largePurchaseRates = earningRateMap.get(card.id)?.get(largePurchaseCategoryId) ?? [];
      
      // Combine: we want to consider both options and pick the best
      // If card has >$5k rate, it can use that. If card has parent category rate, it can use that.
      // The allocation will sort by value and pick the best.
      cardRates = [...parentRates, ...largePurchaseRates];
    }
    
    // Debit pay bonus adds a flat % return on all spend with this card
    const debitPayBonus = (debitPayValues.get(card.id) ?? 0) / 100;
    // Earning multiplier (e.g., BoA Preferred Rewards 1.75x)
    const multiplier = cardMultipliers.get(card.id) ?? 1;

    if (cardRates.length === 0) {
      // For excluded_by_default categories (like Rent/Mortgage), cards without
      // explicit earning rules should NOT earn their default rate - they earn 0%
      // Only cards with explicit rules (like Bilt for Rent) should earn on these.
      if (isCategoryExcluded) {
        continue; // Skip this card - it has no earning rule for an excluded category
      }
      
      // Use default rate
      const baseRate = card.default_earn_rate;
      const rate = baseRate * multiplier;
      const baseValue = currencyInfo.isCashback 
        ? rate / 100 
        : rate * (currencyInfo.valueCents / 100);
      const effectiveValue = baseValue + debitPayBonus;
      
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
        
        // Apply multiplier to rates
        const effectiveRate = rateInfo.rate * multiplier;
        const effectivePostCapRate = rateInfo.postCapRate !== null ? rateInfo.postCapRate * multiplier : null;
        
        const baseValue = currencyInfo.isCashback 
          ? effectiveRate / 100 
          : effectiveRate * (currencyInfo.valueCents / 100);
        const effectiveValue = baseValue + debitPayBonus;

        // Only add if there's room in cap or there's a post-cap rate
        if (hasRoomInCap || effectivePostCapRate !== null) {
          ranked.push({
            card,
            rate: effectiveRate,
            annualCap: rateInfo.annualCap,
            postCapRate: effectivePostCapRate,
            capKey: rateInfo.capKey,
            effectiveValue: hasRoomInCap ? effectiveValue : debitPayBonus, // If cap exhausted, only debit pay value for sorting
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
  debitPayBonus: number,
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
  cardEarnings.totalDebitPay += debitPayBonus;

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

// ============================================================================
// Card Recommendations Engine
// ============================================================================

export interface CardRecommendation {
  card: CardInput;
  defaultPerksValue: number;
  currentNetEarnings: number;
  newNetEarnings: number;
  improvement: number; // positive = better
  improvementPercent: number;
}

export interface RecommendationsInput extends CalculatorInput {
  allCards: (CardInput & { default_perks_value: number | null; exclude_from_recommendations?: boolean })[]; // All available cards with default perks
  allEarningRules: EarningRuleInput[]; // ALL earning rules (not filtered to user's cards)
  allCategoryBonuses: CategoryBonusInput[]; // ALL category bonuses (not filtered to user's cards)
}

/**
 * Helper: Find the optimal category for a selected_category bonus based on marginal value.
 */
function findOptimalCategoryForBonus(
  bonus: CategoryBonusInput,
  candidate: CardInput,
  categoryMap: Map<number, CategorySpending>,
  currencyValues: Map<string, number>,
  currentReturns: PortfolioReturns,
  enabledSecondaryCards: Set<string>
): number | null {
  let bestCategoryId: number | null = null;
  let bestMarginalValue = -Infinity;
  
  const candidateCurrency = enabledSecondaryCards.has(candidate.id) && candidate.secondary_currency
    ? candidate.secondary_currency
    : candidate.primary_currency;
  const isCashback = candidateCurrency?.currency_type === 'cash_back' || candidateCurrency?.currency_type === 'crypto';
  const currencyValue = candidateCurrency?.id 
    ? currencyValues.get(candidateCurrency.id) ?? 1.0
    : 1.0;
  
  for (const catId of bonus.category_ids) {
    const categorySpend = categoryMap.get(catId);
    if (!categorySpend || categorySpend.annual_spend_cents <= 0) continue;
    
    // Calculate value per dollar from this bonus
    const bonusValuePerDollar = isCashback 
      ? bonus.elevated_rate / 100
      : bonus.elevated_rate * (currencyValue / 100);
    
    // Find current best card for this category
    const currentAlloc = currentReturns.categoryBreakdown.find(c => c.categoryId === catId);
    const currentBestValue = currentAlloc?.allocations[0]?.earnedValue 
      ? currentAlloc.allocations[0].earnedValue / (currentAlloc.allocations[0].spend || 1)
      : 0;
    
    const marginalValue = (bonusValuePerDollar - currentBestValue) * (categorySpend.annual_spend_cents / 100);
    
    if (marginalValue > bestMarginalValue) {
      bestMarginalValue = marginalValue;
      bestCategoryId = catId;
    }
  }
  
  return bestCategoryId;
}

/**
 * Calculates the top N card recommendations based on net earnings improvement.
 * For each card not in the user's wallet, this calculates what the net earnings
 * would be if they added it, using the card's default perks value.
 */
export function calculateCardRecommendations(
  input: RecommendationsInput,
  currentReturns: PortfolioReturns,
  topN: number = 3
): CardRecommendation[] {
  const { allCards, allEarningRules, allCategoryBonuses, cards: userCards, ...baseInput } = input;
  
  // Get IDs of cards already in wallet
  const userCardIds = new Set(userCards.map(c => c.id));
  
  // Filter to cards not in wallet and not excluded from recommendations
  const candidateCards = allCards.filter(c => 
    !userCardIds.has(c.id) && !c.exclude_from_recommendations
  );
  
  const currentNetEarnings = currentReturns.netValueEarned;
  const recommendations: CardRecommendation[] = [];

  // Pre-compute top categories using ONLY user's original cards
  // This prevents candidate cards from affecting existing cards' top category selections
  const categoryMap = new Map<number, CategorySpending>();
  baseInput.spending?.forEach(s => categoryMap.set(s.category_id, s));
  
  // Build combined currency values
  const combinedCurrencyValues = new Map<string, number>();
  baseInput.defaultCurrencyValues?.forEach((v, k) => combinedCurrencyValues.set(k, v));
  baseInput.userCurrencyValues?.forEach((v, k) => combinedCurrencyValues.set(k, v));
  
  // Build card multipliers for user's cards
  const cardMultipliers = new Map<string, number>();
  for (const program of (baseInput.multiplierPrograms ?? [])) {
    for (const card of userCards) {
      const currencyId = baseInput.enabledSecondaryCards?.has(card.id) && card.secondary_currency
        ? card.secondary_currency.id
        : card.primary_currency?.id;
      const isEligible = 
        program.applicableCardIds.includes(card.id) ||
        (currencyId && program.applicableCurrencyIds.includes(currencyId));
      if (isEligible) {
        const existing = cardMultipliers.get(card.id) ?? 1;
        cardMultipliers.set(card.id, Math.max(existing, program.multiplier));
      }
    }
  }
  
  for (const candidate of candidateCards) {
    // Add this card to the user's wallet
    const cardsWithCandidate = [...userCards, candidate];
    const cardIdsWithCandidate = new Set([...userCardIds, candidate.id]);
    
    // Update enabled secondary cards based on new wallet
    const userPrimaryCurrencyIds = new Set<string>();
    cardsWithCandidate.forEach((c) => {
      userPrimaryCurrencyIds.add(c.primary_currency_id);
    });
    
    const enabledSecondaryCardsNew = new Set<string>();
    cardsWithCandidate.forEach((c) => {
      if (c.secondary_currency_id && userPrimaryCurrencyIds.has(c.secondary_currency_id)) {
        enabledSecondaryCardsNew.add(c.id);
      }
    });

    // Create perks values map with the candidate's default perks value
    // Cap perks value to annual fee so net fee is never negative for recommendations
    // This prevents cards like Delta Blue (high perks, $0 fee) from artificially boosting scores
    const perksWithCandidate = new Map(input.perksValues);
    const rawDefaultPerksValue = candidate.default_perks_value ?? 0;
    const cappedPerksValue = Math.min(rawDefaultPerksValue, candidate.annual_fee);
    perksWithCandidate.set(candidate.id, cappedPerksValue);

    // Filter earning rules to include user's cards + candidate card
    const earningRulesWithCandidate = allEarningRules.filter(r => cardIdsWithCandidate.has(r.card_id));
    const categoryBonusesWithCandidate = allCategoryBonuses.filter(b => cardIdsWithCandidate.has(b.card_id));

    // For selected_category bonuses on the candidate card, simulate the optimal selection
    // This allows cards like BoA Business Customized Cash to be properly evaluated
    const userSelectionsWithCandidate = new Map(baseInput.userSelections);
    const candidateSelectedBonuses = allCategoryBonuses.filter(b => b.card_id === candidate.id && b.cap_type === 'selected_category');
    for (const bonus of candidateSelectedBonuses) {
      // Find the optimal category: the one where this card's bonus provides the most marginal value
      const bestCategoryId = findOptimalCategoryForBonus(bonus, candidate, categoryMap, combinedCurrencyValues, currentReturns, enabledSecondaryCardsNew);
      if (bestCategoryId !== null) {
        userSelectionsWithCandidate.set(bonus.id, bestCategoryId);
      }
    }
    
    // Calculate returns with this card added
    // Don't pass preComputedTopCategories - let calculatePortfolioReturns compute optimal
    // top categories for ALL cards together (including the candidate)
    // This matches what actually happens when the card is added to the wallet
    const returnsWithCard = calculatePortfolioReturns({
      ...baseInput,
      cards: cardsWithCandidate,
      earningRules: earningRulesWithCandidate,
      categoryBonuses: categoryBonusesWithCandidate,
      perksValues: perksWithCandidate,
      enabledSecondaryCards: enabledSecondaryCardsNew,
      userSelections: userSelectionsWithCandidate,
      // No preComputedTopCategories - compute dynamically for all cards together
    });

    const newNetEarnings = returnsWithCard.netValueEarned;
    const improvement = newNetEarnings - currentNetEarnings;
    const improvementPercent = currentNetEarnings !== 0 
      ? (improvement / Math.abs(currentNetEarnings)) * 100 
      : 0;

    // Only consider cards that would improve earnings
    if (improvement > 0) {
      recommendations.push({
        card: candidate,
        defaultPerksValue: cappedPerksValue,
        currentNetEarnings,
        newNetEarnings,
        improvement,
        improvementPercent,
      });
    }
  }

  // Sort by improvement (descending) and take top N
  recommendations.sort((a, b) => b.improvement - a.improvement);
  return recommendations.slice(0, topN);
}

