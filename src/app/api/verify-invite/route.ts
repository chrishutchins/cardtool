import { NextResponse } from "next/server";
import { checkRateLimit, inviteCodeRateLimit } from "@/lib/rate-limit";
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
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Get valid invite codes from environment variable
    // Format: INVITE_CODES=CODE1,CODE2,CODE3
    const rawCodes = process.env.INVITE_CODES?.replace(/^["']|["']$/g, "") ?? "";
    const validCodes = rawCodes
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    // Check if the provided code matches any valid code
    const isValid = validCodes.includes(code.trim().toUpperCase());

    if (isValid) {
      logger.info({ ip }, "Valid invite code used");
    }

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    logger.error({ err: error }, "Invite code verification failed");
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
