import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";
import crypto from "crypto";

type CreditBureau = "equifax" | "experian" | "transunion";
type CreditReportSource = "myfico" | "equifax" | "experian" | "transunion" | "credit_karma" | "annual_credit_report";
type ScoreType = "fico_8" | "fico_9" | "vantage_3" | "vantage_4" | "other";
type AccountStatus = "open" | "closed" | "paid" | "unknown";
type AccountType = "revolving" | "installment" | "mortgage" | "collection" | "other";
type LoanType = "credit_card" | "flexible_credit_card" | "charge_card" | "auto_loan" | "mortgage" | "student_loan" | "personal_loan" | "home_equity" | "retail" | "other";
type Responsibility = "individual" | "joint" | "authorized_user" | "cosigner" | "unknown";

interface CreditScoreInput {
  type: ScoreType;
  score: number;
  date?: string;
}

interface CreditAccountInput {
  name: string;
  numberMasked?: string;
  creditorName?: string;
  status?: AccountStatus;
  dateOpened?: string;
  dateUpdated?: string;
  dateClosed?: string;
  creditLimitCents?: number;
  highBalanceCents?: number;
  balanceCents?: number;
  monthlyPaymentCents?: number;
  accountType?: AccountType;
  loanType?: LoanType;
  responsibility?: Responsibility;
  terms?: string;
  paymentStatus?: string;
}

interface CreditInquiryInput {
  company: string;
  date: string;
  type?: string;
}

interface CreditReportImportRequest {
  bureau: CreditBureau;
  source?: CreditReportSource;
  playerNumber?: number;
  reportDate?: string;
  scores?: CreditScoreInput[];
  accounts?: CreditAccountInput[];
  inquiries?: CreditInquiryInput[];
}

// Authenticate using sync token
async function authenticateUser(request: Request): Promise<{ userId: string | null; error?: string }> {
  const syncToken = request.headers.get("x-sync-token");
  if (!syncToken) {
    return { userId: null, error: "Missing sync token" };
  }

  const tokenHash = crypto.createHash("sha256").update(syncToken).digest("hex");
  const supabase = createClient();
  
  const { data: tokenData, error } = await supabase
    .from("user_sync_tokens")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    logger.error({ err: error }, "Error validating sync token");
    return { userId: null, error: "Token validation failed" };
  }

  if (tokenData) {
    // Update last_used_at
    await supabase
      .from("user_sync_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
    return { userId: tokenData.user_id };
  }

  return { userId: null, error: "Invalid sync token" };
}

