/**
 * Cached Data Fetching
 * 
 * This module provides cached versions of frequently-accessed reference data
 * that rarely changes. Uses Next.js unstable_cache for server-side caching
 * with tag-based invalidation.
 * 
 * Cache Strategy:
 * - Reference data (cards, categories, currencies, rules): 1 hour cache
 * - Invalidate via revalidateTag() in admin pages when data changes
 * 
 * Usage:
 * - Import cached functions instead of querying Supabase directly
 * - For user-specific data, continue using createClient() with fresh queries
 */

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

// ============================================================================
// Cards
// ============================================================================

export const getCachedCards = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
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
        search_aliases,
        network,
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (
          id, name, code, currency_type, base_value_cents
        ),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (
          id, name, code, currency_type, base_value_cents
        ),
        issuer:issuers (id, name)
      `)
      .eq("is_active", true)
      .order("name");
    
    if (error) {
      console.error("Error fetching cached cards:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-cards"],
  { revalidate: 3600, tags: ["cards"] }
);

// Lighter version for dropdowns/selection (less data transferred)
export const getCachedCardsForSelection = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cards")
      .select(`
        id,
        name,
        slug,
        annual_fee,
        issuer:issuers (name),
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (name)
      `)
      .eq("is_active", true)
      .order("name");
    
    if (error) {
      console.error("Error fetching cached cards for selection:", error);
      return [];
    }
    return data ?? [];
  },
  ["cards-for-selection"],
  { revalidate: 3600, tags: ["cards"] }
);

// ============================================================================
// Categories
// ============================================================================

export const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("earning_categories")
      .select("id, name, slug, parent_category_id, excluded_by_default");
    
    if (error) {
      console.error("Error fetching cached categories:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-categories"],
  { revalidate: 3600, tags: ["categories"] }
);

// Special category lookups (mobile pay, paypal, large purchase)
export const getCachedSpecialCategoryIds = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [mobilePayResult, paypalResult, largePurchaseResult] = await Promise.all([
      supabase.from("earning_categories").select("id").eq("slug", "mobile-pay").single(),
      supabase.from("earning_categories").select("id").eq("slug", "paypal").single(),
      supabase.from("earning_categories").select("id").eq("slug", "over-5k").single(),
    ]);
    
    // Log actual query errors (not "not found" errors which are expected if categories don't exist)
    if (mobilePayResult.error && mobilePayResult.error.code !== "PGRST116") {
      console.error("Error fetching mobile-pay category:", mobilePayResult.error);
    }
    if (paypalResult.error && paypalResult.error.code !== "PGRST116") {
      console.error("Error fetching paypal category:", paypalResult.error);
    }
    if (largePurchaseResult.error && largePurchaseResult.error.code !== "PGRST116") {
      console.error("Error fetching over-5k category:", largePurchaseResult.error);
    }
    
    return {
      mobilePayCategoryId: mobilePayResult.data?.id as number | undefined,
      paypalCategoryId: paypalResult.data?.id as number | undefined,
      largePurchaseCategoryId: largePurchaseResult.data?.id as number | undefined,
    };
  },
  ["special-category-ids"],
  { revalidate: 3600, tags: ["categories"] }
);

// ============================================================================
// Currencies
// ============================================================================

export const getCachedCurrencies = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type, base_value_cents, cash_out_value_cents")
      .order("name");
    
    if (error) {
      console.error("Error fetching cached currencies:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-currencies"],
  { revalidate: 3600, tags: ["currencies"] }
);

// ============================================================================
// Issuers
// ============================================================================

export const getCachedIssuers = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("issuers")
      .select("id, name")
      .order("name");
    
    if (error) {
      console.error("Error fetching cached issuers:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-issuers"],
  { revalidate: 3600, tags: ["issuers"] }
);

// ============================================================================
// Earning Rules
// ============================================================================

export const getCachedEarningRules = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("card_earning_rules")
      .select("id, card_id, category_id, rate, has_cap, cap_amount, cap_period, cap_unit, post_cap_rate, booking_method, brand_name");
    
    if (error) {
      console.error("Error fetching cached earning rules:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-earning-rules"],
  { revalidate: 3600, tags: ["earning-rules", "cards"] }
);

// ============================================================================
// Card Caps (Category Bonuses)
// ============================================================================

export const getCachedCardCaps = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
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
      `);
    
    if (error) {
      console.error("Error fetching cached card caps:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-card-caps"],
  { revalidate: 3600, tags: ["card-caps", "cards"] }
);

