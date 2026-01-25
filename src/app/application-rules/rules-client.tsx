"use client";

import { useState, useMemo } from "react";
import { parseLocalDate } from "@/lib/utils";
import { Check, XCircle, Eye, X } from "lucide-react";

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
    card_charge_type: "credit" | "charge" | null;
    issuers: { id: string; name: string } | null;
  } | null;
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

interface Player {
  player_number: number;
  description: string | null;
}

interface RulesClientProps {
  rules: Rule[];
  walletCards: WalletCard[];
  players?: Player[];
  playerCount?: number;
}

interface RuleWithStatus extends Rule {
  userCount: number;
  isOverLimit: boolean;
  matchingCards: WalletCard[];
}

interface DetailsModalProps {
  rule: RuleWithStatus;
  showPlayerColumn: boolean;
  onClose: () => void;
}

function DetailsModal({ rule, showPlayerColumn, onClose }: DetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-xl border border-zinc-700 max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">
            {rule.name} — {rule.userCount} card{rule.userCount !== 1 ? "s" : ""}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {rule.matchingCards.length === 0 ? (
            <p className="text-zinc-400 text-center py-4">No matching cards</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-400 uppercase">
                  <th className="pb-2">Card</th>
                  {showPlayerColumn && <th className="pb-2 text-center">Player</th>}
                  <th className="pb-2 text-right">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[...rule.matchingCards]
                  .sort((a, b) => {
                    // Sort by approval_date descending (most recent first)
                    if (!a.approval_date && !b.approval_date) return 0;
                    if (!a.approval_date) return 1;
                    if (!b.approval_date) return -1;
                    return new Date(b.approval_date).getTime() - new Date(a.approval_date).getTime();
                  })
                  .map((wc) => (
                  <tr key={wc.id}>
                    <td className="py-2 pr-2">
                      <span className="text-white">
                        {wc.custom_name || wc.cards?.name || "Unknown"}
                      </span>
                    </td>
                    {showPlayerColumn && (
                      <td className="py-2 text-center text-zinc-400">
                        P{wc.player_number ?? 1}
                      </td>
                    )}
                    <td className="py-2 text-right text-zinc-400">
                      {wc.approval_date
                        ? parseLocalDate(wc.approval_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function RulesClient({ rules, walletCards, players = [], playerCount = 1 }: RulesClientProps) {
  // Selected player filter (1 = P1, etc.)
  const [selectedPlayer, setSelectedPlayer] = useState(1);
  
  // Modal state
  const [selectedRule, setSelectedRule] = useState<RuleWithStatus | null>(null);
  
  // Show player selector if there are multiple players
  const showPlayerSelector = playerCount > 1;
  
  // Build player descriptions map
  const playerDescriptions = useMemo(() => {
    const map = new Map<number, string>();
    players.forEach(p => {
      map.set(p.player_number, p.description || `P${p.player_number}`);
    });
    return map;
  }, [players]);
  
  // Filter wallet cards by selected player
  // Clamp player_number to valid range to handle orphaned cards from decreased player count
  const filteredWalletCards = useMemo(() => {
    if (!showPlayerSelector) return walletCards;
    return walletCards.filter(wc => {
      const effectivePlayerNum = Math.min(Math.max(1, wc.player_number ?? 1), playerCount);
      return effectivePlayerNum === selectedPlayer;
    });
  }, [walletCards, selectedPlayer, showPlayerSelector, playerCount]);

  // Calculate user status for each rule
  const rulesWithStatus = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rules.map((rule): RuleWithStatus => {
      let matchingCards: WalletCard[] = [];

      if (rule.rule_type === "velocity") {
        // Calculate cutoff date
        let cutoffDate: Date;
        if (rule.time_unit === "days") {
          cutoffDate = new Date(today);
          cutoffDate.setDate(cutoffDate.getDate() - (rule.time_window ?? 0));
        } else {
          cutoffDate = new Date(today);
          cutoffDate.setMonth(cutoffDate.getMonth() - (rule.time_window ?? 0));
        }

        matchingCards = filteredWalletCards.filter((wc) => {
          if (!wc.cards || !wc.approval_date) return false;

          // Check card type filter
          if (
            rule.card_type &&
            rule.card_type !== "both" &&
            wc.cards.product_type !== rule.card_type
          ) {
            return false;
          }

          // Check issuer filter
          if (!rule.counts_all_issuers && wc.cards.issuer_id !== rule.issuer_id) {
            return false;
          }

          // Check date is within window
          const approvalDate = parseLocalDate(wc.approval_date);
          return approvalDate >= cutoffDate;
        });
      } else {
        // Limit rule - count all matching cards
        matchingCards = filteredWalletCards.filter((wc) => {
          if (!wc.cards) return false;

          // Limits always apply to issuer only
          if (wc.cards.issuer_id !== rule.issuer_id) return false;

          // Check card type filter
          if (
            rule.card_type &&
            rule.card_type !== "both" &&
            wc.cards.product_type !== rule.card_type
          ) {
            return false;
          }

          // Check charge type filter
          if (rule.charge_type && rule.charge_type !== "all") {
            const cardChargeType = wc.cards.card_charge_type ?? "credit";
            if (cardChargeType !== rule.charge_type) return false;
          }

          return true;
        });
      }

      const userCount = matchingCards.length;
      const isOverLimit = userCount >= rule.card_limit;

      return { ...rule, userCount, isOverLimit, matchingCards };
    });
  }, [rules, filteredWalletCards]);

  // Group rules by issuer
  const rulesByIssuer = useMemo(() => {
    const grouped: Record<string, RuleWithStatus[]> = {};
    rulesWithStatus.forEach((rule) => {
      const issuerName = rule.issuers?.name ?? "Unknown";
      if (!grouped[issuerName]) grouped[issuerName] = [];
      grouped[issuerName].push(rule);
    });
    return grouped;
  }, [rulesWithStatus]);

  return (
    <>
      {/* Player Selector */}
      {showPlayerSelector && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-zinc-400">Viewing rules for:</span>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(parseInt(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            {Array.from({ length: playerCount }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                {playerDescriptions.get(num) || `P${num}`}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Issuers - each full width with rules in 2-column grid */}
      <div className="space-y-4">
        {Object.entries(rulesByIssuer)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([issuerName, issuerRules]) => (
            <div
              key={issuerName}
              className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              {/* Issuer Header */}
              <div className="px-4 py-3 border-b border-zinc-800">
                <span className="text-lg font-semibold text-white">{issuerName}</span>
              </div>

              {/* Rules in 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                {issuerRules.map((rule, idx) => (
                  <div 
                    key={rule.id} 
                    className={`px-4 py-3 ${
                      // Add border between cells
                      idx % 2 === 0 ? "md:border-r md:border-zinc-800" : ""
                    } ${
                      // Add border below rows (except last row)
                      idx < issuerRules.length - 2 || (issuerRules.length % 2 === 1 && idx < issuerRules.length - 1)
                        ? "border-b border-zinc-800"
                        : idx === issuerRules.length - 2 && issuerRules.length % 2 === 0
                        ? "border-b border-zinc-800"
                        : ""
                    }`}
                  >
                    {/* Count and time window */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-2xl font-bold ${
                            rule.isOverLimit ? "text-red-400" : "text-white"
                          }`}
                        >
                          {rule.userCount}
                        </span>
                        <span className="text-lg text-zinc-500">/</span>
                        <span className="text-lg text-zinc-400">{rule.card_limit}</span>
                        {rule.rule_type === "velocity" && (
                          <span className="text-zinc-500 ml-1">
                            in {rule.time_window}
                            {rule.time_unit === "days" ? "d" : "mo"}
                          </span>
                        )}
                      </div>
                      
                      {/* Details button - only show when count > 0 */}
                      {rule.userCount > 0 && (
                        <button
                          onClick={() => setSelectedRule(rule)}
                          className="text-zinc-500 hover:text-white transition-colors p-1"
                          title="View matching cards"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Description with icon */}
                    {rule.description && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        {rule.isOverLimit ? (
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        )}
                        <span>{rule.description}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Details Modal */}
      {selectedRule && (
        <DetailsModal
          rule={selectedRule}
          showPlayerColumn={showPlayerSelector}
          onClose={() => setSelectedRule(null)}
        />
      )}
    </>
  );
}
