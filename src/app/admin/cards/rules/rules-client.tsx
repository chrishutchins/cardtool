"use client";

import { useState, useTransition } from "react";
import { RuleForm } from "./rule-form";

interface Issuer {
  id: string;
  name: string;
  slug: string;
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
  issuers: Issuer | null;
}

interface RulesClientProps {
  rules: Rule[];
  issuers: Issuer[];
  onCreateRule: (formData: FormData) => Promise<void>;
  onUpdateRule: (id: string, formData: FormData) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export function RulesClient({
  rules,
  issuers,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleActive,
}: RulesClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isPending, startTransition] = useTransition();

  // Group rules by issuer
  const rulesByIssuer = rules.reduce((acc, rule) => {
    const issuerName = rule.issuers?.name ?? "Unknown";
    if (!acc[issuerName]) acc[issuerName] = [];
    acc[issuerName].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      await onCreateRule(formData);
      setShowAddModal(false);
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editingRule) return;
    startTransition(async () => {
      await onUpdateRule(editingRule.id, formData);
      setEditingRule(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    startTransition(() => {
      onDeleteRule(id);
    });
  };

  const handleToggleActive = (rule: Rule) => {
    startTransition(() => {
      onToggleActive(rule.id, !rule.is_active);
    });
  };

  const formatRuleDisplay = (rule: Rule) => {
    if (rule.rule_type === "velocity") {
      const unit = rule.time_unit === "days" ? "d" : "mo";
      return `${rule.card_limit}/${rule.time_window}${unit}`;
    }
    return `${rule.card_limit} max`;
  };

  return (
    <div className="space-y-6">
      {/* Add Rule Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Rule
        </button>
      </div>

      {/* Rules List by Issuer */}
      {Object.keys(rulesByIssuer).length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400 mb-2">No application rules configured.</p>
          <p className="text-zinc-500 text-sm">
            Add rules to track velocity and limit restrictions for credit card applications.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(rulesByIssuer)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([issuerName, issuerRules]) => (
              <div
                key={issuerName}
                className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
              >
                <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700">
                  <h2 className="text-lg font-semibold text-white">{issuerName}</h2>
                </div>
                <div className="divide-y divide-zinc-800">
                  {issuerRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`px-4 py-3 flex items-center justify-between ${
                        !rule.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              rule.rule_type === "velocity"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-purple-500/20 text-purple-400"
                            }`}
                          >
                            {rule.rule_type === "velocity" ? "Velocity" : "Limit"}
                          </span>
                          <span className="font-medium text-white">{rule.name}</span>
                          <span className="text-zinc-400 text-sm">
                            ({formatRuleDisplay(rule)})
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-zinc-500 mt-1">{rule.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rule.card_type && rule.card_type !== "both" && (
                            <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
                              {rule.card_type}
                            </span>
                          )}
                          {rule.counts_all_issuers && (
                            <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                              All Issuers
                            </span>
                          )}
                          {rule.charge_type && rule.charge_type !== "all" && (
                            <span className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
                              {rule.charge_type} only
                            </span>
                          )}
                          {rule.requires_banking && (
                            <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                              Requires Banking
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          disabled={isPending}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            rule.is_active
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          disabled={isPending}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Add Application Rule</h2>
            <RuleForm
              issuers={issuers}
              onSubmit={handleCreate}
              onCancel={() => setShowAddModal(false)}
              isPending={isPending}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Application Rule</h2>
            <RuleForm
              issuers={issuers}
              defaultValues={editingRule}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRule(null)}
              isPending={isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

