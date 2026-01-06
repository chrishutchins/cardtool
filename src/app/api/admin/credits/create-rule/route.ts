import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { matchTransactionsToCredits } from "@/lib/credit-matcher";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { creditId, pattern, matchAmountCents } = await request.json();

    if (!creditId || !pattern) {
      return NextResponse.json(
        { error: "Missing required fields: creditId and pattern" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if rule already exists
    const { data: existingRule } = await supabase
      .from("credit_matching_rules")
      .select("id")
      .eq("pattern", pattern)
      .eq("credit_id", creditId)
      .single();

    if (existingRule) {
      return NextResponse.json(
        { error: "A rule with this pattern already exists for this credit" },
        { status: 409 }
      );
    }

    // Create the matching rule
    const { data: rule, error: ruleError } = await supabase
      .from("credit_matching_rules")
      .insert({
        credit_id: creditId,
        pattern,
        match_amount_cents: matchAmountCents || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (ruleError || !rule) {
      logger.error({ err: ruleError }, "Failed to create matching rule");
      return NextResponse.json(
        { error: "Failed to create matching rule" },
        { status: 500 }
      );
    }

    // Re-run matching for all unmatched transactions that might now match
    const { data: unmatchedTxns } = await supabase
      .from("user_plaid_transactions")
      .select("*")
      .is("matched_credit_id", null)
      .eq("dismissed", false)
      .eq("pending", false)
      .ilike("name", `%${pattern}%`);

    if (unmatchedTxns && unmatchedTxns.length > 0) {
      // Group by user for proper matching
      const userTxns = unmatchedTxns.reduce((acc, txn) => {
        if (!acc[txn.user_id]) acc[txn.user_id] = [];
        acc[txn.user_id].push(txn);
        return acc;
      }, {} as Record<string, typeof unmatchedTxns>);

      let totalMatched = 0;
      for (const [userId, txns] of Object.entries(userTxns)) {
        const result = await matchTransactionsToCredits(supabase, userId, txns);
        totalMatched += result.matched;
      }

      logger.info({
        ruleId: rule.id,
        pattern,
        transactionsMatched: totalMatched,
      }, "Created matching rule and matched existing transactions");

      return NextResponse.json({
        success: true,
        rule,
        transactionsMatched: totalMatched,
      });
    }

    return NextResponse.json({
      success: true,
      rule,
      transactionsMatched: 0,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create matching rule");
    return NextResponse.json(
      { error: "Failed to create matching rule" },
      { status: 500 }
    );
  }
}

