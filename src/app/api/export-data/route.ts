import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Get wallet IDs first for credit usage query
    const { data: wallets } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("user_id", user.id);
    const walletIds = wallets?.map((w) => w.id) || [];

    // Fetch all user data in parallel
    const [
      walletsResult,
      spendingResult,
      creditUsageResult,
      plaidItemsResult,
      linkedAccountsResult,
      featureFlagsResult,
    ] = await Promise.all([
      supabase.from("user_wallets").select("*").eq("user_id", user.id),
      supabase.from("user_category_spend").select("*").eq("user_id", user.id),
      walletIds.length > 0
        ? supabase
            .from("user_credit_usage")
            .select("*")
            .in("user_wallet_id", walletIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("user_plaid_items")
        .select("id, institution_name, created_at")
        .eq("user_id", user.id),
      supabase
        .from("user_linked_accounts")
        .select(
          "id, name, official_name, type, subtype, mask, current_balance, available_balance, credit_limit, iso_currency_code, last_balance_update, wallet_card_id"
        )
        .eq("user_id", user.id),
      supabase.from("user_feature_flags").select("*").eq("user_id", user.id),
    ]);

    // Try to get user_feedback if the table exists (it might not if migration hasn't run)
    let feedbackData: unknown[] = [];
    try {
      const { data } = await supabase
        .from("user_feedback" as "user_wallets") // Type cast to avoid build error
        .select("feedback_type, message, page_url, created_at")
        .eq("user_id", user.id);
      feedbackData = data || [];
    } catch {
      // Table doesn't exist yet
    }

    const userData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      wallets: walletsResult.data || [],
      spending: spendingResult.data || [],
      creditUsage: creditUsageResult.data || [],
      plaidItems: plaidItemsResult.data || [],
      linkedAccounts: linkedAccountsResult.data || [],
      featureFlags: featureFlagsResult.data || [],
      feedback: feedbackData,
    };

    logger.info({ userId: user.id }, "User data exported");

    return new NextResponse(JSON.stringify(userData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=cardtool-data-${user.id}.json`,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "Failed to export user data");
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
