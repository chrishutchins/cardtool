import { NextResponse } from "next/server";
import { createUntypedClient } from "@/lib/supabase/server";
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

    // Use untyped client since stripe_members isn't in generated types yet
    const supabase = createUntypedClient();
    const { data, error } = await supabase
      .from("stripe_members")
      .select("subscription_status")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !data) {
      // Not in the members table
      return NextResponse.json({ whitelisted: false });
    }

    // Check if subscription is active or trialing
    const isWhitelisted =
      data.subscription_status === "active" ||
      data.subscription_status === "trialing";

    return NextResponse.json({ whitelisted: isWhitelisted });
  } catch (error) {
    logger.error({ err: error }, "Email verification failed");
    return NextResponse.json({ whitelisted: false }, { status: 500 });
  }
}
