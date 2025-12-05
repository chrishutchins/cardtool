"use client";

import { useState } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  default_annual_spend_cents: number;
  effective_annual_spend_cents: number;
  is_custom: boolean;
}

interface SpendingEditorProps {
  categories: Category[];
  onUpdate: (categoryId: number, annualSpendCents: number | null) => Promise<void>;
}

export function SpendingEditor({ categories, onUpdate }: SpendingEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    // Convert cents to dollars for editing
    setEditValue((category.effective_annual_spend_cents / 100).toString());
  };

  const handleSave = async (categoryId: number) => {
    setSaving(true);
    // Convert dollars back to cents
    const dollars = parseFloat(editValue);
    const cents = isNaN(dollars) ? null : Math.round(dollars * 100);
    await onUpdate(categoryId, cents);
    setEditingId(null);
    setSaving(false);
  };

  const handleReset = async (categoryId: number) => {
    setSaving(true);
    await onUpdate(categoryId, null);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const formatDollars = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Calculate totals
  const totalDefault = categories.reduce(
    (sum, c) => sum + c.default_annual_spend_cents,
    0
  );
  const totalEffective = categories.reduce(
    (sum, c) => sum + c.effective_annual_spend_cents,
    0
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-zinc-700">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Default
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Your Spending
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-white">{category.name}</td>
                <td className="px-4 py-3 text-right text-zinc-400 font-mono text-sm">
                  {formatDollars(category.default_annual_spend_cents)}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === category.id ? (
                    <div className="flex justify-end items-center gap-1">
                      <span className="text-zinc-500">$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span
                      className={`font-mono text-sm ${
                        category.is_custom ? "text-blue-400" : "text-zinc-400"
                      }`}
                    >
                      {formatDollars(category.effective_annual_spend_cents)}
                      {category.is_custom && (
                        <span className="ml-1 text-xs text-blue-400">
                          (custom)
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === category.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSave(category.id)}
                        disabled={saving}
                        className="px-2 py-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Edit
                      </button>
                      {category.is_custom && (
                        <button
                          onClick={() => handleReset(category.id)}
                          disabled={saving}
                          className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-800/50 border-t border-zinc-700">
              <td className="px-4 py-3 text-white font-semibold">Total</td>
              <td className="px-4 py-3 text-right text-zinc-400 font-mono text-sm font-semibold">
                {formatDollars(totalDefault)}
              </td>
              <td className="px-4 py-3 text-right text-white font-mono text-sm font-semibold">
                {formatDollars(totalEffective)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Tip: Set categories you don&apos;t use to $0 to exclude them from calculations.
      </p>
    </div>
  );
}

