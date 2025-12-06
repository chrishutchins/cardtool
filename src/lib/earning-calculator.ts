/**
 * Earning Calculator Utility
 * 
 * This module provides functions for calculating effective earning rates
 * taking into account:
 * - Category inheritance (e.g., Flights inheriting from All Travel)
 * - Travel booking preferences (direct, portal, brand)
 * - Booking method restrictions on earning rules
 */

export interface EarningRule {
  card_id: string;
  category_id: number;
  rate: number;
  booking_method: "any" | "portal" | "brand";
  brand_name: string | null;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  parent_category_id: number | null;
}

export interface TravelPreference {
  category_slug: string;
  preference_type: "direct" | "brand" | "portal";
  brand_name: string | null;
  portal_issuer_id: string | null;
}

export interface CardInfo {
  id: string;
  name: string;
  issuer_id: string;
  default_earn_rate: number;
}

// Travel subcategory slugs
const TRAVEL_SUBCATEGORY_SLUGS = ["flights", "hotels", "rental-car"];

/**
 * Check if a category is a travel subcategory
 */
export function isTravelSubcategory(category: Category): boolean {
  return TRAVEL_SUBCATEGORY_SLUGS.includes(category.slug) || 
         category.parent_category_id !== null;
}

/**
 * Get the effective earning rate for a card on a specific category
 * considering booking preferences and category inheritance.
 * 
 * @param card - The card to check
 * @param category - The category to get the rate for
 * @param allRules - All earning rules for the user's cards
 * @param allCategories - All categories (for parent lookup)
 * @param travelPreferences - User's travel booking preferences
 * @returns The effective earning rate, or the card's default rate if no rule applies
 */
export function getEffectiveEarningRate(
  card: CardInfo,
  category: Category,
  allRules: EarningRule[],
  allCategories: Category[],
  travelPreferences: TravelPreference[]
): number {
  // Get rules for this card
  const cardRules = allRules.filter(r => r.card_id === card.id);
  
  // Get travel preference for this category if it's a travel subcategory
  const travelPref = isTravelSubcategory(category)
    ? travelPreferences.find(p => p.category_slug === category.slug) ?? null
    : null;

  // Find rules for this specific category
  const categoryRules = cardRules.filter(r => r.category_id === category.id);
  
  // Filter rules based on booking preference
  const applicableRules = filterRulesByBookingPreference(
    categoryRules,
    travelPref,
    card.issuer_id
  );

  // If we found a matching rule, use it
  if (applicableRules.length > 0) {
    // Return the highest applicable rate
    return Math.max(...applicableRules.map(r => r.rate));
  }

  // If no direct rule, check for parent category rule (e.g., All Travel)
  if (category.parent_category_id) {
    const parentCategory = allCategories.find(c => c.id === category.parent_category_id);
    if (parentCategory) {
      const parentRules = cardRules.filter(r => r.category_id === parentCategory.id);
      const applicableParentRules = filterRulesByBookingPreference(
        parentRules,
        travelPref,
        card.issuer_id
      );
      
      if (applicableParentRules.length > 0) {
        return Math.max(...applicableParentRules.map(r => r.rate));
      }
    }
  }

  // Fall back to card's default earn rate
  return card.default_earn_rate;
}

/**
 * Filter earning rules based on user's booking preference
 */
function filterRulesByBookingPreference(
  rules: EarningRule[],
  travelPref: TravelPreference | null,
  cardIssuerId: string
): EarningRule[] {
  if (!travelPref) {
    // No preference set - use rules that work for any booking method
    return rules.filter(r => r.booking_method === "any");
  }

  switch (travelPref.preference_type) {
    case "direct":
      // Only rules that work for any booking method
      return rules.filter(r => r.booking_method === "any");
    
    case "brand":
      // Rules for any booking OR matching brand
      return rules.filter(r => 
        r.booking_method === "any" || 
        (r.booking_method === "brand" && r.brand_name === travelPref.brand_name)
      );
    
    case "portal":
      // Rules for any booking OR portal (if card issuer matches)
      return rules.filter(r => 
        r.booking_method === "any" || 
        (r.booking_method === "portal" && cardIssuerId === travelPref.portal_issuer_id)
      );
    
    default:
      return rules.filter(r => r.booking_method === "any");
  }
}

/**
 * Find the best card for a specific category from a list of cards
 * 
 * @param cards - The user's cards
 * @param category - The category to find the best card for
 * @param allRules - All earning rules for the user's cards
 * @param allCategories - All categories
 * @param travelPreferences - User's travel booking preferences
 * @param currencyValues - Map of currency_id to value in cents
 * @returns The best card and its effective earning value
 */
export function findBestCardForCategory(
  cards: Array<CardInfo & { primary_currency_id: string }>,
  category: Category,
  allRules: EarningRule[],
  allCategories: Category[],
  travelPreferences: TravelPreference[],
  currencyValues: Map<string, number>
): { card: (typeof cards)[0]; rate: number; value: number } | null {
  if (cards.length === 0) return null;

  let bestCard = cards[0];
  let bestRate = 0;
  let bestValue = 0;

  for (const card of cards) {
    const rate = getEffectiveEarningRate(
      card,
      category,
      allRules,
      allCategories,
      travelPreferences
    );

    const currencyValue = currencyValues.get(card.primary_currency_id) ?? 100; // Default to 1 cent
    const effectiveValue = rate * currencyValue;

    if (effectiveValue > bestValue) {
      bestCard = card;
      bestRate = rate;
      bestValue = effectiveValue;
    }
  }

  return { card: bestCard, rate: bestRate, value: bestValue };
}

/**
 * Format a rate for display based on currency type
 * Cash back and crypto currencies show as percentages (e.g., "6%")
 * Points and miles show as multipliers (e.g., "6x")
 */
export function formatRate(
  rate: number,
  currencyType?: string | null
): string {
  const isCashLike = currencyType === "cash_back" || currencyType === "crypto" || currencyType === "cash";
  return isCashLike ? `${rate}%` : `${rate}x`;
}

