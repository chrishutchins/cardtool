import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  // Get user's configured players
  const { data: players, error } = await supabase
    .from("user_players")
    .select("player_number, description")
    .eq("user_id", user.id)
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
