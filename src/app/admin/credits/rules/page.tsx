import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { RulesClient } from "./rules-client";

export const metadata: Metadata = {
  title: "Matching Rules | Admin",
};

// Force dynamic rendering - don't cache
export const dynamic = "force-dynamic";

interface MatchedTransaction {
  id: string;
  name: string;
  amount_cents: number;
  date: string;
  authorized_date?: string | null;
  merchant_name: string | null;
  card_name: string | null;
}

interface Rule {
  id: string;
  pattern: string;
  match_amount_cents: number | null;
  created_at: string | null;
  credit: {
    id: string;
    name: string;
    issuer: {
      id: string;
      name: string;
    } | null;
  } | null;
  match_count: number;
  matched_transactions: MatchedTransaction[];
}

// Normalized credit option for dropdown: unique Issuer + Credit Name combo
interface CreditOption {
  // Use first credit ID for this issuer/name combo (for creating new rules)
  representative_credit_id: string;
  name: string;
  issuer: {
    id: string;
    name: string;
  } | null;
  // All credit IDs that share this issuer/name
  credit_ids: string[];
}

export default async function RulesPage() {
  const user = await currentUser();

  if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
    redirect("/");
  }

  const supabase = createAdminClient();

  // Fetch rules with credit and card info
  const { data: rulesData } = await supabase
    .from("credit_matching_rules")
    .select(`
      id,
      pattern,
      match_amount_cents,
      created_at,
      card_credits:credit_id (
        id,
        name,
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

  // Get all matched transactions grouped by rule, with card info
  // Relationship chain: user_plaid_transactions → user_linked_accounts → user_wallets → cards
  const { data: matchedTxns, error: matchedTxnsError } = await supabase
    .from("user_plaid_transactions")
    .select(`
      id, 
      name, 
      amount_cents, 
      date,
      authorized_date, 
      merchant_name, 
      matched_rule_id,
      user_linked_accounts:linked_account_id (
        user_wallets:wallet_card_id (
          custom_name,
          cards:card_id (
            name
          )
        )
      )
    `)
    .not("matched_rule_id", "is", null)
    .order("date", { ascending: false });

  if (matchedTxnsError) {
    console.error("Error fetching matched transactions:", matchedTxnsError);
  }
  console.log("Matched transactions count:", matchedTxns?.length || 0);

  const txnsByRuleId = new Map<string, MatchedTransaction[]>();
  matchedTxns?.forEach((t) => {
    if (t.matched_rule_id) {
      if (!txnsByRuleId.has(t.matched_rule_id)) {
        txnsByRuleId.set(t.matched_rule_id, []);
      }
      const linkedAccount = t.user_linked_accounts as { 
        user_wallets: { custom_name: string | null; cards: { name: string } | null } | null 
      } | null;
      txnsByRuleId.get(t.matched_rule_id)!.push({
        id: t.id,
        name: t.name,
        amount_cents: t.amount_cents,
        date: t.date,
        authorized_date: t.authorized_date,
        merchant_name: t.merchant_name,
        card_name: linkedAccount?.user_wallets?.custom_name || linkedAccount?.user_wallets?.cards?.name || null,
      });
    }
  });

  // Transform rules data - show Issuer instead of Card
  const rules: Rule[] = (rulesData || []).map((r) => {
    const credit = r.card_credits as {
      id: string;
      name: string;
      cards: {
        id: string;
        name: string;
        issuers: { id: string; name: string } | null;
      } | null;
    } | null;

    const transactions = txnsByRuleId.get(r.id) || [];

    return {
      id: r.id,
      pattern: r.pattern,
      match_amount_cents: r.match_amount_cents,
      created_at: r.created_at,
      credit: credit
        ? {
            id: credit.id,
            name: credit.name,
            issuer: credit.cards?.issuers || null,
          }
        : null,
      match_count: transactions.length,
      matched_transactions: transactions,
    };
  });

  // Fetch all credits for the edit dropdown
  const { data: creditsData } = await supabase
    .from("card_credits")
    .select(`
      id,
      name,
      cards:card_id (
        id,
        name,
        issuers:issuer_id (
          id,
          name
        )
      )
    `)
    .eq("is_active", true)
    .order("name");

  // Normalize credits to unique Issuer + Credit Name combos
  const creditOptionsMap = new Map<string, CreditOption>();
  
  (creditsData || []).forEach((c) => {
    const card = c.cards as {
      id: string;
      name: string;
      issuers: { id: string; name: string } | null;
    } | null;
    
    const issuer = card?.issuers || null;
    const issuerId = issuer?.id || "unknown";
    const key = `${issuerId}:${c.name}`;
    
    if (!creditOptionsMap.has(key)) {
      creditOptionsMap.set(key, {
        representative_credit_id: c.id,
        name: c.name,
        issuer,
        credit_ids: [c.id],
      });
    } else {
      creditOptionsMap.get(key)!.credit_ids.push(c.id);
    }
  });

  const creditOptions: CreditOption[] = Array.from(creditOptionsMap.values()).sort((a, b) => {
    // Sort by issuer name, then by credit name
    const issuerA = a.issuer?.name || "ZZZ";
    const issuerB = b.issuer?.name || "ZZZ";
    if (issuerA !== issuerB) return issuerA.localeCompare(issuerB);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Matching Rules</h1>
        <p className="text-zinc-400 mt-1">
          Manage rules that automatically match transactions to credits
        </p>
      </div>

      <RulesClient rules={rules} creditOptions={creditOptions} />
    </div>
  );
}
