"use client";

import { useState } from "react";

interface WalletCard {
  id: string;
  card_id: string;
  added_at: string | null;
  cards: {
    id: string;
    name: string;
    slug: string;
    annual_fee_cents: number;
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
  onRemove: (walletId: string) => Promise<void>;
}

export function WalletCardList({
  walletCards,
  enabledSecondaryCards,
  onRemove,
}: WalletCardListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const formatFee = (cents: number) => {
    if (!cents) return "No annual fee";
    return `$${(cents / 100).toFixed(0)}/year`;
  };

  const currencyTypeColors: Record<string, string> = {
    points: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    cash: "bg-green-500/20 text-green-300 border-green-500/30",
    miles: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    other: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  };

  return (
    <div className="space-y-4">
      {walletCards.map((wc) => {
        if (!wc.cards) return null;
        const card = wc.cards;
        const hasSecondaryEnabled = enabledSecondaryCards.has(card.id);
        const activeCurrency = hasSecondaryEnabled && card.secondary_currency
          ? card.secondary_currency
          : card.primary_currency;

        return (
          <div
            key={wc.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{card.name}</h3>
                  {hasSecondaryEnabled && card.secondary_currency && (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Upgraded
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 mt-1">{card.issuers?.name}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {/* Active Currency */}
                  {activeCurrency && (
                    <div className={`px-3 py-1.5 rounded-lg border ${currencyTypeColors[activeCurrency.currency_type]}`}>
                      <span className="text-sm font-medium">{activeCurrency.name}</span>
                      <span className="text-xs opacity-70 ml-1">({activeCurrency.code})</span>
                    </div>
                  )}

                  {/* Show upgrade indicator if secondary currency is available but not enabled */}
                  {card.secondary_currency && !hasSecondaryEnabled && (
                    <div className="px-3 py-1.5 rounded-lg border border-dashed border-zinc-600 text-zinc-500 text-sm">
                      Can upgrade to {card.secondary_currency.name}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-6 text-sm text-zinc-400">
                  <span>{formatFee(card.annual_fee_cents)}</span>
                  <span>{card.default_earn_rate}x default rate</span>
                </div>
              </div>

              <div>
                {removingId === wc.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Remove?</span>
                    <button
                      onClick={async () => {
                        await onRemove(wc.id);
                        setRemovingId(null);
                      }}
                      className="px-3 py-1 rounded text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setRemovingId(null)}
                      className="px-3 py-1 rounded text-sm text-zinc-400 hover:bg-zinc-700 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRemovingId(wc.id)}
                    className="px-3 py-1 rounded text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

