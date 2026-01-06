import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import logger from "@/lib/logger";

// POST - Create exclusion pattern and dismiss matching transactions
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pattern } = await request.json();

    if (!pattern || typeof pattern !== "string" || pattern.trim().length === 0) {
      return NextResponse.json(
        { error: "Pattern is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create the exclusion pattern
    const { error: insertError } = await supabase
      .from("transaction_exclusion_patterns")
      .insert({
        pattern: pattern.trim(),
        created_by: user.id,
      });

    if (insertError) {
      // Check if it's a unique constraint violation
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This pattern already exists" },
          { status: 409 }
        );
      }
      logger.error({ err: insertError, pattern }, "Failed to create exclusion pattern");
      return NextResponse.json(
        { error: "Failed to create exclusion pattern" },
        { status: 500 }
      );
    }

    // Dismiss all matching transactions that aren't already matched or dismissed
    const { data: matchingTxns, error: matchError } = await supabase
      .from("user_plaid_transactions")
      .update({ dismissed: true })
      .ilike("name", `%${pattern.trim()}%`)
      .is("matched_credit_id", null)
      .eq("dismissed", false)
      .select("id");

    if (matchError) {
      logger.error({ err: matchError, pattern }, "Failed to dismiss matching transactions");
      // Don't return error - the pattern was created successfully
    }

    const dismissedCount = matchingTxns?.length || 0;

    logger.info({
      pattern: pattern.trim(),
      dismissedCount,
      createdBy: user.id,
    }, "Created exclusion pattern and dismissed transactions");

    return NextResponse.json({
      success: true,
      pattern: pattern.trim(),
      dismissedCount,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to create exclusion pattern");
    return NextResponse.json(
      { error: "Failed to create exclusion pattern" },
      { status: 500 }
    );
  }
}

// GET - List all exclusion patterns
export async function GET() {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: patterns, error } = await supabase
      .from("transaction_exclusion_patterns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to fetch exclusion patterns");
      return NextResponse.json({ error: "Failed to fetch patterns" }, { status: 500 });
    }

    return NextResponse.json({ patterns });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch exclusion patterns");
    return NextResponse.json({ error: "Failed to fetch patterns" }, { status: 500 });
  }
}

// DELETE - Remove an exclusion pattern
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Pattern ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("transaction_exclusion_patterns")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error({ err: error, patternId: id }, "Failed to delete exclusion pattern");
      return NextResponse.json({ error: "Failed to delete pattern" }, { status: 500 });
    }

    logger.info({ patternId: id }, "Deleted exclusion pattern");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to delete exclusion pattern");
    return NextResponse.json({ error: "Failed to delete pattern" }, { status: 500 });
  }
}

