/**
 * Browser-side Supabase Client with Clerk JWT Authentication
 * 
 * This client passes Clerk session tokens to Supabase, enabling proper
 * RLS policies that verify user identity at the database level.
 * 
 * IMPORTANT: Use the useSupabaseClient() hook in React components.
 * The createClient() function is kept for backwards compatibility but
 * should be migrated to the hook-based approach.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";
import { Database } from "@/lib/database.types";

/**
 * React hook to create a Supabase client with Clerk authentication.
 * Use this in React components for secure database access.
 */
export function useSupabaseClient() {
  const { session } = useSession();
  
  return useMemo(() => {
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () => {
          // Get the Clerk session token to pass to Supabase
          // This token is verified by Supabase's Third-Party Auth integration
          return session?.getToken() ?? null;
        },
      }
    );
  }, [session]);
}

/**
 * @deprecated Use useSupabaseClient() hook instead for proper Clerk authentication.
 * This function creates a client without auth tokens and should only be used
 * for public/read-only operations on reference data.
 */
export function createClient() {
  console.warn(
    "[Supabase] createClient() is deprecated. Use useSupabaseClient() hook for authenticated access."
  );
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
