import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, pointsImportRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import crypto from "crypto";

// Source types for balance updates
type BalanceSource = "manual" | "tampermonkey" | "api";

// Authenticate via Clerk session OR sync token
async function authenticateUser(request: Request): Promise<{ userId: string | null; source: BalanceSource; error?: string }> {
  // First try sync token (for Tampermonkey scripts on external sites)
  const syncToken = request.headers.get("x-sync-token");
  
  if (syncToken) {
    const tokenHash = crypto.createHash("sha256").update(syncToken).digest("hex");
    const supabase = createClient();
    
    const { data: tokenData, error } = await supabase
      .from("user_sync_tokens")
      .select("user_id")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    
    if (error) {
      logger.error({ err: error }, "Error validating sync token");
      return { userId: null, source: "api", error: "Token validation failed" };
    }
    
    if (tokenData) {
      // Update last_used_at
      await supabase
        .from("user_sync_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
      
      // Sync token = Tampermonkey script
      return { userId: tokenData.user_id, source: "tampermonkey" };
    }
    
    return { userId: null, source: "api", error: "Invalid sync token" };
  }
  
  // Fall back to Clerk session (for requests from CardTool itself)
  const user = await currentUser();
  if (user) {
    // Clerk session from CardTool = manual entry (or could be API if we add that later)
    return { userId: user.id, source: "manual" };
  }
  
  return { userId: null, source: "api", error: "Unauthorized" };
}

export async function POST(request: Request) {
  const { userId, source, error: authError } = await authenticateUser(request);

  if (!userId) {
    return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 requests per minute per user
  const { success } = await checkRateLimit(pointsImportRateLimit, userId);
  if (!success) {
    logger.warn({ userId }, "Points import rate limited");
    return NextResponse.json({ error: "Rate limited. Please wait before syncing again." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { currencyCode, balance, playerNumber = 1, expirationDate, additive = false } = body;

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

    if (typeof playerNumber !== "number" || playerNumber < 1 || !Number.isInteger(playerNumber)) {
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

    // Calculate final balance
    const inputBalance = Math.round(balance);
    let finalBalance = inputBalance;

    if (additive) {
      // Use atomic SQL to prevent race conditions in additive mode
      // This uses INSERT ... ON CONFLICT ... DO UPDATE with atomic increment
      const { data: result, error: atomicError } = await supabase.rpc('upsert_balance_additive', {
        p_user_id: userId,
        p_currency_id: currency.id,
        p_player_number: playerNumber,
        p_balance_delta: inputBalance,
        p_source: source,
        p_expiration_date: expirationDate || null,
      });

      if (atomicError) {
        // Fallback to non-atomic if RPC doesn't exist (backward compatibility)
        if (atomicError.code === '42883') { // function does not exist
          logger.warn({ userId, currencyCode }, "Atomic upsert function not found, using fallback");
          const { data: existing } = await supabase
            .from("user_point_balances")
            .select("balance")
            .eq("user_id", userId)
            .eq("currency_id", currency.id)
            .eq("player_number", playerNumber)
            .maybeSingle();
          
          if (existing) {
            finalBalance = existing.balance + inputBalance;
          }
        } else {
          logger.error({ err: atomicError, userId, currencyCode }, "Failed atomic balance update");
          return NextResponse.json(
            { error: "Failed to update balance" },
            { status: 500 }
          );
        }
      } else if (result !== null) {
        // RPC returns the new balance
        finalBalance = result;
        
        // Skip the upsert below since RPC already did it
        // Log to history
        const { error: historyError } = await supabase.from("user_point_balance_history").insert({
          user_id: userId,
          currency_id: currency.id,
          player_number: playerNumber,
          balance: finalBalance,
          recorded_at: new Date().toISOString(),
          source,
        });

        if (historyError) {
          logger.error({ err: historyError, userId, currencyCode, playerNumber }, "Failed to insert balance history record");
        }

        logger.info(
          { userId, currencyCode, balance: finalBalance, playerNumber, source, additive },
          "Point balance updated (atomic)"
        );

        return NextResponse.json({
          success: true,
          currencyName: currency.name,
          currencyCode: currency.code,
          balance: finalBalance,
          added: additive ? inputBalance : undefined,
          playerNumber,
        });
      }
    }

    // Build upsert data (used for non-additive mode or fallback)
    const upsertData = {
      user_id: userId,
      currency_id: currency.id,
      player_number: playerNumber,
      balance: finalBalance,
      updated_at: new Date().toISOString(),
      last_update_source: source,
      expiration_date: expirationDate || null,
    };

    // Upsert the balance
    const { error: upsertError } = await supabase
      .from("user_point_balances")
      .upsert(upsertData, {
        onConflict: "user_id,currency_id,player_number",
      });

    if (upsertError) {
      logger.error({ err: upsertError, userId, currencyCode }, "Failed to upsert balance");
      return NextResponse.json(
        { error: "Failed to save balance" },
        { status: 500 }
      );
    }

    // Log to history
    const { error: historyError } = await supabase.from("user_point_balance_history").insert({
      user_id: userId,
      currency_id: currency.id,
      player_number: playerNumber,
      balance: finalBalance,
      recorded_at: new Date().toISOString(),
      source,
    });

    if (historyError) {
      // Log the error but don't fail the request since the balance was already saved
      // This is a non-critical failure - the balance is correct, just the history entry is missing
      logger.error({ err: historyError, userId, currencyCode, playerNumber }, "Failed to insert balance history record");
    }

    logger.info(
      { userId, currencyCode, balance: finalBalance, playerNumber, source, additive },
      "Points balance imported"
    );

    return NextResponse.json({
      success: true,
      currencyName: currency.name,
      currencyCode: currency.code,
      balance: finalBalance,
      added: additive ? Math.round(balance) : undefined,
      playerNumber,
    });
  } catch (error) {
    logger.error({ err: error }, "Points import error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
