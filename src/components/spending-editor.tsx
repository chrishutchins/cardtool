"use client";

import { useState } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  default_annual_spend_cents: number;
  default_large_purchase_spend_cents: number;
  effective_annual_spend_cents: number;
  effective_large_purchase_spend_cents: number;
  is_custom: boolean;
  has_large_purchase_tracking: boolean;
}

interface SpendingEditorProps {
  categories: Category[];
  onUpdate: (
    categoryId: number, 
    annualSpendCents: number | null,
    largePurchaseSpendCents?: number | null
  ) => Promise<void>;
}

export function SpendingEditor({ categories, onUpdate }: SpendingEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editLargePurchaseValue, setEditLargePurchaseValue] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    if (category.has_large_purchase_tracking) {
      // Editing the <$5k portion
      setEditValue((category.effective_annual_spend_cents / 100).toString());
      setEditLargePurchaseValue((category.effective_large_purchase_spend_cents / 100).toString());
      // Auto-expand when editing
      setExpandedIds((prev) => new Set([...prev, category.id]));
    } else {
      // Regular category - edit the total
      setEditValue((category.effective_annual_spend_cents / 100).toString());
    }
  };

  const handleSave = async (category: Category) => {
    setSaving(true);
    const dollars = parseFloat(editValue);
    const cents = isNaN(dollars) ? null : Math.round(dollars * 100);
    
    if (category.has_large_purchase_tracking) {
      const largeDollars = parseFloat(editLargePurchaseValue);
      const largeCents = isNaN(largeDollars) ? 0 : Math.round(largeDollars * 100);
      await onUpdate(category.id, cents, largeCents);
    } else {
      await onUpdate(category.id, cents);
    }
    
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
    setEditLargePurchaseValue("");
  };

  const toggleExpanded = (categoryId: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const formatDollars = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Calculate totals (including both regular and >$5k portions)
  const totalDefault = categories.reduce(
    (sum, c) => sum + c.default_annual_spend_cents + c.default_large_purchase_spend_cents,
    0
  );
  const totalEffective = categories.reduce(
    (sum, c) => sum + c.effective_annual_spend_cents + c.effective_large_purchase_spend_cents,
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
            {categories.map((category) => {
              const isExpanded = expandedIds.has(category.id);
              const totalSpend = category.effective_annual_spend_cents + category.effective_large_purchase_spend_cents;
              const totalDefault = category.default_annual_spend_cents + category.default_large_purchase_spend_cents;
              
              return (
                <tr key={category.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {category.has_large_purchase_tracking && (
                        <button
                          onClick={() => toggleExpanded(category.id)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <span className="text-white">{category.name}</span>
                      {category.has_large_purchase_tracking && !isExpanded && (
                        <span className="text-xs text-zinc-500">(has &gt;$5k)</span>
                      )}
                    </div>
                    
                    {/* Expanded view for >$5k tracking */}
                    {category.has_large_purchase_tracking && isExpanded && (
                      <div className="mt-2 ml-6 space-y-1 text-sm">
                        <div className="text-zinc-400">Transactions &lt;$5k</div>
                        <div className="text-zinc-400">Transactions &gt;$5k</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 font-mono text-sm align-top">
                    {category.has_large_purchase_tracking && isExpanded ? (
                      <div className="space-y-1">
                        <div>{formatDollars(totalDefault)}</div>
                        <div className="text-xs">{formatDollars(category.default_annual_spend_cents)}</div>
                        <div className="text-xs">{formatDollars(category.default_large_purchase_spend_cents)}</div>
                      </div>
                    ) : (
                      formatDollars(totalDefault)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {editingId === category.id ? (
                      category.has_large_purchase_tracking ? (
                        <div className="space-y-1">
                          <div className="text-zinc-500 text-sm font-mono">
                            {formatDollars(parseFloat(editValue || "0") * 100 + parseFloat(editLargePurchaseValue || "0") * 100)}
                          </div>
                          <div className="flex justify-end items-center gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-xs focus:border-blue-500 focus:outline-none"
                              autoFocus
                            />
                          </div>
                          <div className="flex justify-end items-center gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={editLargePurchaseValue}
                              onChange={(e) => setEditLargePurchaseValue(e.target.value)}
                              className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-xs focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
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
                      )
                    ) : (
                      category.has_large_purchase_tracking && isExpanded ? (
                        <div className="space-y-1">
                          <span
                            className={`font-mono text-sm ${
                              category.is_custom ? "text-blue-400" : "text-zinc-400"
                            }`}
                          >
                            {formatDollars(totalSpend)}
                            {category.is_custom && (
                              <span className="ml-1 text-xs text-blue-400">(custom)</span>
                            )}
                          </span>
                          <div className="text-xs font-mono text-zinc-500">
                            {formatDollars(category.effective_annual_spend_cents)}
                          </div>
                          <div className="text-xs font-mono text-zinc-500">
                            {formatDollars(category.effective_large_purchase_spend_cents)}
                          </div>
                        </div>
                      ) : (
                        <span
                          className={`font-mono text-sm ${
                            category.is_custom ? "text-blue-400" : "text-zinc-400"
                          }`}
                        >
                          {formatDollars(totalSpend)}
                          {category.is_custom && (
                            <span className="ml-1 text-xs text-blue-400">(custom)</span>
                          )}
                        </span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {editingId === category.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSave(category)}
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
              );
            })}
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
        Categories with &gt;$5k tracking show separate amounts for purchases under and over $5,000.
      </p>
    </div>
  );
}
