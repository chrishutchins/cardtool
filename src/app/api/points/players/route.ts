import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Authenticate via Clerk session OR sync token
async function authenticateUser(request: Request): Promise<string | null> {
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
      console.error("Error validating sync token:", error);
      throw new Error("Database error during token validation");
    }
    
    if (tokenData) {
      return tokenData.user_id;
    }
    return null;
  }
  
  // Fall back to Clerk session (for requests from CardTool itself)
  const user = await currentUser();
  return user?.id || null;
}

export async function GET(request: Request) {
  let userId: string | null;
  try {
    userId = await authenticateUser(request);
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json({ error: "Server error during authentication" }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  // Get user's configured players
  const { data: players, error } = await supabase
    .from("user_players")
    .select("player_number, description")
    .eq("user_id", userId)
    .order("player_number");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }

  // If no players configured, return default player 1
  const result = players && players.length > 0
    ? players
    : [{ player_number: 1, description: "Me" }];

  return NextResponse.json({ players: result });
}
