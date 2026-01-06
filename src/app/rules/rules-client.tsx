"use client";

import { useState, useMemo } from "react";
import { parseLocalDate } from "@/lib/utils";
import { ChevronDown, Check, AlertCircle, XCircle, Info } from "lucide-react";

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

type RuleStatus = "safe" | "warning" | "danger";

interface RuleWithStatus extends Rule {
  userCount: number;
  status: RuleStatus;
}

export function RulesClient({ rules, walletCards }: RulesClientProps) {
  const [expandedIssuers, setExpandedIssuers] = useState<Set<string>>(new Set());

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
      let status: RuleStatus = "safe";
      if (userCount >= rule.card_limit) {
        status = "danger";
      } else if (userCount === rule.card_limit - 1) {
        status = "warning";
      }

      return { ...rule, userCount, status };
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
    setExpandedIssuers((prev) => {
      const next = new Set(prev);
      if (next.has(issuerName)) {
        next.delete(issuerName);
      } else {
        next.add(issuerName);
      }
      return next;
    });
  };

  // Start with all issuers expanded
  const allExpanded = Object.keys(rulesByIssuer).length === expandedIssuers.size;

  const getStatusIcon = (status: RuleStatus) => {
    switch (status) {
      case "safe":
        return <Check className="w-4 h-4 text-emerald-400" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case "danger":
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: RuleStatus) => {
    switch (status) {
      case "safe":
        return "text-emerald-400";
      case "warning":
        return "text-amber-400";
      case "danger":
        return "text-red-400";
    }
  };

  const getStatusBg = (status: RuleStatus) => {
    switch (status) {
      case "safe":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "danger":
        return "bg-red-500/10 border-red-500/20";
    }
  };

  const formatRuleLabel = (rule: RuleWithStatus) => {
    if (rule.rule_type === "velocity") {
      const unit = rule.time_unit === "days" ? "d" : "mo";
      return `${rule.time_window}${unit}`;
    }
    return "max";
  };

  return (
    <div className="space-y-4">
      {/* Quick expand/collapse all */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (allExpanded) {
              setExpandedIssuers(new Set());
            } else {
              setExpandedIssuers(new Set(Object.keys(rulesByIssuer)));
            }
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {Object.entries(rulesByIssuer)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([issuerName, issuerRules]) => {
          const isExpanded = expandedIssuers.has(issuerName);
          const hasIssues = issuerRules.some((r) => r.status !== "safe");

          return (
            <div
              key={issuerName}
              className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              {/* Issuer Header */}
              <button
                onClick={() => toggleIssuer(issuerName)}
                className="w-full px-4 py-3 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-white">{issuerName}</span>
                  {hasIssues && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                      Attention
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Rules List */}
              {isExpanded && (
                <div className="divide-y divide-zinc-800">
                  {issuerRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`px-4 py-4 ${getStatusBg(rule.status)} border-l-4 ${
                        rule.status === "safe"
                          ? "border-l-emerald-500"
                          : rule.status === "warning"
                          ? "border-l-amber-500"
                          : "border-l-red-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(rule.status)}
                            <span className="font-medium text-white">{rule.name}</span>
                            {rule.requires_banking && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                                w/ banking
                              </span>
                            )}
                          </div>

                          {/* Status Display */}
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className={`text-2xl font-bold ${getStatusColor(rule.status)}`}>
                              {rule.userCount}
                            </span>
                            <span className="text-zinc-500">/</span>
                            <span className="text-lg text-zinc-400">{rule.card_limit}</span>
                            <span className="text-sm text-zinc-500 ml-1">
                              {formatRuleLabel(rule)}
                            </span>
                          </div>

                          {/* Description */}
                          {rule.description && (
                            <p className="mt-2 text-sm text-zinc-400">{rule.description}</p>
                          )}

                          {/* Rule details */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${
                                rule.rule_type === "velocity"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-purple-500/20 text-purple-400"
                              }`}
                            >
                              {rule.rule_type === "velocity" ? "Velocity" : "Limit"}
                            </span>
                            {rule.card_type && rule.card_type !== "both" && (
                              <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
                                {rule.card_type} only
                              </span>
                            )}
                            {rule.counts_all_issuers && (
                              <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                                All issuers
                              </span>
                            )}
                            {rule.charge_type && rule.charge_type !== "all" && (
                              <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
                                {rule.charge_type} cards
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
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

