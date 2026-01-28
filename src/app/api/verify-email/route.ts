import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient, createUntypedClient } from "@/lib/supabase/server";
import { checkRateLimit, ratelimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  // Rate limit: 5 requests per minute per IP
  const { success } = await checkRateLimit(ratelimit, `verify-email:${ip}`);

  if (!success) {
    logger.warn({ ip }, "Email verification rate limited");
    return NextResponse.json(
      { whitelisted: false, error: "Rate limited" },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { whitelisted: false, error: "Invalid email" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user already exists in Clerk
    const clerk = await clerkClient();
    const existingUsers = await clerk.users.getUserList({
      emailAddress: [normalizedEmail],
    });

    if (existingUsers.data.length > 0) {
      // User already exists - redirect to sign-in
      return NextResponse.json({
        whitelisted: false,
        existingUser: true,
        message: "Account already exists. Please sign in instead.",
      });
    }

    // Use untyped client since stripe_members isn't in generated types yet
    const untypedSupabase = createUntypedClient();
    const { data, error } = await untypedSupabase
      .from("stripe_members")
      .select("subscription_status")
      .eq("email", normalizedEmail)
      .single();

    if (error || !data) {
      // Not in the members table
      return NextResponse.json({ whitelisted: false, existingUser: false });
    }

    // Check if subscription is active or trialing
    const isWhitelisted =
      data.subscription_status === "active" ||
      data.subscription_status === "trialing";

    // If whitelisted, store in pending_signups table (replaces cookie approach)
    // This allows the Clerk webhook to verify the email matches
    if (isWhitelisted) {
      const supabase = createClient();
      
      // Delete any existing pending signup for this email first
      await supabase
        .from("pending_signups")
        .delete()
        .ilike("email", normalizedEmail);
      
      // Insert new pending signup record
      await supabase.from("pending_signups").insert({
        email: normalizedEmail,
        invite_code: null, // Whitelisted users don't need an invite code
      });
      
      logger.info({ email: normalizedEmail }, "Pending signup created for whitelisted user");
    }

    return NextResponse.json({ whitelisted: isWhitelisted, existingUser: false });
  } catch (error) {
    logger.error({ err: error }, "Email verification failed");
    return NextResponse.json({ whitelisted: false }, { status: 500 });
  }
}
