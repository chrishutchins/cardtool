import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { RulesClient } from "./rules-client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Application Rules | CardTool",
  description: "Track your status against credit card application rules",
};

interface WalletCard {
  id: string;
  card_id: string;
  approval_date: string | null;
  player_number: number | null;
  custom_name: string | null;
  cards: {
    id: string;
    name: string;
    issuer_id: string;
    product_type: "personal" | "business";
    card_charge_type: "credit" | "charge" | "debit" | null;
    issuers: { id: string; name: string } | null;
  } | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

interface Rule {
  id: string;
  issuer_id: string;
  rule_type: string;
  name: string;
  description: string | null;
  card_limit: number;
  card_type: string | null;
  time_window: number | null;
  time_unit: string | null;
  counts_all_issuers: boolean | null;
  charge_type: string | null;
  requires_banking: boolean | null;
  display_order: number | null;
  is_active: boolean | null;
  issuers: { id: string; name: string } | null;
}

export default async function RulesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();

  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  const [walletResult, rulesResult, playersResult] = await Promise.all([
    // Only fetch active cards for application rule tracking
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        approval_date,
        player_number,
        custom_name,
        cards:card_id (
          id,
          name,
          issuer_id,
          product_type,
          card_charge_type,
          issuers:issuer_id (id, name)
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),
    supabase
      .from("application_rules")
      .select(`
        *,
        issuers:issuer_id (id, name)
      `)
      .eq("is_active", true)
      .order("display_order")
      .order("name"),
    supabase
      .from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId)
      .order("player_number"),
  ]);

  const walletCards = (walletResult.data ?? []) as unknown as WalletCard[];
  const rules = (rulesResult.data ?? []) as Rule[];
  const players = (playersResult.data ?? []) as Player[];
  const playerCount = players.length > 0 ? Math.max(...players.map(p => p.player_number)) : 1;

  // Check for cards missing approval dates
  const cardsWithoutDates = walletCards.filter(
    (wc) => wc.cards && !wc.approval_date
  );

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader
        isAdmin={isAdmin}
        emulationInfo={emulationInfo}
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Application Rules</h1>
          <p className="text-zinc-400 mt-1">
            Track your status against issuer velocity and limit restrictions
          </p>
        </div>

        {/* Missing Dates Warning */}
        {cardsWithoutDates.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-200 font-medium">
                  {cardsWithoutDates.length} card{cardsWithoutDates.length !== 1 ? "s" : ""} missing
                  approval date{cardsWithoutDates.length !== 1 ? "s" : ""}
                </p>
                <p className="text-amber-200/70 text-sm mt-1">
                  Add opening dates to your cards for accurate rule tracking.
                </p>
                <Link
                  href="/wallet"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Go to Wallet →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Rules Display */}
        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400 mb-2">No application rules configured yet.</p>
            <p className="text-zinc-500 text-sm">
              Check back later for velocity and limit rule tracking.
            </p>
          </div>
        ) : (
          <RulesClient 
            rules={rules} 
            walletCards={walletCards} 
            players={players}
            playerCount={playerCount}
          />
        )}
      </div>
    </div>
  );
}

