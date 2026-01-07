"use client";

import { useState, useMemo } from "react";
import { parseLocalDate } from "@/lib/utils";
import { ChevronDown, Check, XCircle } from "lucide-react";

interface WalletCard {
  id: string;
  card_id: string;
  approval_date: string | null;
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

interface RulesClientProps {
  rules: Rule[];
  walletCards: WalletCard[];
}

interface RuleWithStatus extends Rule {
  userCount: number;
  isOverLimit: boolean;
}

export function RulesClient({ rules, walletCards }: RulesClientProps) {
  // Start with all issuers expanded
  const [collapsedIssuers, setCollapsedIssuers] = useState<Set<string>>(new Set());

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

        matchingCards = walletCards.filter((wc) => {
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
        matchingCards = walletCards.filter((wc) => {
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

      return { ...rule, userCount, isOverLimit };
    });
  }, [rules, walletCards]);

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

  const toggleIssuer = (issuerName: string) => {
    setCollapsedIssuers((prev) => {
      const next = new Set(prev);
      if (next.has(issuerName)) {
        next.delete(issuerName);
      } else {
        next.add(issuerName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {Object.entries(rulesByIssuer)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([issuerName, issuerRules]) => {
          const isExpanded = !collapsedIssuers.has(issuerName);
          const hasIssues = issuerRules.some((r) => r.isOverLimit);

          return (
            <div
              key={issuerName}
              className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              {/* Issuer Header */}
              <button
                onClick={() => toggleIssuer(issuerName)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-white">{issuerName}</span>
                  {hasIssues && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                      At Limit
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform ${
                    isExpanded ? "" : "rotate-180"
                  }`}
                />
              </button>

              {/* Rules List */}
              {isExpanded && (
                <div className="divide-y divide-zinc-800 border-t border-zinc-800">
                  {issuerRules.map((rule) => (
                    <div key={rule.id} className="px-4 py-3">
                      {/* Count and time window */}
                      <div className="flex items-baseline gap-1 mb-1">
                        <span
                          className={`text-xl font-bold ${
                            rule.isOverLimit ? "text-red-400" : "text-white"
                          }`}
                        >
                          {rule.userCount}
                        </span>
                        <span className="text-zinc-500">/</span>
                        <span className="text-zinc-400">{rule.card_limit}</span>
                        {rule.rule_type === "velocity" && (
                          <span className="text-sm text-zinc-500 ml-1">
                            in {rule.time_window}
                            {rule.time_unit === "days" ? "d" : "mo"}
                          </span>
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
                          {rule.requires_banking && (
                            <span className="text-blue-400">(w/ banking)</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
