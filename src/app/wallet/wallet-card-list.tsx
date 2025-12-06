"use client";

import { useState, useTransition } from "react";

interface WalletCard {
  id: string;
  card_id: string;
  added_at: string | null;
  cards: {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    issuers: { name: string } | null;
    primary_currency: { name: string; code: string; currency_type: string } | null;
    secondary_currency: { name: string; code: string; currency_type: string } | null;
  } | null;
}

interface WalletCardListProps {
  walletCards: WalletCard[];
  enabledSecondaryCards: Set<string>;
  perksMap: Map<string, number>;
  onRemove: (walletId: string) => Promise<void>;
  onUpdatePerks: (cardId: string, perksValue: number) => Promise<void>;
}

const currencyTypeConfig: Record<string, { label: string; className: string }> = {
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

export function WalletCardList({
  walletCards,
  enabledSecondaryCards,
  perksMap,
  onRemove,
  onUpdatePerks,
}: WalletCardListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingPerksId, setEditingPerksId] = useState<string | null>(null);
  const [editPerksValue, setEditPerksValue] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const formatFee = (fee: number) => {
    return `$${fee}`;
  };

  const handleEditPerks = (cardId: string, currentValue: number) => {
    setEditingPerksId(cardId);
    setEditPerksValue(currentValue.toString());
  };

  const handleSavePerks = (cardId: string) => {
    const value = parseInt(editPerksValue) || 0;
    startTransition(async () => {
      await onUpdatePerks(cardId, value);
      setEditingPerksId(null);
    });
  };

  const handleCancelPerks = () => {
    setEditingPerksId(null);
    setEditPerksValue("");
  };

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
        <div className="col-span-4">Card</div>
        <div className="col-span-2">Currency</div>
        <div className="col-span-1 text-right">Annual Fee</div>
        <div className="col-span-2 text-right">Perks Value</div>
        <div className="col-span-2 text-right">Net Fee</div>
        <div className="col-span-1"></div>
      </div>

      {walletCards.map((wc) => {
        if (!wc.cards) return null;
        const card = wc.cards;
        const hasSecondaryEnabled = enabledSecondaryCards.has(card.id);
        const activeCurrency = hasSecondaryEnabled && card.secondary_currency
          ? card.secondary_currency
          : card.primary_currency;
        
        const perksValue = perksMap.get(card.id) ?? 0;
        const netFee = card.annual_fee - perksValue;
        const currencyConfig = currencyTypeConfig[activeCurrency?.currency_type ?? "other"] ?? currencyTypeConfig.other;

        return (
          <div
            key={wc.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
          >
            {/* Desktop layout */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
              {/* Card name and issuer */}
              <div className="col-span-4 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{card.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-zinc-500 text-sm truncate">{card.issuers?.name}</span>
                  {hasSecondaryEnabled && card.secondary_currency && card.primary_currency && (
                    <span className="text-xs text-amber-400">
                      ↑ {card.secondary_currency.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Currency type badge */}
              <div className="col-span-2">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${currencyConfig.className}`}>
                  {currencyConfig.label}
                </span>
              </div>

              {/* Annual Fee */}
              <div className="col-span-1 text-right text-zinc-400">
                {formatFee(card.annual_fee)}
              </div>

              {/* Perks Value (editable) */}
              <div className="col-span-2 text-right">
                {editingPerksId === card.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-zinc-500">$</span>
                    <input
                      type="number"
                      value={editPerksValue}
                      onChange={(e) => setEditPerksValue(e.target.value)}
                      className="w-16 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-blue-500 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePerks(card.id);
                        if (e.key === "Escape") handleCancelPerks();
                      }}
                    />
                    <button
                      onClick={() => handleSavePerks(card.id)}
                      disabled={isPending}
                      className="px-1.5 py-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelPerks}
                      disabled={isPending}
                      className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditPerks(card.id, perksValue)}
                    className="text-zinc-400 hover:text-white transition-colors group"
                    title="Click to edit perks value"
                  >
                    {perksValue > 0 ? (
                      <span className="text-emerald-400">-${perksValue}</span>
                    ) : (
                      <span className="text-zinc-600 group-hover:text-zinc-400">$0</span>
                    )}
                    <span className="ml-1 text-zinc-600 group-hover:text-zinc-400 text-xs">✎</span>
                  </button>
                )}
              </div>

              {/* Net Fee */}
              <div className="col-span-2 text-right">
                <span className={`font-medium ${netFee <= 0 ? "text-emerald-400" : "text-zinc-300"}`}>
                  {netFee < 0 ? `-$${Math.abs(netFee)}` : `$${netFee}`}
                </span>
              </div>

              {/* Remove button */}
              <div className="col-span-1 text-right">
                {removingId === wc.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={async () => {
                        await onRemove(wc.id);
                        setRemovingId(null);
                      }}
                      className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setRemovingId(null)}
                      className="px-2 py-1 rounded text-xs text-zinc-400 hover:bg-zinc-700 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRemovingId(wc.id)}
                    className="px-2 py-1 rounded text-xs text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white truncate">{card.name}</div>
                  <div className="text-zinc-500 text-sm">{card.issuers?.name}</div>
                  {hasSecondaryEnabled && card.secondary_currency && card.primary_currency && (
                    <div className="text-xs text-amber-400 mt-0.5">
                      ↑ Earning {card.secondary_currency.name}
                    </div>
                  )}
                </div>
                {removingId === wc.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        await onRemove(wc.id);
                        setRemovingId(null);
                      }}
                      className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setRemovingId(null)}
                      className="px-2 py-1 rounded text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRemovingId(wc.id)}
                    className="px-2 py-1 text-zinc-600 hover:text-zinc-300"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${currencyConfig.className}`}>
                  {currencyConfig.label}
                </span>
                <span className="text-zinc-500">Fee: {formatFee(card.annual_fee)}</span>
                {editingPerksId === card.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">Perks: $</span>
                    <input
                      type="number"
                      value={editPerksValue}
                      onChange={(e) => setEditPerksValue(e.target.value)}
                      className="w-16 rounded border border-zinc-600 bg-zinc-700 px-2 py-0.5 text-white text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSavePerks(card.id)}
                      disabled={isPending}
                      className="text-green-400 text-xs"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditPerks(card.id, perksValue)}
                    className="text-zinc-500 hover:text-white"
                  >
                    Perks: {perksValue > 0 ? <span className="text-emerald-400">-${perksValue}</span> : "$0"} ✎
                  </button>
                )}
                <span className={`font-medium ${netFee <= 0 ? "text-emerald-400" : "text-zinc-300"}`}>
                  Net: {netFee < 0 ? `-$${Math.abs(netFee)}` : `$${netFee}`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
