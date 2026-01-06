import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { TransactionsClient } from "./transactions-client";

export const metadata: Metadata = {
  title: "Credit Transactions | Admin | CardTool",
  description: "Review and manage credit transactions from Plaid",
};

interface SearchParams {
  cardId?: string;
  status?: "unmatched" | "matched" | "dismissed" | "all";
  type?: "credits" | "clawbacks" | "all";
  days?: string;
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await currentUser();

  if (!user || !isAdminEmail(user.emailAddresses?.[0]?.emailAddress)) {
    redirect("/");
  }

  const params = await searchParams;
  // Use admin client to bypass RLS (we already verified admin access above)
  const supabase = createAdminClient();

  // Fetch all cards for the filter dropdown
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  // Fetch all credits with their card info for assignment
  const { data: credits } = await supabase
    .from("card_credits")
    .select(`
      id,
      name,
      brand_name,
      card_id,
      cards:card_id (
        name,
        slug,
        issuers:issuer_id (
          id,
          name
        )
      )
    `)
    .eq("is_active", true)
    .order("name");

  // Normalize credits into CreditOption format (grouped by issuer + credit name)
  interface CreditOption {
    representative_credit_id: string;
    name: string;
    issuer: { id: string; name: string } | null;
    credit_ids: string[];
  }

  const creditOptionsMap = new Map<string, CreditOption>();
  credits?.forEach((c) => {
    const card = c.cards as { name: string; slug: string; issuers: { id: string; name: string } | null } | null;
    const issuer = card?.issuers;
    const key = `${issuer?.id || "none"}-${c.name}`;

    if (!creditOptionsMap.has(key)) {
      creditOptionsMap.set(key, {
        representative_credit_id: c.id,
        name: c.name,
        issuer: issuer || null,
        credit_ids: [c.id],
      });
    } else {
      creditOptionsMap.get(key)!.credit_ids.push(c.id);
    }
  });

  // Sort by issuer name, then credit name
  const creditOptions = Array.from(creditOptionsMap.values()).sort((a, b) => {
    const issuerA = a.issuer?.name?.toLowerCase() ?? "";
    const issuerB = b.issuer?.name?.toLowerCase() ?? "";
    if (issuerA !== issuerB) return issuerA.localeCompare(issuerB);
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Fetch all brand names from credits for filtering potential credits
  const brandNames = new Set<string>();
  credits?.forEach(c => {
    if (c.brand_name) brandNames.add(c.brand_name.toLowerCase());
    // Add significant words from credit names
    c.name.split(/\s+/).forEach(word => {
      if (word.length > 3) brandNames.add(word.toLowerCase());
    });
  });

  // Build query for transactions
  let query = supabase
    .from("user_plaid_transactions")
    .select(`
      id,
      user_id,
      linked_account_id,
      plaid_transaction_id,
      name,
      amount_cents,
      date,
      pending,
      category,
      merchant_name,
      matched_credit_id,
      matched_rule_id,
      is_clawback,
      dismissed,
      created_at,
      user_linked_accounts:linked_account_id (
        name,
        official_name,
        mask,
        wallet_card_id,
        user_wallets:wallet_card_id (
          card_id,
          cards:card_id (
            id,
            name,
            slug
          )
        )
      )
    `)
    .order("date", { ascending: false });

  // Apply date filter
  const daysFilter = parseInt(params.days || "90");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysFilter);
  query = query.gte("date", startDate.toISOString().split("T")[0]);

  // Apply status filter
  const statusFilter = params.status || "unmatched";
  if (statusFilter === "unmatched") {
    query = query.is("matched_credit_id", null).eq("dismissed", false);
  } else if (statusFilter === "matched") {
    query = query.not("matched_credit_id", "is", null);
  } else if (statusFilter === "dismissed") {
    query = query.eq("dismissed", true);
  }

  // Apply type filter
  const typeFilter = params.type || "credits";
  if (typeFilter === "credits") {
    query = query.lt("amount_cents", 0);
  } else if (typeFilter === "clawbacks") {
    query = query.gt("amount_cents", 0);
  }

  // Limit results
  query = query.limit(500);

  const { data: transactions, error } = await query;

  if (error) {
    console.error("Failed to fetch transactions:", error);
  }

  // Filter transactions to only show potential credits
  // (those with "credit" in name or matching brand names)
  const potentialCreditTransactions = (transactions || []).filter(txn => {
    const nameLower = txn.name.toLowerCase();

    // Always include if contains "credit"
    if (nameLower.includes("credit")) return true;

    // Check brand name matches
    for (const brand of brandNames) {
      if (nameLower.includes(brand)) return true;
    }

    // If status is matched or dismissed, include all
    if (statusFilter === "matched" || statusFilter === "dismissed" || statusFilter === "all") {
      return true;
    }

    return false;
  });

  // Filter by card if specified
  let filteredTransactions = potentialCreditTransactions;
  if (params.cardId) {
    filteredTransactions = potentialCreditTransactions.filter(txn => {
      const walletCard = txn.user_linked_accounts?.user_wallets;
      const card = Array.isArray(walletCard) ? walletCard[0]?.cards : walletCard?.cards;
      return card?.id === params.cardId;
    });
  }

  // Fetch existing matching rules
  const { data: matchingRules } = await supabase
    .from("credit_matching_rules")
    .select(`
      id,
      credit_id,
      pattern,
      match_amount_cents,
      created_at
    `)
    .order("created_at", { ascending: false });

  // Fetch exclusion patterns
  const { data: exclusionPatterns } = await supabase
    .from("transaction_exclusion_patterns")
    .select("pattern");

  // Filter out transactions matching exclusion patterns (only for unmatched view)
  if (statusFilter === "unmatched" && exclusionPatterns && exclusionPatterns.length > 0) {
    filteredTransactions = filteredTransactions.filter(txn => {
      const nameLower = txn.name.toLowerCase();
      return !exclusionPatterns.some(ep => 
        nameLower.includes(ep.pattern.toLowerCase())
      );
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Credit Transactions</h1>
          <p className="text-zinc-400 mt-1">
            Review potential credit transactions and create matching rules
          </p>
        </div>

        <TransactionsClient
          transactions={filteredTransactions}
          cards={cards || []}
          creditOptions={creditOptions}
          matchingRules={matchingRules || []}
          filters={{
            cardId: params.cardId || "",
            status: statusFilter,
            type: typeFilter,
            days: daysFilter.toString(),
          }}
        />
      </div>
    </div>
  );
}