// ============================================================================
// Point Value Templates
// ============================================================================

export const getCachedPointValueTemplates = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("point_value_templates")
      .select(`
        id,
        name,
        is_default,
        template_currency_values (currency_id, value_cents)
      `);
    
    if (error) {
      console.error("Error fetching cached templates:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-point-value-templates"],
  { revalidate: 3600, tags: ["point-value-templates"] }
);

// ============================================================================
// Multiplier Programs
// ============================================================================

export const getCachedMultiplierPrograms = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("earning_multiplier_programs")
      .select(`
        id,
        name,
        earning_multiplier_tiers (id, name, multiplier),
        earning_multiplier_currencies (currency_id),
        earning_multiplier_cards (card_id)
      `);
    
    if (error) {
      console.error("Error fetching cached multiplier programs:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-multiplier-programs"],
  { revalidate: 3600, tags: ["multiplier-programs"] }
);

// ============================================================================
// Card Credits
// ============================================================================

export const getCachedCardCredits = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("card_credits")
      .select(`
        id,
        card_id,
        name,
        brand_name,
        reset_cycle,
        default_value_cents,
        default_quantity,
        unit_name,
        renewal_period_months,
        credit_count,
        notes,
        travel_category
      `)
      .eq("is_active", true);
    
    if (error) {
      console.error("Error fetching cached card credits:", error);
      return [];
    }
    return data ?? [];
  },
  ["all-card-credits"],
  { revalidate: 3600, tags: ["card-credits", "cards"] }
);

// ============================================================================
// Helper: Build common maps from cached data
// ============================================================================

export async function getCachedCategoryMaps() {
  const categories = await getCachedCategories();
  
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  const categoryNameMap = new Map<number, string>();
  const categorySlugMap = new Map<number, string>();
  
  categories.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
    categoryNameMap.set(c.id, c.name);
    categorySlugMap.set(c.id, c.slug);
  });
  
  return { categoryExclusionMap, categoryParentMap, categoryNameMap, categorySlugMap };
}

export async function getCachedCurrencyMaps() {
  const currencies = await getCachedCurrencies();
  
  const defaultCurrencyValues = new Map<string, number>();
  const cashOutValues = new Map<string, number>();
  
  currencies.forEach((c) => {
    if (c.base_value_cents) {
      defaultCurrencyValues.set(c.id, parseFloat(String(c.base_value_cents)));
    }
    if (c.cash_out_value_cents) {
      cashOutValues.set(c.id, c.cash_out_value_cents);
    }
  });
  
  return { defaultCurrencyValues, cashOutValues, currencies };
}

/**
 * Get currency values with template applied
 * Templates override base currency values for certain valuation strategies
 */
export async function getCachedCurrencyValuesWithTemplate(selectedTemplateId: string | null) {
  const [{ defaultCurrencyValues, cashOutValues }, templates] = await Promise.all([
    getCachedCurrencyMaps(),
    getCachedPointValueTemplates(),
  ]);
  
  // Find selected template or default
  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
  const effectiveTemplateId = selectedTemplateId ?? defaultTemplate?.id ?? null;
  const selectedTemplate = templates.find((t) => t.id === effectiveTemplateId);
  
  // Apply template values over defaults
  if (selectedTemplate?.template_currency_values) {
    for (const tv of selectedTemplate.template_currency_values) {
      defaultCurrencyValues.set(tv.currency_id, parseFloat(String(tv.value_cents)));
    }
  }
  
  return { defaultCurrencyValues, cashOutValues, selectedTemplateId: effectiveTemplateId };
}

