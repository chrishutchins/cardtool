/**
 * Cache Invalidation Utilities
 * 
 * Use these functions in admin pages and server actions to invalidate
 * the appropriate caches when reference data changes.
 * 
 * Note: Next.js 16 requires a second 'profile' argument for revalidateTag.
 * Using 'max' enables stale-while-revalidate semantics (recommended).
 */

import { revalidateTag } from "next/cache";

/**
 * Invalidate all card-related caches
 * Call when: cards are created, updated, or deleted
 */
export function invalidateCardCaches() {
  revalidateTag("cards", "max");
  // Also invalidate dependent caches
  revalidateTag("earning-rules", "max");
  revalidateTag("card-caps", "max");
  revalidateTag("card-credits", "max");
}

/**
 * Invalidate earning rule caches
 * Call when: earning rules are created, updated, or deleted
 */
export function invalidateEarningRuleCaches() {
  revalidateTag("earning-rules", "max");
}

/**
 * Invalidate card cap caches
 * Call when: card caps/bonuses are created, updated, or deleted
 */
export function invalidateCardCapCaches() {
  revalidateTag("card-caps", "max");
}

/**
 * Invalidate category caches
 * Call when: categories are created, updated, or deleted
 */
export function invalidateCategoryCaches() {
  revalidateTag("categories", "max");
}

/**
 * Invalidate currency caches
 * Call when: currencies are created, updated, or deleted
 */
export function invalidateCurrencyCaches() {
  revalidateTag("currencies", "max");
}

/**
 * Invalidate point value template caches
 * Call when: templates are created, updated, or deleted
 */
export function invalidateTemplateCaches() {
  revalidateTag("point-value-templates", "max");
}

/**
 * Invalidate multiplier program caches
 * Call when: multiplier programs are created, updated, or deleted
 */
export function invalidateMultiplierCaches() {
  revalidateTag("multiplier-programs", "max");
}

/**
 * Invalidate card credit caches
 * Call when: card credits are created, updated, or deleted
 */
export function invalidateCreditCaches() {
  revalidateTag("card-credits", "max");
}

/**
 * Invalidate all reference data caches
 * Use sparingly - prefer targeted invalidation
 */
export function invalidateAllReferenceCaches() {
  revalidateTag("cards", "max");
  revalidateTag("categories", "max");
  revalidateTag("currencies", "max");
  revalidateTag("earning-rules", "max");
  revalidateTag("card-caps", "max");
  revalidateTag("point-value-templates", "max");
  revalidateTag("multiplier-programs", "max");
  revalidateTag("card-credits", "max");
}

