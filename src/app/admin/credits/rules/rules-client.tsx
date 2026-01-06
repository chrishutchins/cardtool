"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit2, Trash2, X, Check, ChevronDown } from "lucide-react";

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

interface RulesClientProps {
  rules: Rule[];
  credits: Credit[];
}

function CreditSelector({
  credits,
  value,
  onChange,
}: {
  credits: Credit[];
  value: string;
  onChange: (creditId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCredit = credits.find((c) => c.id === value);

  const filteredCredits = useMemo(() => {
    const searchLower = search.toLowerCase();
    return credits
      .filter((c) => {
        if (!search) return true;
        return (
          c.name.toLowerCase().includes(searchLower) ||
          c.card?.name.toLowerCase().includes(searchLower) ||
          c.card?.issuer?.name.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        const cardA = a.card?.name || "";
        const cardB = b.card?.name || "";
        if (cardA !== cardB) return cardA.localeCompare(cardB);
        return a.name.localeCompare(b.name);
      });
  }, [credits, search]);

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
          {selectedCredit ? `${selectedCredit.card?.name} - ${selectedCredit.name}` : "Select credit..."}
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
            {filteredCredits.map((credit) => (
              <button
                key={credit.id}
                type="button"
                onClick={() => {
                  onChange(credit.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 ${
                  credit.id === value ? "bg-zinc-700 text-white" : "text-zinc-300"
                }`}
              >
                <div className="font-medium">{credit.name}</div>
                <div className="text-xs text-zinc-500">
                  {credit.card?.issuer?.name} • {credit.card?.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RulesClient({ rules, credits }: RulesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    pattern: string;
    match_amount_cents: number | null;
    credit_id: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredRules = useMemo(() => {
    if (!searchQuery) return rules;
    const query = searchQuery.toLowerCase();
    return rules.filter(
      (rule) =>
        rule.pattern.toLowerCase().includes(query) ||
        rule.credit?.name.toLowerCase().includes(query) ||
        rule.credit?.card?.name.toLowerCase().includes(query) ||
        rule.credit?.card?.issuer?.name.toLowerCase().includes(query)
    );
  }, [rules, searchQuery]);

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

      {/* Stats */}
      <div className="flex gap-4 text-sm text-zinc-400">
        <span>{rules.length} total rules</span>
        <span>•</span>
        <span>{rules.reduce((sum, r) => sum + r.match_count, 0)} total matches</span>
      </div>

      {/* Rules list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left">
              <th className="px-4 py-3 text-sm font-medium text-zinc-400">Pattern</th>
              <th className="px-4 py-3 text-sm font-medium text-zinc-400">Amount</th>
              <th className="px-4 py-3 text-sm font-medium text-zinc-400">Credit</th>
              <th className="px-4 py-3 text-sm font-medium text-zinc-400">Card</th>
              <th className="px-4 py-3 text-sm font-medium text-zinc-400 text-center">Matches</th>
              <th className="px-4 py-3 text-sm font-medium text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule) => (
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
                        credits={credits}
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
                    <td className="px-4 py-3 text-sm text-zinc-200">{rule.credit?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-zinc-400">{rule.credit?.card?.name}</div>
                      <div className="text-xs text-zinc-500">{rule.credit?.card?.issuer?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-medium ${
                          rule.match_count > 0 ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      >
                        {rule.match_count}
                      </span>
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
            {filteredRules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  {searchQuery ? "No rules match your search" : "No matching rules created yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

