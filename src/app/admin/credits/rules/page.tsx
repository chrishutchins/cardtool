import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { RulesClient } from "./rules-client";

export const metadata: Metadata = {
  title: "Matching Rules | Admin",
};

interface Rule {
  id: string;
  pattern: string;
  match_amount_cents: number | null;
  created_at: string | null;
  credit: {
    id: string;
    name: string;
    canonical_name: string | null;
    card: {
      id: string;
      name: string;
      issuer: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
  match_count: number;
}

interface Credit {
  id: string;
  name: string;
  canonical_name: string | null;
  card: {
    id: string;
    name: string;
    issuer: {
      id: string;
      name: string;
    } | null;
  } | null;
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

  // Transform rules data
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

    return {
      id: r.id,
      pattern: r.pattern,
      match_amount_cents: r.match_amount_cents,
      created_at: r.created_at,
      credit: credit
        ? {
            id: credit.id,
            name: credit.name,
            canonical_name: credit.canonical_name,
            card: credit.cards
              ? {
                  id: credit.cards.id,
                  name: credit.cards.name,
                  issuer: credit.cards.issuers,
                }
              : null,
          }
        : null,
      match_count: countByRuleId.get(r.id) || 0,
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

  const credits: Credit[] = (creditsData || []).map((c) => {
    const card = c.cards as {
      id: string;
      name: string;
      issuers: { id: string; name: string } | null;
    } | null;

    return {
      id: c.id,
      name: c.name,
      canonical_name: c.canonical_name,
      card: card
        ? {
            id: card.id,
            name: card.name,
            issuer: card.issuers,
          }
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Matching Rules</h1>
        <p className="text-zinc-400 mt-1">
          Manage rules that automatically match transactions to credits
        </p>
      </div>

      <RulesClient rules={rules} credits={credits} />
    </div>
  );
}