export async function POST(request: Request) {
  const { userId, error: authError } = await authenticateUser(request);

  if (!userId) {
    return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreditReportImportRequest = await request.json();
    const { 
      bureau, 
      source,
      playerNumber = 1, 
      reportDate, 
      scores = [], 
      accounts = [], 
      inquiries = []
    } = body;

    // Validate required fields
    if (!bureau || !["equifax", "experian", "transunion"].includes(bureau)) {
      return NextResponse.json(
        { error: "Invalid or missing bureau. Must be 'equifax', 'experian', or 'transunion'" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Determine the source - use provided source or infer from bureau
    const validSources: CreditReportSource[] = ["myfico", "equifax", "experian", "transunion", "credit_karma", "annual_credit_report"];
    const resolvedSource = source && validSources.includes(source) ? source : bureau;

    // 1. Create snapshot record
    const { data: snapshot, error: snapshotError } = await supabase
      .from("credit_report_snapshots")
      .insert({
        user_id: userId,
        player_number: playerNumber,
        bureau,
        source: resolvedSource,
        report_date: reportDate || null,
        fetched_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (snapshotError || !snapshot) {
      logger.error({ err: snapshotError }, "Failed to create credit report snapshot");
      return NextResponse.json({ error: "Failed to save credit report" }, { status: 500 });
    }

    const snapshotId = snapshot.id;
    let scoresInserted = 0;
    let accountsInserted = 0;
    let inquiriesInserted = 0;

    // 2. Insert scores
    // Valid score types in the database enum
    const validScoreTypes = [
      'fico_8', 'fico_9', 'fico_2', 'fico_4', 'fico_5', 'fico_10', 'fico_10t',
      'fico_auto_2', 'fico_auto_4', 'fico_auto_5', 'fico_auto_8', 'fico_auto_9', 'fico_auto_10',
      'fico_bankcard_2', 'fico_bankcard_3', 'fico_bankcard_4', 'fico_bankcard_5', 
      'fico_bankcard_8', 'fico_bankcard_9', 'fico_bankcard_10',
      'vantage_3', 'vantage_4', 'other'
    ] as const;
    type ValidScoreType = typeof validScoreTypes[number];
    
    const mapScoreType = (type: string): ValidScoreType => {
      // Normalize the type (lowercase, handle 10T variant)
      const normalized = type.toLowerCase().replace('10t', '10t');
      if (validScoreTypes.includes(normalized as ValidScoreType)) {
        return normalized as ValidScoreType;
      }
      return 'other';
    };
    
    if (scores.length > 0) {
      const scoreRecords = scores.map((s) => ({
        user_id: userId,
        player_number: playerNumber,
        bureau,
        snapshot_id: snapshotId,
        score_type: mapScoreType(s.type),
        score: s.score,
        score_date: s.date || reportDate || null,
      }));

      const { error: scoresError } = await supabase
        .from("credit_scores")
        .insert(scoreRecords);

      if (scoresError) {
        logger.error({ err: scoresError }, "Failed to insert credit scores");
      } else {
        scoresInserted = scores.length;
      }
    }

    // 3. Insert accounts
    if (accounts.length > 0) {
      const accountRecords = accounts.map((a) => ({
        user_id: userId,
        player_number: playerNumber,
        bureau,
        snapshot_id: snapshotId,
        account_name: a.name,
        account_number_masked: a.numberMasked || null,
        creditor_name: a.creditorName || null,
        status: a.status || "unknown",
        date_opened: a.dateOpened || null,
        date_updated: a.dateUpdated || null,
        date_closed: a.dateClosed || null,
        credit_limit_cents: a.creditLimitCents || null,
        high_balance_cents: a.highBalanceCents || null,
        balance_cents: a.balanceCents || null,
        monthly_payment_cents: a.monthlyPaymentCents || null,
        account_type: a.accountType || "other",
        loan_type: a.loanType || "other",
        responsibility: a.responsibility || "unknown",
        terms: a.terms || null,
        payment_status: a.paymentStatus || null,
      }));

      const { error: accountsError } = await supabase
        .from("credit_accounts")
        .insert(accountRecords);

      if (accountsError) {
        logger.error({ err: accountsError }, "Failed to insert credit accounts");
      } else {
        accountsInserted = accounts.length;
      }
    }

    // 4. Upsert inquiries (deduplicate on user_id, bureau, company_name, inquiry_date)
    if (inquiries.length > 0) {
      for (const inquiry of inquiries) {
        const { error: inquiryError } = await supabase
          .from("credit_inquiries")
          .upsert(
            {
              user_id: userId,
              player_number: playerNumber,
              bureau,
              snapshot_id: snapshotId,
              last_seen_snapshot_id: snapshotId,
              company_name: inquiry.company,
              inquiry_date: inquiry.date,
              inquiry_type: inquiry.type || null,
            },
            {
              onConflict: "user_id,bureau,company_name,inquiry_date",
              ignoreDuplicates: false,
            }
          );

        if (inquiryError) {
          logger.error({ err: inquiryError, inquiry }, "Failed to upsert credit inquiry");
        } else {
          inquiriesInserted++;
        }
      }
    }

    logger.info({
      userId,
      bureau,
      playerNumber,
      snapshotId,
      scoresInserted,
      accountsInserted,
      inquiriesInserted,
    }, "Credit report imported successfully");

    return NextResponse.json({
      success: true,
      snapshotId,
      summary: {
        bureau,
        scores: scoresInserted,
        accounts: accountsInserted,
        inquiries: inquiriesInserted,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Credit report import error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
