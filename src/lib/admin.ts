/**
 * Admin access control utilities
 * 
 * Admin users are defined by the ADMIN_EMAILS environment variable,
 * which should be a comma-separated list of email addresses.
 * 
 * Example: ADMIN_EMAILS=admin@example.com,owner@example.com
 */

import { currentUser } from "@clerk/nextjs/server";

/**
 * Check if an email address belongs to an admin user
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  // Remove any surrounding quotes from env var and split by comma
  const rawEmails = process.env.ADMIN_EMAILS?.replace(/^["']|["']$/g, "") ?? "";
  const adminEmails = rawEmails.split(",").map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Check if the current authenticated user is an admin
 * For use in Server Components and Server Actions
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  
  const email = user.emailAddresses?.[0]?.emailAddress;
  return isAdminEmail(email);
}

/**
 * Get the list of admin emails (for debugging/display purposes)
 */
export function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) ?? [];
}

