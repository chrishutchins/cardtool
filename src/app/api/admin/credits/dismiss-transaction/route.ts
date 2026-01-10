import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactionId, transactionIds } = await request.json();

    // Support both single ID and array of IDs
    const idsToUpdate = transactionIds || (transactionId ? [transactionId] : []);

    if (idsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: transactionId or transactionIds" },
        { status: 400 }
      );
    }

    // Use admin client for admin operations
    const supabase = createAdminClient();

    // Mark the transaction(s) as dismissed
    const { error, count } = await supabase
      .from("user_plaid_transactions")
      .update({ dismissed: true })
      .in("id", idsToUpdate);

    if (error) {
      logger.error({ err: error, transactionIds: idsToUpdate }, "Failed to dismiss transactions");
      return NextResponse.json(
        { error: "Failed to dismiss transactions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, dismissedCount: count || idsToUpdate.length });
  } catch (error) {
    logger.error({ err: error }, "Failed to dismiss transaction");
    return NextResponse.json(
      { error: "Failed to dismiss transaction" },
      { status: 500 }
    );
  }
}

