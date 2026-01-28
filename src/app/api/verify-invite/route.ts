import { NextResponse } from "next/server";
import { checkRateLimit, inviteCodeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  // Rate limit: 10 requests per hour per IP
  const { success } = await checkRateLimit(inviteCodeRateLimit, `invite:${ip}`);

  if (!success) {
    logger.warn({ ip }, "Invite code verification rate limited");
    return NextResponse.json(
      { valid: false, error: "Rate limited" },
      { status: 429 }
    );
  }

  try {
    const { code, email } = await request.json();

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ valid: false, error: "Email required" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = email.toLowerCase();
    const supabase = createClient();

    // First, check the database for invite codes
    const { data: dbCode, error } = await supabase
      .from("invite_codes")
      .select("id, code, plaid_tier, uses_remaining, expires_at, is_active")
      .ilike("code", normalizedCode)
      .single();

    if (!error && dbCode) {
      // Found a database code - validate it
      const now = new Date();
      const expiresAt = dbCode.expires_at ? new Date(dbCode.expires_at) : null;
      
      const isActive = dbCode.is_active;
      const hasUsesRemaining = dbCode.uses_remaining === null || dbCode.uses_remaining > 0;
      const notExpired = !expiresAt || expiresAt > now;

      if (isActive && hasUsesRemaining && notExpired) {
        logger.info({ ip, code: normalizedCode, email: normalizedEmail, plaidTier: dbCode.plaid_tier }, "Valid database invite code used");
        
        // Store in pending_signups table (replaces cookie approach)
        // Delete any existing pending signup for this email first
        await supabase
          .from("pending_signups")
          .delete()
          .ilike("email", normalizedEmail);
        
        // Insert new pending signup record with the invite code
        await supabase.from("pending_signups").insert({
          email: normalizedEmail,
          invite_code: normalizedCode,
        });

        return NextResponse.json({ 
          valid: true,
          // Don't expose tier to client, just indicate it's a special code
          hasFeatures: dbCode.plaid_tier !== "disabled"
        });
      } else {
        // Code exists but is not valid (inactive, expired, or exhausted)
        logger.info({ ip, code: normalizedCode, isActive, hasUsesRemaining, notExpired }, "Database invite code invalid");
        return NextResponse.json({ valid: false });
      }
    }

    // Fallback: Check environment variable codes (backward compatibility)
    // These codes don't grant any special features
    const rawCodes = process.env.INVITE_CODES?.replace(/^["']|["']$/g, "") ?? "";
    const validCodes = rawCodes
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    const isEnvCodeValid = validCodes.includes(normalizedCode);

    if (isEnvCodeValid) {
      logger.info({ ip, email: normalizedEmail }, "Valid env invite code used");
      
      // Store in pending_signups for env codes too (no special features)
      await supabase
        .from("pending_signups")
        .delete()
        .ilike("email", normalizedEmail);
      
      await supabase.from("pending_signups").insert({
        email: normalizedEmail,
        invite_code: normalizedCode, // Store the code even for env codes
      });

      return NextResponse.json({ valid: true, hasFeatures: false });
    }

    return NextResponse.json({ valid: false });
  } catch (error) {
    logger.error({ err: error }, "Invite code verification failed");
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
