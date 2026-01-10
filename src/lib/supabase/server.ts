/**
 * Server-side Supabase Client Configuration
 * 
 * ============================================================================
 * AUTHENTICATION MODEL - READ THIS FIRST
 * ============================================================================
 * 
 * This app uses CLERK for authentication, NOT Supabase Auth.
 * All Supabase clients here use the SERVICE ROLE KEY which BYPASSES RLS.
 * 
 * Security is enforced at the APPLICATION layer:
 * 1. Routes verify auth via Clerk's currentUser() BEFORE any database access
 * 2. Queries filter by user_id manually (using effectiveUserId helper)
 * 
 * RLS policies exist in the database but are NOT used - the service role
 * bypasses them entirely. See ARCHITECTURE.md for full details.
 * ============================================================================
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

/**
 * Creates a Supabase client using the SERVICE ROLE KEY (bypasses RLS).
 * 
 * Security checklist before using:
 * - ✓ Verified user is authenticated via Clerk (currentUser())
 * - ✓ Filtering queries by effectiveUserId for user-specific data
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** @deprecated Use createServiceRoleClient instead */
export const createClient = createServiceRoleClient;

/** @deprecated Use createServiceRoleClient instead */
export const createAdminClient = createServiceRoleClient;

/**
 * Creates an untyped Supabase client (service role) for tables not in generated types.
 * Use sparingly - prefer regenerating types when possible.
 */
export function createUntypedServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** @deprecated Use createUntypedServiceRoleClient instead */
export const createUntypedClient = createUntypedServiceRoleClient;
