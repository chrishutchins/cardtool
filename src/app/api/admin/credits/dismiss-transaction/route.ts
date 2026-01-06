import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactionId } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing required field: transactionId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Mark the transaction as dismissed
    const { error } = await supabase
      .from("user_plaid_transactions")
      .update({ dismissed: true })
      .eq("id", transactionId);

    if (error) {
      logger.error({ err: error, transactionId }, "Failed to dismiss transaction");
      return NextResponse.json(
        { error: "Failed to dismiss transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to dismiss transaction");
    return NextResponse.json(
      { error: "Failed to dismiss transaction" },
      { status: 500 }
    );
  }
}

