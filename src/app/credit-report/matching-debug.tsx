"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  getMatchingDebugInfo,
  type CreditAccount,
  type GroupDebugInfo,
  type MatchDebugInfo,
} from "./account-matching";

type CreditBureau = "equifax" | "experian" | "transunion";

interface MatchingDebugProps {
  accounts: CreditAccount[];
}

const BUREAU_SHORT: Record<CreditBureau, string> = {
  equifax: "EQ",
  experian: "EX",
  transunion: "TU",
};

const BUREAU_COLORS: Record<CreditBureau, string> = {
  equifax: "text-blue-400",
  experian: "text-red-400",
  transunion: "text-green-400",
};

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toLocaleString()}`;
}

function ScoreBreakdown({ breakdown }: { breakdown: MatchDebugInfo["breakdown"] }) {
  const items = [
    { label: "Date", value: breakdown.dateMatch, max: 50 },
    { label: "Limit", value: breakdown.limitMatch, max: 30 },
    { label: "Balance", value: breakdown.balanceMatch, max: 20 },
    { label: "Creditor", value: breakdown.creditorMatch, max: 15 },
    { label: "Last 4", value: breakdown.last4Match, max: 25 },
    { label: "First 6", value: breakdown.first6Match, max: 20 },
    { label: "Loan Type", value: breakdown.loanTypeMatch, max: 5 },
    { label: "Status", value: breakdown.statusMatch, max: 5 },
  ];

  return (
    <div className="grid grid-cols-4 gap-1 text-xs">
      {items.map(({ label, value, max }) => (
        <div
          key={label}
          className={`px-1.5 py-0.5 rounded ${
            value > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700/50 text-zinc-500"
          }`}
        >
          {label}: {value}/{max}
        </div>
      ))}
    </div>
  );
}

function MatchScoreRow({ match }: { match: MatchDebugInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-l-2 border-zinc-700 pl-3 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-left w-full"
      >
        <span className={`font-mono font-bold ${match.score >= 50 ? "text-emerald-400" : "text-zinc-500"}`}>
          {match.score}
        </span>
        <span className={`text-xs ${BUREAU_COLORS[match.account1.bureau]}`}>
          {BUREAU_SHORT[match.account1.bureau]}
        </span>
        <span className="text-zinc-500">↔</span>
        <span className={`text-xs ${BUREAU_COLORS[match.account2.bureau]}`}>
          {BUREAU_SHORT[match.account2.bureau]}
        </span>
        {match.matched ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        ) : (
          <XCircle className="h-3 w-3 text-zinc-500" />
        )}
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-zinc-500 ml-auto" />
        ) : (
          <ChevronDown className="h-3 w-3 text-zinc-500 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <ScoreBreakdown breakdown={match.breakdown} />

          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div className={`p-2 rounded bg-zinc-800 border-l-2 ${match.account1.bureau === "equifax" ? "border-blue-400" : match.account1.bureau === "experian" ? "border-red-400" : "border-green-400"}`}>
              <div className="font-medium text-zinc-300">{match.account1.creditor}</div>
              <div className="text-zinc-500">Masked: {match.account1.masked ?? "—"}</div>
              <div className="text-zinc-500">Opened: {match.account1.dateOpened ?? "—"}</div>
              <div className="text-zinc-500">Limit: {formatCurrency(match.account1.limit)}</div>
              <div className="text-zinc-500">Balance: {formatCurrency(match.account1.balance)}</div>
            </div>
            <div className={`p-2 rounded bg-zinc-800 border-l-2 ${match.account2.bureau === "equifax" ? "border-blue-400" : match.account2.bureau === "experian" ? "border-red-400" : "border-green-400"}`}>
              <div className="font-medium text-zinc-300">{match.account2.creditor}</div>
              <div className="text-zinc-500">Masked: {match.account2.masked ?? "—"}</div>
              <div className="text-zinc-500">Opened: {match.account2.dateOpened ?? "—"}</div>
              <div className="text-zinc-500">Limit: {formatCurrency(match.account2.limit)}</div>
              <div className="text-zinc-500">Balance: {formatCurrency(match.account2.balance)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupDebugRow({ group }: { group: GroupDebugInfo }) {
  const [expanded, setExpanded] = useState(false);

  const bureauIndicator = group.bureaus.length === 3 ? "✓✓✓" : group.bureaus.length === 2 ? "✓✓" : "✓";
  const bureauColor =
    group.bureaus.length === 3 ? "text-emerald-400" : group.bureaus.length === 2 ? "text-yellow-400" : "text-zinc-500";

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono ${bureauColor}`}>{bureauIndicator}</span>
          <div>
            <div className="font-medium text-zinc-200">{group.displayName}</div>
            <div className="text-xs text-zinc-500">
              {group.accountCount} records • {group.bureaus.map((b) => BUREAU_SHORT[b]).join(", ")} •{" "}
              {group.loanType} • {group.status}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.matchScores.length > 0 && (
            <span className="text-xs text-zinc-500">
              {group.matchScores.filter((m) => m.matched).length}/{group.matchScores.length} matches
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-700 p-3 bg-zinc-900/50 space-y-3">
          {/* Accounts in this group */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Accounts in Group ({group.accounts.length})
            </h4>
            <div className="grid gap-2">
              {group.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`text-xs p-2 rounded bg-zinc-800 border-l-2 ${
                    acc.bureau === "equifax"
                      ? "border-blue-400"
                      : acc.bureau === "experian"
                      ? "border-red-400"
                      : "border-green-400"
                  }`}
                >
                  <span className={`font-medium ${BUREAU_COLORS[acc.bureau]}`}>{BUREAU_SHORT[acc.bureau]}</span>
                  <span className="text-zinc-400 ml-2">{acc.creditor}</span>
                  <span className="text-zinc-500 ml-2">• {acc.masked ?? "no mask"}</span>
                  <span className="text-zinc-500 ml-2">• Limit: {formatCurrency(acc.limit)}</span>
                  <span className="text-zinc-500 ml-2">• Bal: {formatCurrency(acc.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Match Scores */}
          {group.matchScores.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Cross-Bureau Match Scores
              </h4>
              <div className="space-y-2">
                {group.matchScores.map((match, idx) => (
                  <MatchScoreRow key={idx} match={match} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MatchingDebug({ accounts }: MatchingDebugProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<"all" | "multi" | "single">("all");

  const debugInfo = useMemo(() => {
    return getMatchingDebugInfo(accounts);
  }, [accounts]);

  const filteredGroups = useMemo(() => {
    if (filter === "multi") return debugInfo.filter((g) => g.bureaus.length > 1);
    if (filter === "single") return debugInfo.filter((g) => g.bureaus.length === 1);
    return debugInfo;
  }, [debugInfo, filter]);

  const stats = useMemo(() => {
    const total = debugInfo.length;
    const multiBureau = debugInfo.filter((g) => g.bureaus.length > 1).length;
    const allThree = debugInfo.filter((g) => g.bureaus.length === 3).length;
    const singleBureau = debugInfo.filter((g) => g.bureaus.length === 1).length;
    const totalMatches = debugInfo.reduce((sum, g) => sum + g.matchScores.filter((m) => m.matched).length, 0);

    return { total, multiBureau, allThree, singleBureau, totalMatches };
  }, [debugInfo]);

  return (
    <div className="bg-zinc-900 rounded-xl border border-amber-500/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="text-lg font-semibold text-amber-400">Matching Debug (Admin)</h2>
            <p className="text-sm text-zinc-500">
              {stats.total} groups • {stats.allThree} all 3 bureaus • {stats.multiBureau - stats.allThree} 2 bureaus •{" "}
              {stats.singleBureau} single bureau • {stats.totalMatches} cross-bureau matches
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 p-4">
          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-zinc-500">Filter:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-1 text-xs rounded ${
                filter === "all" ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter("multi")}
              className={`px-2 py-1 text-xs rounded ${
                filter === "multi" ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"
              }`}
            >
              Multi-bureau ({stats.multiBureau})
            </button>
            <button
              onClick={() => setFilter("single")}
              className={`px-2 py-1 text-xs rounded ${
                filter === "single" ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"
              }`}
            >
              Single bureau ({stats.singleBureau})
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
            <span>Score breakdown:</span>
            <span>Date (50) • Limit (30) • Last4 (25) • Balance (20) • First6 (20) • Creditor (15) • Type/Status (5)</span>
            <span className="text-zinc-400">Threshold: ≥50</span>
          </div>

          {/* Groups */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredGroups.map((group) => (
              <GroupDebugRow key={group.groupId} group={group} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
