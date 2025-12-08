"use client";

import { useState } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
  effective_value_cents: number | null;
  template_value_cents?: number; // Value from the selected template
  is_custom: boolean;
}

interface PointValuesEditorProps {
  currencies: Currency[];
  onUpdate: (currencyId: string, valueCents: number | null) => Promise<void>;
}

const typeLabels: Record<string, string> = {
  transferable_points: "Transferable Points",
  airline_miles: "Airline Miles",
  hotel_points: "Hotel Points",
  cash_back: "Cash Back",
  non_transferable_points: "Non-Transferable Points",
  crypto: "Crypto",
  other: "Other",
};

const typeOrder = [
  "transferable_points",
  "airline_miles",
  "hotel_points",
  "cash_back",
  "non_transferable_points",
  "crypto",
  "other",
];

export function PointValuesEditor({
  currencies,
  onUpdate,
}: PointValuesEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (currency: Currency) => {
    setEditingId(currency.id);
    setEditValue(currency.effective_value_cents?.toString() ?? "");
  };

  const handleSave = async (currencyId: string) => {
    setSaving(true);
    const value = editValue ? parseFloat(editValue) : null;
    await onUpdate(currencyId, value);
    setEditingId(null);
    setSaving(false);
  };

  const handleReset = async (currencyId: string) => {
    setSaving(true);
    await onUpdate(currencyId, null);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const formatValue = (cents: number | null) => {
    if (cents === null) return "—";
    return `${cents.toFixed(2)}¢`;
  };

  // Group currencies by type
  const groupedCurrencies = currencies.reduce((acc, currency) => {
    const type = currency.currency_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(currency);
    return acc;
  }, {} as Record<string, Currency[]>);

  return (
    <div className="space-y-8">
      {typeOrder.map((type) => {
        const typeCurrencies = groupedCurrencies[type];
        if (!typeCurrencies || typeCurrencies.length === 0) return null;

        return (
          <div key={type}>
            <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
              {typeLabels[type] || type}
            </h3>
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">
                      Currency
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">
                      Code
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      Template
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      Your Value
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {typeCurrencies.map((currency) => (
                    <tr key={currency.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-sm text-white">
                        {currency.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-400">
                        {currency.code}
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-500 font-mono text-sm">
                        {formatValue(currency.template_value_cents ?? currency.base_value_cents)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingId === currency.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-sm text-white focus:border-amber-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(currency.id);
                              if (e.key === "Escape") handleCancel();
                            }}
                          />
                        ) : (
                          <span
                            className={`font-mono text-sm ${
                              currency.is_custom ? "text-amber-400 font-semibold" : "text-white"
                            }`}
                          >
                            {formatValue(currency.effective_value_cents)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingId === currency.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSave(currency.id)}
                              disabled={saving}
                              className="text-emerald-400 hover:text-emerald-300 text-xs font-medium disabled:opacity-50"
                            >
                              {saving ? "..." : "Save"}
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-zinc-400 hover:text-zinc-300 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(currency)}
                              className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                            >
                              Edit
                            </button>
                            {currency.is_custom && (
                              <button
                                onClick={() => handleReset(currency.id)}
                                disabled={saving}
                                className="text-zinc-500 hover:text-zinc-300 text-xs disabled:opacity-50"
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
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

