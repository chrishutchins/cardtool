import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, pointsImportRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 requests per minute per user
  const { success } = await checkRateLimit(pointsImportRateLimit, user.id);
  if (!success) {
    logger.warn({ userId: user.id }, "Points import rate limited");
    return NextResponse.json({ error: "Rate limited. Please wait before syncing again." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { currencyCode, balance, playerNumber = 1 } = body;

    // Validate required fields
    if (!currencyCode) {
      return NextResponse.json(
        { error: "Missing required field: currencyCode" },
        { status: 400 }
      );
    }

    if (typeof balance !== "number" || isNaN(balance) || balance < 0) {
      return NextResponse.json(
        { error: "Invalid balance: must be a non-negative number" },
        { status: 400 }
      );
    }

    if (typeof playerNumber !== "number" || playerNumber < 1) {
      return NextResponse.json(
        { error: "Invalid playerNumber: must be a positive integer" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Look up currency by code
    const { data: currency, error: currencyError } = await supabase
      .from("reward_currencies")
      .select("id, name, code")
      .eq("code", currencyCode.toUpperCase())
      .maybeSingle();

    if (currencyError) {
      logger.error({ err: currencyError, currencyCode }, "Error looking up currency");
      return NextResponse.json(
        { error: "Failed to look up currency" },
        { status: 500 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { error: `Unknown currency code: ${currencyCode}` },
        { status: 400 }
      );
    }

    // Upsert the balance
    const { error: upsertError } = await supabase
      .from("user_point_balances")
      .upsert(
        {
          user_id: user.id,
          currency_id: currency.id,
          player_number: playerNumber,
          balance: Math.round(balance), // Ensure integer
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,currency_id,player_number",
        }
      );

    if (upsertError) {
      logger.error({ err: upsertError, userId: user.id, currencyCode }, "Failed to upsert balance");
      return NextResponse.json(
        { error: "Failed to save balance" },
        { status: 500 }
      );
    }

    // Log to history
    await supabase.from("user_point_balance_history").insert({
      user_id: user.id,
      currency_id: currency.id,
      player_number: playerNumber,
      balance: Math.round(balance),
      recorded_at: new Date().toISOString(),
    });

    logger.info(
      { userId: user.id, currencyCode, balance, playerNumber },
      "Points balance imported"
    );

    return NextResponse.json({
      success: true,
      currencyName: currency.name,
      currencyCode: currency.code,
      balance: Math.round(balance),
      playerNumber,
    });
  } catch (error) {
    logger.error({ err: error }, "Points import error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
