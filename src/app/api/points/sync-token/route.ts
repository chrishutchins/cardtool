import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Generate a new sync token for the user
export async function POST() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Upsert - replace existing token if one exists
  const { error } = await supabase
    .from("user_sync_tokens")
    .upsert(
      {
        user_id: user.id,
        token_hash: tokenHash,
        created_at: new Date().toISOString(),
        last_used_at: null,
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    console.error("Error creating sync token:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }

  // Return the plaintext token (only shown once!)
  return NextResponse.json({
    token,
    message: "Token created. Save this - it won't be shown again!",
  });
}

// Revoke the user's sync token
export async function DELETE() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const { error } = await supabase
    .from("user_sync_tokens")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error revoking sync token:", error);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// Check if user has a token
export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_sync_tokens")
    .select("created_at, last_used_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error checking sync token:", error);
    return NextResponse.json(
      { error: "Failed to check token" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    hasToken: !!data,
    createdAt: data?.created_at || null,
    lastUsedAt: data?.last_used_at || null,
  });
}
