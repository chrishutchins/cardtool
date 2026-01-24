import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/emulation";

export async function POST(request: Request) {
  const effectiveUserId = await getEffectiveUserId();
  if (!effectiveUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const { walletCardId, statementDate } = await request.json();

  if (!walletCardId || !statementDate) {
    return NextResponse.json(
      { error: "walletCardId and statementDate are required" },
      { status: 400 }
    );
  }

  // Upsert the payment settings with the dismissed statement date
  const { error } = await supabase
    .from("user_card_payment_settings")
    .upsert(
      {
        user_id: effectiveUserId,
        wallet_card_id: walletCardId,
        dismissed_statement_date: statementDate,
      },
      {
        onConflict: "wallet_card_id",
      }
    );

  if (error) {
    console.error("Error marking payment as paid:", error);
    return NextResponse.json(
      { error: "Failed to mark payment as paid" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
