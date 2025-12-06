"use client";

import { useState, useTransition } from "react";
import { Tables } from "@/lib/database.types";

interface TiersEditorProps {
  tiers: Tables<"earning_multiplier_tiers">[];
  onAddTier: (formData: FormData) => Promise<void>;
  onUpdateTier: (tierId: string, formData: FormData) => Promise<void>;
  onDeleteTier: (tierId: string) => Promise<void>;
}

export function TiersEditor({
  tiers,
  onAddTier,
  onUpdateTier,
  onDeleteTier,
}: TiersEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit state
  const [editName, setEditName] = useState("");
  const [editMultiplier, setEditMultiplier] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editHasCap, setEditHasCap] = useState(false);
  const [editCapAmount, setEditCapAmount] = useState("");
  const [editCapPeriod, setEditCapPeriod] = useState<"none" | "month" | "quarter" | "year" | "lifetime">("month");

  const startEdit = (tier: Tables<"earning_multiplier_tiers">) => {
    setEditingTierId(tier.id);
    setEditName(tier.name);
    setEditMultiplier(tier.multiplier.toString());
    setEditSortOrder(tier.sort_order?.toString() ?? "0");
    setEditRequirements(tier.requirements ?? "");
    setEditHasCap(tier.has_cap ?? false);
    setEditCapAmount(tier.cap_amount?.toString() ?? "");
    setEditCapPeriod((tier.cap_period as "none" | "month" | "quarter" | "year" | "lifetime") ?? "month");
  };

  const handleUpdate = (tierId: string) => {
    const formData = new FormData();
    formData.set("name", editName);
    formData.set("multiplier", editMultiplier);
    formData.set("sort_order", editSortOrder);
    formData.set("requirements", editRequirements);
    formData.set("has_cap", editHasCap ? "true" : "false");
    formData.set("cap_amount", editCapAmount);
    formData.set("cap_period", editCapPeriod);

    startTransition(async () => {
      await onUpdateTier(tierId, formData);
      setEditingTierId(null);
    });
  };

  const sortedTiers = [...tiers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="space-y-4">
      {/* Existing Tiers */}
      {sortedTiers.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Tier
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Multiplier
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Cap
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase">
                  Requirements
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {sortedTiers.map((tier) =>
                editingTierId === tier.id ? (
                  <tr key={tier.id} className="bg-zinc-800/50">
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(e.target.value)}
                        className="w-12 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={editMultiplier}
                        onChange={(e) => setEditMultiplier(e.target.value)}
                        className="w-16 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1 text-xs text-zinc-300">
                          <input
                            type="checkbox"
                            checked={editHasCap}
                            onChange={(e) => setEditHasCap(e.target.checked)}
                            className="rounded border-zinc-600 bg-zinc-700"
                          />
                          Cap
                        </label>
                        {editHasCap && (
                          <>
                            <input
                              type="number"
                              value={editCapAmount}
                              onChange={(e) => setEditCapAmount(e.target.value)}
                              placeholder="$"
                              className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
                            />
                            <select
                              value={editCapPeriod}
                              onChange={(e) => setEditCapPeriod(e.target.value as "none" | "month" | "quarter" | "year" | "lifetime")}
                              className="rounded border border-zinc-600 bg-zinc-700 px-1 py-1 text-white text-xs"
                            >
                              <option value="none">none</option>
                              <option value="month">/mo</option>
                              <option value="quarter">/qtr</option>
                              <option value="year">/yr</option>
                              <option value="lifetime">lifetime</option>
                            </select>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={editRequirements}
                        onChange={(e) => setEditRequirements(e.target.value)}
                        placeholder="Requirements"
                        className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm placeholder-zinc-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleUpdate(tier.id)}
                          disabled={isPending}
                          className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTierId(null)}
                          className="text-xs text-zinc-400 hover:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={tier.id} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-3 text-zinc-400 font-mono text-sm">
                      {tier.sort_order ?? 0}
                    </td>
                    <td className="px-3 py-3 text-white font-medium">{tier.name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                        {tier.multiplier}x
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {tier.has_cap ? (
                        <span className="text-amber-400">
                          ${tier.cap_amount?.toLocaleString()}/{tier.cap_period}
                        </span>
                      ) : (
                        <span className="text-zinc-500">No cap</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-400 text-sm">
                      {tier.requirements || "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => startEdit(tier)}
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => startTransition(() => onDeleteTier(tier.id))}
                          disabled={isPending}
                          className="text-sm text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">No tiers configured yet. Add one below.</p>
      )}

      {/* Add Tier Form */}
      {showAddForm ? (
        <AddTierForm
          tiers={tiers}
          isPending={isPending}
          onSubmit={(formData) => {
            startTransition(async () => {
              await onAddTier(formData);
              setShowAddForm(false);
            });
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg border border-dashed border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          + Add Tier
        </button>
      )}
    </div>
  );
}

// Separate component for Add Tier form with local state for cap toggle
function AddTierForm({
  tiers,
  isPending,
  onSubmit,
  onCancel,
}: {
  tiers: Tables<"earning_multiplier_tiers">[];
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [hasCap, setHasCap] = useState(false);

  return (
    <form
      action={(formData) => {
        formData.set("has_cap", hasCap ? "true" : "false");
        onSubmit(formData);
      }}
      className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Sort Order</label>
          <input
            type="number"
            name="sort_order"
            defaultValue={tiers.length}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Tier Name</label>
          <input
            type="text"
            name="name"
            placeholder="e.g., Gold"
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Multiplier</label>
          <input
            type="number"
            name="multiplier"
            step="0.01"
            min="0.01"
            placeholder="e.g., 1.25"
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Requirements</label>
          <input
            type="text"
            name="requirements"
            placeholder="e.g., $20k-$50k balance"
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Cap Options */}
      <div className="mt-4 pt-4 border-t border-zinc-700">
        <label className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
          <input
            type="checkbox"
            checked={hasCap}
            onChange={(e) => setHasCap(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-700 text-blue-600"
          />
          This tier has a spending cap
        </label>
        {hasCap && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Amount ($)</label>
              <input
                type="number"
                name="cap_amount"
                placeholder="e.g., 10000"
                required
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Period</label>
              <select
                name="cap_period"
                defaultValue="month"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="none">None</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Adding..." : "Add Tier"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

