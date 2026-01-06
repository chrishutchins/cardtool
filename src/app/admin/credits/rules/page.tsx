import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { RulesClient } from "./rules-client";

export const metadata: Metadata = {
  title: "Matching Rules | Admin",
};

interface MatchedTransaction {
  id: string;
  name: string;
  amount_cents: number;
  date: string;
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
    canonical_name: string | null;
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
  canonical_name: string | null;
  issuer: {
    id: string;
    name: string;
  } | null;
  // All credit IDs that share this issuer/name or canonical_name
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

  // Get all matched transactions grouped by rule, with card info
  const { data: matchedTxns } = await supabase
    .from("user_plaid_transactions")
    .select(`
      id, 
      name, 
      amount_cents, 
      date, 
      merchant_name, 
      matched_rule_id,
      user_linked_accounts:linked_account_id (
        cards:card_id (
          name
        )
      )
    `)
    .not("matched_rule_id", "is", null)
    .order("date", { ascending: false });

  const txnsByRuleId = new Map<string, MatchedTransaction[]>();
  matchedTxns?.forEach((t) => {
    if (t.matched_rule_id) {
      if (!txnsByRuleId.has(t.matched_rule_id)) {
        txnsByRuleId.set(t.matched_rule_id, []);
      }
      const linkedAccount = t.user_linked_accounts as { cards: { name: string } | null } | null;
      txnsByRuleId.get(t.matched_rule_id)!.push({
        id: t.id,
        name: t.name,
        amount_cents: t.amount_cents,
        date: t.date,
        merchant_name: t.merchant_name,
        card_name: linkedAccount?.cards?.name || null,
      });
    }
  });

  // Transform rules data - show Issuer instead of Card
  const rules: Rule[] = (rulesData || []).map((r) => {
    const credit = r.card_credits as {
      id: string;
      name: string;
      canonical_name: string | null;
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
            name: credit.canonical_name || credit.name,
            canonical_name: credit.canonical_name,
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
      canonical_name,
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

  // Normalize credits to unique Issuer + Credit Name (or canonical_name) combos
  const creditOptionsMap = new Map<string, CreditOption>();
  
  (creditsData || []).forEach((c) => {
    const card = c.cards as {
      id: string;
      name: string;
      issuers: { id: string; name: string } | null;
    } | null;
    
    const issuer = card?.issuers || null;
    const displayName = c.canonical_name || c.name;
    const issuerId = issuer?.id || "unknown";
    const key = `${issuerId}:${displayName}`;
    
    if (!creditOptionsMap.has(key)) {
      creditOptionsMap.set(key, {
        representative_credit_id: c.id,
        name: displayName,
        canonical_name: c.canonical_name,
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
