import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
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

    // Use admin client for admin operations
    const supabase = createAdminClient();

    // Check if rule already exists (use maybeSingle since no match is expected case)
    const { data: existingRule } = await supabase
      .from("credit_matching_rules")
      .select("id, pattern, credit_id")
      .eq("pattern", pattern)
      .eq("credit_id", creditId)
      .maybeSingle();

    let rule = existingRule;
    let ruleAlreadyExisted = false;

    if (existingRule) {
      // Rule exists - we'll re-run matching for it instead of returning an error
      ruleAlreadyExisted = true;
      logger.info({ ruleId: existingRule.id, pattern }, "Rule already exists, re-running matching");
    } else {
      // Create the matching rule
      const { data: newRule, error: ruleError } = await supabase
        .from("credit_matching_rules")
        .insert({
          credit_id: creditId,
          pattern,
          match_amount_cents: matchAmountCents || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (ruleError || !newRule) {
        logger.error({ err: ruleError }, "Failed to create matching rule");
        return NextResponse.json(
          { error: "Failed to create matching rule" },
          { status: 500 }
        );
      }
      rule = newRule;
    }

    // At this point, rule is guaranteed to exist
    if (!rule) {
      return NextResponse.json(
        { error: "Failed to create or find matching rule" },
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
        ruleAlreadyExisted,
      }, ruleAlreadyExisted ? "Re-ran matching for existing rule" : "Created matching rule and matched existing transactions");

      return NextResponse.json({
        success: true,
        rule,
        transactionsMatched: totalMatched,
        ruleAlreadyExisted,
      });
    }

    return NextResponse.json({
      success: true,
      rule,
      transactionsMatched: 0,
      ruleAlreadyExisted,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create matching rule");
    return NextResponse.json(
      { error: "Failed to create matching rule" },
      { status: 500 }
    );
  }
}

