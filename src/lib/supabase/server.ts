/**
 * Server-side Supabase Client Configuration with Clerk JWT Authentication
 * 
 * This module provides Supabase clients for server-side operations that
 * integrate with Clerk's authentication system.
 * 
 * Security Model:
 * 1. createClient() - Uses Clerk JWT for authenticated requests with proper RLS
 * 2. createAdminClient() - Uses service role key, bypasses RLS (use after verifying auth)
 * 3. RLS policies use `auth.jwt()->>'sub'` to verify user identity
 * 
 * SETUP REQUIRED:
 * 1. Configure Clerk for Supabase: https://dashboard.clerk.com/setup/supabase
 * 2. Add Third-Party Auth in Supabase: Dashboard → Auth → Third Party → Add Clerk
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { Database } from "@/lib/database.types";

/**
 * Creates a Supabase client for server-side operations with Clerk JWT authentication.
 * The Clerk session token is passed to Supabase for RLS policy verification.
 * 
 * Use this for all authenticated database operations in Server Components and API routes.
 * 
 * NOTE: In development with DEV_USER_ID_OVERRIDE, uses admin client since the
 * JWT's sub won't match the overridden user ID. The override is only used for
 * local development with production data - auth is still verified via Clerk.
 */
export async function createClient() {
  // In development with user override, use admin client since RLS won't match
  // (JWT sub is dev user, but we're accessing prod user's data)
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID_OVERRIDE) {
    return createAdminClient();
  }

  const { getToken } = await auth();

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        // Get Clerk session token to pass to Supabase for RLS verification
        return await getToken() ?? null;
      },
    }
  );
}

/**
 * Creates a Supabase client with service role privileges.
 * This bypasses ALL RLS policies - use with extreme caution!
 * 
 * Only use this when:
 * - You've already verified the user's identity via Clerk
 * - You need to perform admin operations
 * - You need to access data across users (e.g., cron jobs)
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Creates an untyped Supabase client with service role for tables not in generated types.
 * Use this sparingly - prefer regenerating types when possible.
 */
export function createUntypedClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
