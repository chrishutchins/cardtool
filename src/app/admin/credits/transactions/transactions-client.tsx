"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Search, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Ban
} from "lucide-react";

interface Transaction {
  id: string;
  user_id: string;
  linked_account_id: string | null;
  plaid_transaction_id: string;
  name: string;
  amount_cents: number;
  date: string;
  pending: boolean | null;
  category: string[] | null;
  merchant_name: string | null;
  matched_credit_id: string | null;
  matched_rule_id: string | null;
  is_clawback: boolean | null;
  dismissed: boolean | null;
  created_at: string | null;
  user_linked_accounts: {
    name: string;
    official_name: string | null;
    mask: string | null;
    wallet_card_id: string | null;
    user_wallets: {
      card_id: string;
      cards: {
        id: string;
        name: string;
        slug: string;
      };
    } | null;
  } | null;
}

interface Card {
  id: string;
  name: string;
  slug: string;
}

interface Credit {
  id: string;
  name: string;
  brand_name: string | null;
  card_id: string;
  cards: {
    name: string;
    slug: string;
  } | null;
}

interface MatchingRule {
  id: string;
  credit_id: string | null;
  pattern: string;
  match_amount_cents: number | null;
  created_at: string | null;
}

interface Filters {
  cardId: string;
  status: string;
  type: string;
  days: string;
}

interface TransactionsClientProps {
  transactions: Transaction[];
  cards: Card[];
  credits: Credit[];
  matchingRules: MatchingRule[];
  filters: Filters;
}

