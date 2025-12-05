"use client";

import { useState } from "react";
import { Tables } from "@/lib/database.types";

interface EarningRule extends Tables<"card_earning_rules"> {
  earning_categories: Tables<"earning_categories"> | null;
}

interface EarningRulesEditorProps {
  rules: EarningRule[];
  availableCategories: Tables<"earning_categories">[];
  onAddRule: (formData: FormData) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
}

export function EarningRulesEditor({
  rules,
  availableCategories,
  onAddRule,
  onDeleteRule,
}: EarningRulesEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [hasCap, setHasCap] = useState(false);

  const capPeriodLabels: Record<string, string> = {
    none: "None",
    month: "Monthly",
    quarter: "Quarterly",
    year: "Yearly",
    lifetime: "Lifetime",
  };

  return (
    <div className="space-y-4">
      {/* Existing Rules */}
      {rules.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Rate
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Cap
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-white">
                    {rule.earning_categories?.name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 font-mono">
                    {rule.rate}x
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {rule.has_cap ? (
                      <span>
                        ${rule.cap_amount?.toLocaleString()} {rule.cap_unit} / {capPeriodLabels[rule.cap_period]}
                        {rule.post_cap_rate && (
                          <span className="text-zinc-500"> → {rule.post_cap_rate}x</span>
                        )}
                      </span>
                    ) : (
                      "No cap"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-sm text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">No earning rules yet. Add one below.</p>
      )}

      {/* Add Rule Form */}
      {showAddForm ? (
        <form
          action={async (formData) => {
            await onAddRule(formData);
            setShowAddForm(false);
            setHasCap(false);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
              <select
                name="category_id"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select category...</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Rate</label>
              <input
                type="number"
                name="rate"
                step="0.1"
                min="0"
                placeholder="e.g., 3.0"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="has_cap"
                  value="true"
                  checked={hasCap}
                  onChange={(e) => setHasCap(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-700"
                />
                Has spending cap
              </label>
            </div>
          </div>

          {hasCap && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-zinc-700">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Amount</label>
                <input
                  type="number"
                  name="cap_amount"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 25000"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Unit</label>
                <select
                  name="cap_unit"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="spend">Spend ($)</option>
                  <option value="rewards">Rewards</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Period</label>
                <select
                  name="cap_period"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="year">Yearly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="month">Monthly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Post-Cap Rate</label>
                <input
                  type="number"
                  name="post_cap_rate"
                  step="0.1"
                  min="0"
                  placeholder="e.g., 1.0"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Add Rule
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setHasCap(false);
              }}
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        availableCategories.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg border border-dashed border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            + Add Earning Rule
          </button>
        )
      )}

      {availableCategories.length === 0 && !showAddForm && (
        <p className="text-sm text-zinc-500">All categories have rules assigned.</p>
      )}
    </div>
  );
}

