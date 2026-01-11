"use client";

import { useState, useRef, useCallback } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
  effective_value_cents: number | null;
  template_value_cents?: number; // Value from the selected template (undefined if not in template)
  is_custom: boolean;
}

interface PointValuesEditorProps {
  currencies: Currency[];
  templateName: string;
  onUpdate: (currencyId: string, valueCents: number | null) => Promise<void>;
}

// Tooltip component (matches the style used in compare table)
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, showBelow: false });
  const ref = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const showBelow = rect.top < 60;
      setCoords({
        top: showBelow ? rect.bottom + 4 : rect.top - 4,
        left: rect.left,
        showBelow,
      });
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    updatePosition();
    setIsVisible(true);
  }, [updatePosition]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <span 
      ref={ref}
      className="inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <span 
          className="fixed px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-600 rounded shadow-lg max-w-xs z-[9999] pointer-events-none text-left"
          style={{
            top: coords.showBelow ? coords.top : 'auto',
            bottom: coords.showBelow ? 'auto' : `calc(100vh - ${coords.top}px)`,
            left: coords.left,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
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
  templateName,
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
              <table className="w-full table-fixed">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="w-1/2 px-4 py-2 text-left text-xs font-medium text-zinc-500">
                      Currency
                    </th>
                    <th className="w-1/6 px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      Value
                    </th>
                    <th className="w-1/6 px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      Your Value
                    </th>
                    <th className="w-1/6 px-4 py-2 text-right text-xs font-medium text-zinc-500">
                      
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {typeCurrencies.map((currency) => {
                    const isFromBase = currency.template_value_cents == null && currency.base_value_cents != null;
                    const displayValue = currency.template_value_cents ?? currency.base_value_cents;
                    
                    return (
                    <tr key={currency.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-sm text-white truncate">
                        {currency.name}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">
                        <span className={isFromBase ? "text-zinc-600" : "text-zinc-500"}>
                          {formatValue(displayValue)}
                        </span>
                        {isFromBase && (
                          <Tooltip text={`${templateName} does not have a valuation for ${currency.name}, so CardTool default values will be used`}>
                            <span className="text-amber-500 ml-1 cursor-help">†</span>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingId === currency.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-sm text-white focus:border-amber-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(currency.id);
                              if (e.key === "Escape") handleCancel();
                            }}
                          />
                        ) : currency.is_custom ? (
                          <span className="font-mono text-sm text-amber-400 font-semibold">
                            {formatValue(currency.effective_value_cents)}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-sm">
                            ← same
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
                              ✕
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

