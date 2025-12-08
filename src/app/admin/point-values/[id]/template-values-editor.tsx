"use client";

import { useState, useTransition } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
  template_value_cents: number;
  has_template_value: boolean;
  is_manual: boolean;
}

interface Props {
  currencies: Currency[];
  onUpdate: (currencyId: string, valueCents: number) => Promise<void>;
}

export function TemplateValuesEditor({ currencies, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleEdit = (currency: Currency) => {
    setEditingId(currency.id);
    setEditValue(currency.template_value_cents.toFixed(2));
  };

  const handleSave = async (currencyId: string) => {
    const valueCents = parseFloat(editValue);
    if (isNaN(valueCents) || valueCents < 0) return;
    
    startTransition(async () => {
      await onUpdate(currencyId, valueCents);
      setEditingId(null);
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Group currencies by type
  const groupedCurrencies = currencies.reduce((acc, currency) => {
    const type = currency.currency_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(currency);
    return acc;
  }, {} as Record<string, Currency[]>);

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
                      Value (¢)
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-zinc-500">
                      Source
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {typeCurrencies.map((currency) => {
                    const isZero = currency.template_value_cents === 0;
                    return (
                      <tr 
                        key={currency.id} 
                        className={`hover:bg-zinc-800/30 ${isZero ? "bg-red-900/10" : ""}`}
                      >
                        <td className="px-4 py-2 text-sm text-white">
                          {currency.name}
                          {isZero && (
                            <span className="ml-2 text-xs text-red-400">(not set)</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-400">
                          {currency.code}
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
                            <span className={`text-sm ${isZero ? "text-red-400" : "text-white"}`}>
                              {currency.template_value_cents.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {isZero ? (
                            <span className="text-xs text-red-400">—</span>
                          ) : currency.is_manual ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400" title="Manually set by admin">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Manual
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400" title="Imported from source URL">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Synced
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {editingId === currency.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSave(currency.id)}
                                disabled={isPending}
                                className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                              >
                                {isPending ? "..." : "Save"}
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-zinc-400 hover:text-zinc-300 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(currency)}
                              className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

