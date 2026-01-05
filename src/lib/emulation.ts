"use server";

/**
 * User Emulation Utilities (Admin Only)
 * 
 * Allows admin users to view the app as another user would see it.
 * Only affects data reads - mutations still use the real user ID for safety.
 */

import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "./admin";

const EMULATION_COOKIE_NAME = "cardtool_emulate_user";
const EMULATION_EMAIL_COOKIE_NAME = "cardtool_emulate_email";

export interface EmulationInfo {
  isEmulating: boolean;
  emulatedUserId: string | null;
  emulatedUserEmail: string | null;
  realUserId: string;
}

/**
 * Get the effective user ID for data reads.
 * Returns emulated user ID if admin is emulating, otherwise real user ID.
 * 
 * @returns The user ID to use for database queries
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress;
  
  // Only admins can emulate
  if (!isAdminEmail(email)) {
    return user.id;
  }

  const cookieStore = await cookies();
  const emulatedUserId = cookieStore.get(EMULATION_COOKIE_NAME)?.value;

  if (emulatedUserId) {
    return emulatedUserId;
  }

  return user.id;
}

/**
 * Get full emulation state for display (e.g., in the banner).
 */
export async function getEmulationInfo(): Promise<EmulationInfo | null> {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress;
  const isAdmin = isAdminEmail(email);

  const cookieStore = await cookies();
  const emulatedUserId = cookieStore.get(EMULATION_COOKIE_NAME)?.value ?? null;
  const emulatedUserEmail = cookieStore.get(EMULATION_EMAIL_COOKIE_NAME)?.value ?? null;

  return {
    isEmulating: isAdmin && !!emulatedUserId,
    emulatedUserId: isAdmin ? emulatedUserId : null,
    emulatedUserEmail: isAdmin ? emulatedUserEmail : null,
    realUserId: user.id,
  };
}

/**
 * Start emulating a user. Admin only.
 * Sets a cookie with the target user ID and redirects to wallet.
 */
export async function startEmulation(userId: string, userEmail: string | null): Promise<void> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!isAdminEmail(email)) {
    throw new Error("Not authorized");
  }

  // Verify target user exists
  const clerk = await clerkClient();
  try {
    await clerk.users.getUser(userId);
  } catch {
    throw new Error("Target user not found");
  }

  const cookieStore = await cookies();
  
  // Set cookies - expire in 24 hours
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  cookieStore.set(EMULATION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });

  if (userEmail) {
    cookieStore.set(EMULATION_EMAIL_COOKIE_NAME, userEmail, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
      path: "/",
    });
  }

  redirect("/wallet");
}

/**
 * Stop emulating and return to admin view.
 */
export async function stopEmulation(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.delete(EMULATION_COOKIE_NAME);
  cookieStore.delete(EMULATION_EMAIL_COOKIE_NAME);

  redirect("/admin/users");
}
