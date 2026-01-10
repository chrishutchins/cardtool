/**
 * Server-side Supabase Client Configuration
 * 
 * IMPORTANT: This app uses Clerk for authentication, NOT Supabase Auth.
 * 
 * Security Model:
 * - All routes verify authentication via Clerk's currentUser() BEFORE database access
 * - All queries filter by user_id manually (effectiveUserId)
 * - We use the service role client (bypasses RLS)
 * - This is secure because auth is enforced at the application layer via Clerk
 * 
 * Note: The Clerk Supabase integration JWT template ('supabase') was not found.
 * If you want to use RLS with Clerk, create a JWT template named 'supabase' in Clerk Dashboard.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

/**
 * Creates a Supabase client for server-side operations.
 * Uses service role to bypass RLS since we authenticate via Clerk, not Supabase Auth.
 * 
 * ALWAYS verify the user is authenticated via Clerk (currentUser()) before calling this.
 * ALWAYS filter queries by effectiveUserId to ensure users only access their own data.
 */
export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Alias for createClient - both use service role.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Creates an untyped Supabase client for tables not in generated types.
 * Use this sparingly - prefer regenerating types when possible.
 */
export function createUntypedClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
