import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

// Clerk webhook event types
interface ClerkUserCreatedEvent {
  type: "user.created";
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      verification: { status: string };
    }>;
    first_name: string | null;
    last_name: string | null;
  };
}

type PlaidTier = "disabled" | "txns" | "txns_liab" | "full";

// Convert tier to individual feature flags
function tierToFlags(tier: PlaidTier): {
  account_linking_enabled: boolean;
  plaid_transactions_enabled: boolean;
  plaid_liabilities_enabled: boolean;
  plaid_on_demand_refresh_enabled: boolean;
} {
  switch (tier) {
    case "disabled":
      return {
        account_linking_enabled: false,
        plaid_transactions_enabled: false,
        plaid_liabilities_enabled: false,
        plaid_on_demand_refresh_enabled: false,
      };
    case "txns":
      return {
        account_linking_enabled: true,
        plaid_transactions_enabled: true,
        plaid_liabilities_enabled: false,
        plaid_on_demand_refresh_enabled: false,
      };
    case "txns_liab":
      return {
        account_linking_enabled: true,
        plaid_transactions_enabled: true,
        plaid_liabilities_enabled: true,
        plaid_on_demand_refresh_enabled: false,
      };
    case "full":
      return {
        account_linking_enabled: true,
        plaid_transactions_enabled: true,
        plaid_liabilities_enabled: true,
        plaid_on_demand_refresh_enabled: true,
      };
  }
}

export async function POST(req: Request) {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    logger.error({}, "CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.warn({}, "Missing svix headers");
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Get the body
  const payload = await req.text();

  // Verify the webhook signature
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let event: ClerkUserCreatedEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserCreatedEvent;
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only handle user.created events
  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const userId = event.data.id;
  const email = event.data.email_addresses?.[0]?.email_address?.toLowerCase();

  logger.info({ userId, email }, "Processing user.created webhook");

  const supabase = createClient();

  // Look up pending signup by email (replaces cookie-based approach)
  // This is needed because Clerk webhooks are server-to-server and don't have browser cookies
  const { data: pendingSignup } = await supabase
    .from("pending_signups")
    .select("email, invite_code, expires_at")
    .ilike("email", email || "")
    .single();

  // SECURITY: Validate that the user's email matches a pending signup
  // If no pending signup exists, the user bypassed our verification flow
  if (!pendingSignup) {
    logger.warn(
      { userId, email },
      "No pending signup found - user may have bypassed verification. Allowing signup but no features granted."
    );
    // We allow the signup but don't grant any special features
    // This handles edge cases like direct Clerk signups or expired pending records
  } else if (new Date(pendingSignup.expires_at) < new Date()) {
    logger.warn(
      { userId, email, expiresAt: pendingSignup.expires_at },
      "Pending signup expired - no features granted"
    );
    // Clean up expired record
    await supabase.from("pending_signups").delete().ilike("email", email || "");
  }

  let plaidTier: PlaidTier = "disabled";
  let inviteCodeId: string | null = null;
  const inviteCode = pendingSignup?.invite_code;

  if (inviteCode && pendingSignup && new Date(pendingSignup.expires_at) >= new Date()) {
    // Look up the invite code in the database to get its features
    const { data: dbCode } = await supabase
      .from("invite_codes")
      .select("id, plaid_tier, uses_remaining")
      .ilike("code", inviteCode)
      .single();

    if (dbCode) {
      plaidTier = dbCode.plaid_tier as PlaidTier;
      inviteCodeId = dbCode.id;

      // Decrement uses_remaining if not null
      if (dbCode.uses_remaining !== null) {
        await supabase
          .from("invite_codes")
          .update({ uses_remaining: dbCode.uses_remaining - 1 })
          .eq("id", dbCode.id);
      }

      logger.info({ userId, inviteCode, plaidTier }, "Applied invite code features");
    }

    // Record which invite code the user used
    await supabase.from("user_invite_codes").insert({
      user_id: userId,
      invite_code_id: inviteCodeId,
      code_used: inviteCode,
    });
  }

  // Clean up the pending signup record
  if (email) {
    await supabase.from("pending_signups").delete().ilike("email", email);
  }

  // Create user feature flags with the appropriate Plaid tier
  const flags = tierToFlags(plaidTier);
  
  await supabase.from("user_feature_flags").upsert(
    {
      user_id: userId,
      ...flags,
    },
    { onConflict: "user_id" }
  );

  logger.info({ userId, plaidTier, flags }, "User feature flags created");

  return NextResponse.json({ received: true, userId, plaidTier });
}
