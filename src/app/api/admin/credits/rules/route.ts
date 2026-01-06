import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { matchTransactionsToCredits } from "@/lib/credit-matcher";
import logger from "@/lib/logger";

// GET - List all matching rules with match counts
export async function GET() {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch rules with credit and card info
    const { data: rules, error } = await supabase
      .from("credit_matching_rules")
      .select(`
        id,
        pattern,
        match_amount_cents,
        created_at,
        created_by,
        card_credits:credit_id (
          id,
          name,
          canonical_name,
          cards:card_id (
            id,
            name,
            issuers:issuer_id (
              id,
              name
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to fetch matching rules");
      return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
    }

    // Get match counts for each rule
    const { data: matchCounts } = await supabase
      .from("user_plaid_transactions")
      .select("matched_rule_id")
      .not("matched_rule_id", "is", null);

    const countByRuleId = new Map<string, number>();
    matchCounts?.forEach((t) => {
      const ruleId = t.matched_rule_id;
      if (ruleId) {
        countByRuleId.set(ruleId, (countByRuleId.get(ruleId) || 0) + 1);
      }
    });

    // Add match counts to rules
    const rulesWithCounts = rules?.map((rule) => ({
      ...rule,
      match_count: countByRuleId.get(rule.id) || 0,
    }));

    return NextResponse.json({ rules: rulesWithCounts });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch matching rules");
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

// PUT - Update a rule and rematch transactions
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, pattern, match_amount_cents, credit_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the old rule to know what pattern changed
    const { data: oldRule } = await supabase
      .from("credit_matching_rules")
      .select("pattern")
      .eq("id", id)
      .single();

    const updateData: Record<string, unknown> = {};
    if (pattern !== undefined) updateData.pattern = pattern;
    if (match_amount_cents !== undefined) updateData.match_amount_cents = match_amount_cents;
    if (credit_id !== undefined) updateData.credit_id = credit_id;

    const { error } = await supabase
      .from("credit_matching_rules")
      .update(updateData)
      .eq("id", id);

    if (error) {
      logger.error({ err: error, ruleId: id }, "Failed to update matching rule");
      return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }

    // Clear existing matches for this rule so they can be rematched
    const { data: previouslyMatchedTxns } = await supabase
      .from("user_plaid_transactions")
      .select("id, user_id")
      .eq("matched_rule_id", id);

    if (previouslyMatchedTxns && previouslyMatchedTxns.length > 0) {
      // Clear the matched_rule_id and matched_credit_id so they can be rematched
      await supabase
        .from("user_plaid_transactions")
        .update({
          matched_rule_id: null,
          matched_credit_id: null,
        })
        .eq("matched_rule_id", id);
    }

    // Find transactions that might match the new pattern (or old pattern if unchanged)
    const patternToMatch = pattern || oldRule?.pattern;
    if (patternToMatch) {
      const { data: potentialMatches } = await supabase
        .from("user_plaid_transactions")
        .select("*")
        .is("matched_credit_id", null)
        .eq("dismissed", false)
        .eq("pending", false)
        .ilike("name", `%${patternToMatch}%`);

      // Also include the previously matched transactions that we just cleared
      const allTxnsToRematch = [
        ...(potentialMatches || []),
      ];

      // Add the previously matched ones by fetching them fresh
      if (previouslyMatchedTxns && previouslyMatchedTxns.length > 0) {
        const txnIds = previouslyMatchedTxns.map((t) => t.id);
        const { data: clearedTxns } = await supabase
          .from("user_plaid_transactions")
          .select("*")
          .in("id", txnIds);

        if (clearedTxns) {
          allTxnsToRematch.push(...clearedTxns);
        }
      }

      if (allTxnsToRematch.length > 0) {
        // Group by user
        const userTxns = allTxnsToRematch.reduce((acc, txn) => {
          if (!acc[txn.user_id]) acc[txn.user_id] = [];
          // Avoid duplicates
          if (!acc[txn.user_id].some((t: { id: string }) => t.id === txn.id)) {
            acc[txn.user_id].push(txn);
          }
          return acc;
        }, {} as Record<string, typeof allTxnsToRematch>);

        let totalMatched = 0;
        for (const [userId, txns] of Object.entries(userTxns)) {
          const result = await matchTransactionsToCredits(supabase, userId, txns);
          totalMatched += result.matched;
        }

        logger.info({
          ruleId: id,
          ...updateData,
          transactionsRematched: totalMatched,
        }, "Updated matching rule and rematched transactions");

        return NextResponse.json({
          success: true,
          transactionsRematched: totalMatched,
        });
      }
    }

    logger.info({ ruleId: id, ...updateData }, "Updated matching rule");
    return NextResponse.json({ success: true, transactionsRematched: 0 });
  } catch (error) {
    logger.error({ err: error }, "Failed to update matching rule");
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

// DELETE - Delete a rule
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // First, clear the matched_rule_id from any transactions using this rule
    await supabase
      .from("user_plaid_transactions")
      .update({ matched_rule_id: null, matched_credit_id: null })
      .eq("matched_rule_id", id);

    // Then delete the rule
    const { error } = await supabase
      .from("credit_matching_rules")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error({ err: error, ruleId: id }, "Failed to delete matching rule");
      return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
    }

    logger.info({ ruleId: id }, "Deleted matching rule");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to delete matching rule");
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
