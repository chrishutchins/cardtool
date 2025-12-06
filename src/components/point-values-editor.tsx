"use client";

import { useState } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
  effective_value_cents: number | null;
  is_custom: boolean;
}

interface PointValuesEditorProps {
  currencies: Currency[];
  onUpdate: (currencyId: string, valueCents: number | null) => Promise<void>;
}

const typeConfig: Record<string, { label: string; className: string }> = {
  airline_miles: { 
    label: "✈️ Airline Miles", 
    className: "bg-sky-500/20 text-sky-300 border border-sky-500/30" 
  },
  hotel_points: { 
    label: "🏨 Hotel Points", 
    className: "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
  },
  transferable_points: { 
    label: "🔄 Transferable", 
    className: "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
  },
  non_transferable_points: { 
    label: "📍 Non-Transferable", 
    className: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
  },
  cash_back: { 
    label: "💵 Cash Back", 
    className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
  },
  crypto: { 
    label: "₿ Crypto", 
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30" 
  },
  other: { 
    label: "Other", 
    className: "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30" 
  },
  // Legacy types
  points: { 
    label: "Points", 
    className: "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
  },
  cash: { 
    label: "Cash", 
    className: "bg-green-500/20 text-green-300 border border-green-500/30" 
  },
  miles: { 
    label: "Miles", 
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
  },
};

export function PointValuesEditor({
  currencies,
  onUpdate,
}: PointValuesEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (currency: Currency) => {
    setEditingId(currency.id);
    setEditValue(
      currency.effective_value_cents?.toString() ?? ""
    );
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

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700">
      <table className="w-full">
        <thead>
          <tr className="bg-zinc-800/50 border-b border-zinc-700">
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
              Currency
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
              Type
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
              Default Value
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
              Your Value
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700">
          {currencies.map((currency) => (
            <tr key={currency.id} className="hover:bg-zinc-800/30">
              <td className="px-4 py-3">
                <div>
                  <span className="text-white font-medium">{currency.name}</span>
                  <span className="text-zinc-500 text-sm ml-2">
                    {currency.code}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const config = typeConfig[currency.currency_type] ?? typeConfig.other;
                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3 text-right text-zinc-400 font-mono text-sm">
                {formatValue(currency.base_value_cents)}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === currency.id ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span
                    className={`font-mono text-sm ${
                      currency.is_custom ? "text-blue-400" : "text-zinc-400"
                    }`}
                  >
                    {formatValue(currency.effective_value_cents)}
                    {currency.is_custom && (
                      <span className="ml-1 text-xs text-blue-400">(custom)</span>
                    )}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === currency.id ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleSave(currency.id)}
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
                      onClick={() => handleEdit(currency)}
                      className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Edit
                    </button>
                    {currency.is_custom && (
                      <button
                        onClick={() => handleReset(currency.id)}
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
      </table>
    </div>
  );
}