// Searchable credit selector component
function CreditSelector({
  credits,
  value,
  onChange,
  placeholder = "Search credits...",
}: {
  credits: Credit[];
  value: string;
  onChange: (creditId: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sort credits by card name, then credit name
  const sortedCredits = useMemo(() => {
    return [...credits].sort((a, b) => {
      const cardA = a.cards?.name?.toLowerCase() ?? "";
      const cardB = b.cards?.name?.toLowerCase() ?? "";
      if (cardA !== cardB) return cardA.localeCompare(cardB);
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [credits]);

  // Filter credits based on search
  const filteredCredits = useMemo(() => {
    if (!search.trim()) return sortedCredits;
    const searchLower = search.toLowerCase();
    return sortedCredits.filter(
      (credit) =>
        credit.name.toLowerCase().includes(searchLower) ||
        credit.cards?.name?.toLowerCase().includes(searchLower) ||
        credit.brand_name?.toLowerCase().includes(searchLower)
    );
  }, [sortedCredits, search]);

  // Get selected credit label
  const selectedCredit = credits.find((c) => c.id === value);
  const selectedLabel = selectedCredit
    ? `${selectedCredit.cards?.name} - ${selectedCredit.name}`
    : "";

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center justify-between"
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <span className={selectedLabel ? "text-zinc-200" : "text-zinc-400"}>
          {selectedLabel || "Select a credit..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl max-h-64 overflow-hidden">
          <div className="p-2 border-b border-zinc-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCredits.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">No credits found</div>
            ) : (
              filteredCredits.map((credit) => (
                <div
                  key={credit.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-zinc-700 ${
                    credit.id === value ? "bg-emerald-900/30 text-emerald-400" : "text-zinc-200"
                  }`}
                  onClick={() => {
                    onChange(credit.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="text-zinc-400">{credit.cards?.name}</span>
                  <span className="text-zinc-500 mx-1">-</span>
                  <span>{credit.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TransactionsClient({
  transactions,
  cards,
  credits,
  matchingRules,
  filters,
}: TransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedCredit, setSelectedCredit] = useState<Record<string, string>>({});
  const [createRuleType, setCreateRuleType] = useState<Record<string, "name" | "name_amount">>({});
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Group transactions by name pattern for easier bulk handling
  const groupedTransactions = transactions.reduce((acc, txn) => {
    // Normalize name for grouping (remove numbers, trim)
    const normalizedName = txn.name.replace(/\d+/g, "").trim().toUpperCase();
    if (!acc[normalizedName]) {
      acc[normalizedName] = [];
    }
    acc[normalizedName].push(txn);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/admin/credits/transactions?${params.toString()}`);
    });
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const formatAmount = (cents: number) => {
    const dollars = Math.abs(cents) / 100;
    const sign = cents < 0 ? "-" : "";
    return `${sign}$${dollars.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAssignCredit = async (transactionName: string, creditId: string, ruleType: "name" | "name_amount", sampleTxn: Transaction) => {
    setActionPending(transactionName);
    
    try {
      const response = await fetch("/api/admin/credits/create-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditId,
          pattern: transactionName,
          matchAmountCents: ruleType === "name_amount" ? sampleTxn.amount_cents : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create rule");
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setActionPending(null);
    }
  };

  const handleDismiss = async (transactionId: string) => {
    setActionPending(transactionId);
    
    try {
      const response = await fetch("/api/admin/credits/dismiss-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss transaction");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to dismiss:", error);
    } finally {
      setActionPending(null);
    }
  };

  const handleExcludePattern = async (pattern: string) => {
    setActionPending(`exclude-${pattern}`);
    
    try {
      const response = await fetch("/api/admin/credits/exclude-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          alert("This pattern is already excluded");
        } else {
          throw new Error(data.error || "Failed to exclude pattern");
        }
        return;
      }

      const data = await response.json();
      alert(`Excluded pattern and dismissed ${data.dismissedCount} transactions`);
      router.refresh();
    } catch (error) {
      console.error("Failed to exclude pattern:", error);
    } finally {
      setActionPending(null);
    }
  };

  const refreshSync = async () => {
    setActionPending("refresh");
    
    try {
      await fetch("/api/plaid/sync-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: true }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-zinc-900 p-4 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Card:</label>
          <select
            value={filters.cardId}
            onChange={(e) => updateFilter("cardId", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Cards</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Status:</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="unmatched">Unmatched</option>
            <option value="matched">Matched</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Type:</label>
          <select
            value={filters.type}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="credits">Credits Only</option>
            <option value="clawbacks">Clawbacks Only</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-400">Days:</label>
          <select
            value={filters.days}
            onChange={(e) => updateFilter("days", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
            <option value="730">2 years</option>
          </select>
        </div>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={refreshSync}
          disabled={actionPending === "refresh" || isPending}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${actionPending === "refresh" ? "animate-spin" : ""}`} />
          Sync All Users
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-400">Total Transactions</p>
          <p className="text-2xl font-bold text-white">{transactions.length}</p>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-400">Unique Patterns</p>
          <p className="text-2xl font-bold text-white">{Object.keys(groupedTransactions).length}</p>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-400">Matching Rules</p>
          <p className="text-2xl font-bold text-white">{matchingRules.length}</p>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-sm text-zinc-400">Credits Available</p>
          <p className="text-2xl font-bold text-white">{credits.length}</p>
        </div>
      </div>

      {/* Grouped Transactions */}
      <div className="space-y-2">
        {Object.entries(groupedTransactions)
          .sort((a, b) => b[1].length - a[1].length) // Sort by frequency
          .map(([group, txns]) => {
            const isExpanded = expandedGroups.has(group);
            const sampleTxn = txns[0];
            const isClawback = sampleTxn.amount_cents > 0;
            const uniqueAmounts = [...new Set(txns.map(t => t.amount_cents))];

            return (
              <div key={group} className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50"
                  onClick={() => toggleGroup(group)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isClawback ? "bg-amber-900/30" : "bg-emerald-900/30"}`}>
                      {isClawback ? (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{sampleTxn.name}</span>
                        <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">
                          {txns.length} transaction{txns.length > 1 ? "s" : ""}
                        </span>
                        {sampleTxn.matched_credit_id && (
                          <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                            Matched
                          </span>
                        )}
                        {sampleTxn.dismissed && (
                          <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                            Dismissed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500">
                        Amounts: {uniqueAmounts.map(a => formatAmount(a)).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-semibold ${isClawback ? "text-amber-400" : "text-emerald-400"}`}>
                      {formatAmount(sampleTxn.amount_cents)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4 space-y-4">
                    {/* Assignment Controls */}
                    {!sampleTxn.matched_credit_id && !sampleTxn.dismissed && (
                      <div className="flex flex-wrap items-end gap-4 bg-zinc-800/50 p-4 rounded-lg">
                        <div className="flex-1 min-w-[280px]">
                          <label className="block text-sm text-zinc-400 mb-1">Assign to Credit:</label>
                          <CreditSelector
                            credits={credits}
                            value={selectedCredit[group] || ""}
                            onChange={(creditId) => setSelectedCredit({ ...selectedCredit, [group]: creditId })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-zinc-400 mb-1">Rule Type:</label>
                          <select
                            value={createRuleType[group] || "name"}
                            onChange={(e) => setCreateRuleType({ ...createRuleType, [group]: e.target.value as "name" | "name_amount" })}
                            className="bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="name">Name pattern only</option>
                            <option value="name_amount">Name + exact amount ({formatAmount(sampleTxn.amount_cents)})</option>
                          </select>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAssignCredit(
                            sampleTxn.name,
                            selectedCredit[group],
                            createRuleType[group] || "name",
                            sampleTxn
                          )}
                          disabled={!selectedCredit[group] || actionPending === group}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Create Rule
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismiss(sampleTxn.id)}
                          disabled={actionPending === sampleTxn.id}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExcludePattern(sampleTxn.name)}
                          disabled={actionPending === `exclude-${sampleTxn.name}`}
                          className="border-red-900/50 text-red-400 hover:bg-red-900/20"
                          title="Permanently exclude this pattern from future reviews"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Exclude Pattern
                        </Button>
                      </div>
                    )}

                    {/* Transaction List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-400">All Transactions:</h4>
                      <div className="space-y-1">
                        {txns.slice(0, 10).map((txn) => (
                          <div
                            key={txn.id}
                            className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded text-sm"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-500">{formatDate(txn.date)}</span>
                              <span className="text-zinc-300">{txn.name}</span>
                              {txn.merchant_name && (
                                <span className="text-zinc-500">({txn.merchant_name})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-400 text-xs">
                                User: {txn.user_id.slice(0, 8)}...
                              </span>
                              <span className={isClawback ? "text-amber-400" : "text-emerald-400"}>
                                {formatAmount(txn.amount_cents)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {txns.length > 10 && (
                          <p className="text-sm text-zinc-500 text-center py-2">
                            ... and {txns.length - 10} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {Object.keys(groupedTransactions).length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <Search className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No transactions found matching your filters.</p>
            <p className="text-zinc-500 text-sm mt-1">
              Try adjusting the date range or status filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

