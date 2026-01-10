"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit2, Trash2, X, Check, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";

type SortKey = "pattern" | "amount" | "issuer" | "credit" | "matches";
type SortDirection = "asc" | "desc";

interface MatchedTransaction {
  id: string;
  name: string;
  original_description: string | null;
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

interface CreditOption {
  representative_credit_id: string;
  name: string;
  issuer: {
    id: string;
    name: string;
  } | null;
  credit_ids: string[];
}

interface RulesClientProps {
  rules: Rule[];
  creditOptions: CreditOption[];
}

function CreditSelector({
  creditOptions,
  value,
  onChange,
}: {
  creditOptions: CreditOption[];
  value: string;
  onChange: (creditId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the selected option - value could be any credit_id in the group
  const selectedOption = creditOptions.find((c) => c.credit_ids.includes(value));

  const filteredOptions = useMemo(() => {
    const searchLower = search.toLowerCase();
    return creditOptions.filter((c) => {
      if (!search) return true;
      return (
        c.name.toLowerCase().includes(searchLower) ||
        c.issuer?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [creditOptions, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 text-sm text-left"
      >
        <span className="truncate">
          {selectedOption
            ? `${selectedOption.issuer?.name || "Unknown"} - ${selectedOption.name}`
            : "Select credit..."}
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl max-h-64 overflow-hidden">
          <div className="p-2 border-b border-zinc-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search credits..."
              className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded px-2 py-1.5 text-sm"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.map((option) => (
              <button
                key={`${option.issuer?.id}-${option.name}`}
                type="button"
                onClick={() => {
                  onChange(option.representative_credit_id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 ${
                  selectedOption?.representative_credit_id === option.representative_credit_id
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-300"
                }`}
              >
                <div className="font-medium">{option.name}</div>
                <div className="text-xs text-zinc-500">
                  {option.issuer?.name || "Unknown Issuer"}
                  {option.credit_ids.length > 1 && (
                    <span className="ml-1 text-zinc-600">
                      ({option.credit_ids.length} cards)
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionsModal({
  rule,
  onClose,
}: {
  rule: Rule;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Matched Transactions
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                Pattern: <code className="text-amber-400 bg-amber-400/10 px-1 rounded">{rule.pattern}</code>
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Transactions list */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {rule.matched_transactions.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">
                No transactions matched yet
              </p>
            ) : (
              <div className="space-y-2">
                {rule.matched_transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {txn.original_description || txn.name}
                        {txn.card_name && (
                          <span className="text-zinc-500 font-normal ml-2">
                            ({txn.card_name})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {parseLocalDate(txn.authorized_date || txn.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {txn.merchant_name && (
                          <span className="ml-2">• {txn.merchant_name}</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        txn.amount_cents < 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {txn.amount_cents < 0 ? "-" : ""}$
                      {Math.abs(txn.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 px-6 py-4">
            <div className="text-sm text-zinc-400">
              {rule.matched_transactions.length} transaction{rule.matched_transactions.length !== 1 ? "s" : ""} matched
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      {label}
      {isActive ? (
        currentDirection === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
}

export function RulesClient({ rules, creditOptions }: RulesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    pattern: string;
    match_amount_cents: number | null;
    credit_id: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewingTransactions, setViewingTransactions] = useState<Rule | null>(null);
  const [isRematching, setIsRematching] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if same key
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New key, start with ascending
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleRematchAll = async () => {
    setIsRematching(true);
    try {
      const response = await fetch("/api/admin/credits/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rematchAll: true }),
      });

      if (!response.ok) {
        console.error("Rematch failed:", await response.text());
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to rematch:", error);
    } finally {
      setIsRematching(false);
    }
  };

  const filteredAndSortedRules = useMemo(() => {
    let result = rules;
    
    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (rule) =>
          rule.pattern.toLowerCase().includes(query) ||
          rule.credit?.name.toLowerCase().includes(query) ||
          rule.credit?.issuer?.name.toLowerCase().includes(query)
      );
    }
    
    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        
        switch (sortKey) {
          case "pattern":
            comparison = a.pattern.localeCompare(b.pattern);
            break;
          case "amount":
            const amountA = a.match_amount_cents ?? -1;
            const amountB = b.match_amount_cents ?? -1;
            comparison = amountA - amountB;
            break;
          case "issuer":
            const issuerA = a.credit?.issuer?.name || "";
            const issuerB = b.credit?.issuer?.name || "";
            comparison = issuerA.localeCompare(issuerB);
            break;
          case "credit":
            const creditA = a.credit?.name || "";
            const creditB = b.credit?.name || "";
            comparison = creditA.localeCompare(creditB);
            break;
          case "matches":
            comparison = a.match_count - b.match_count;
            break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    
    return result;
  }, [rules, searchQuery, sortKey, sortDirection]);

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule.id);
    setEditValues({
      pattern: rule.pattern,
      match_amount_cents: rule.match_amount_cents,
      credit_id: rule.credit?.id || "",
    });
  };

  const handleSave = async () => {
    if (!editingRule || !editValues) return;

    const response = await fetch("/api/admin/credits/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingRule,
        pattern: editValues.pattern,
        match_amount_cents: editValues.match_amount_cents,
        credit_id: editValues.credit_id,
      }),
    });

    if (response.ok) {
      setEditingRule(null);
      setEditValues(null);
      startTransition(() => router.refresh());
    }
  };

  const handleDelete = async (ruleId: string) => {
    const response = await fetch(`/api/admin/credits/rules?id=${ruleId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setDeleteConfirm(null);
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rules..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
        />
      </div>

      {/* Stats and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-zinc-400">
          <span>{rules.length} total rules</span>
          <span>•</span>
          <span>{rules.reduce((sum, r) => sum + r.match_count, 0)} total matches</span>
        </div>
        <button
          onClick={handleRematchAll}
          disabled={isRematching || isPending}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRematching ? "animate-spin" : ""}`} />
          {isRematching ? "Rematching..." : "Rematch All"}
        </button>
      </div>

      {/* Rules list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-auto max-h-[calc(100vh-200px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-800 text-left bg-zinc-900">
              <th className="px-4 py-3">
                <SortableHeader label="Pattern" sortKey="pattern" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Amount" sortKey="amount" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Issuer" sortKey="issuer" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Credit" sortKey="credit" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-center">
                <SortableHeader label="Matches" sortKey="matches" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-sm font-medium text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRules.map((rule) => (
              <tr key={rule.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                {editingRule === rule.id && editValues ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editValues.pattern}
                        onChange={(e) => setEditValues({ ...editValues, pattern: e.target.value })}
                        className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editValues.match_amount_cents ? editValues.match_amount_cents / 100 : ""}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            match_amount_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                          })
                        }
                        placeholder="Any"
                        className="w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
                      />
                    </td>
                    <td className="px-4 py-3" colSpan={2}>
                      <CreditSelector
                        creditOptions={creditOptions}
                        value={editValues.credit_id}
                        onChange={(id) => setEditValues({ ...editValues, credit_id: id })}
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-400">{rule.match_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleSave}
                          disabled={isPending}
                          className="p-1.5 rounded hover:bg-emerald-600/20 text-emerald-500"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(null);
                            setEditValues(null);
                          }}
                          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <code className="text-sm text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        {rule.pattern}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {rule.match_amount_cents ? `$${(rule.match_amount_cents / 100).toFixed(2)}` : "Any"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {rule.credit?.issuer?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-200">{rule.credit?.name || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewingTransactions(rule)}
                        className={`text-sm font-medium px-2 py-0.5 rounded transition-colors ${
                          rule.match_count > 0
                            ? "text-emerald-400 hover:bg-emerald-400/10 cursor-pointer"
                            : "text-zinc-500 cursor-default"
                        }`}
                        disabled={rule.match_count === 0}
                      >
                        {rule.match_count}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === rule.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-red-400 mr-2">Delete?</span>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            disabled={isPending}
                            className="p-1.5 rounded hover:bg-red-600/20 text-red-500"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(rule.id)}
                            className="p-1.5 rounded hover:bg-red-600/20 text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredAndSortedRules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  {searchQuery ? "No rules match your search" : "No matching rules created yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transactions Modal */}
      {viewingTransactions && (
        <TransactionsModal
          rule={viewingTransactions}
          onClose={() => setViewingTransactions(null)}
        />
      )}
    </div>
  );
}
