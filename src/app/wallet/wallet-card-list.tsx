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
    if (!cents) return "No fee";
    return `$${(cents / 100).toFixed(0)}/yr`;
  };

  const currencyTypeColors: Record<string, string> = {
    points: "bg-purple-500/20 text-purple-300",
    cash: "bg-green-500/20 text-green-300",
    miles: "bg-blue-500/20 text-blue-300",
    other: "bg-zinc-500/20 text-zinc-300",
  };

  return (
    <div className="space-y-2">
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
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Card info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{card.name}</span>
                    <span className="text-zinc-500 text-sm hidden sm:inline">·</span>
                    <span className="text-zinc-500 text-sm hidden sm:inline truncate">{card.issuers?.name}</span>
                    {hasSecondaryEnabled && card.secondary_currency && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 shrink-0">
                        ↑
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle: Currency badge */}
              {activeCurrency && (
                <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${currencyTypeColors[activeCurrency.currency_type]}`}>
                  {activeCurrency.code}
                </div>
              )}

              {/* Right: Fee, rate, remove */}
              <div className="flex items-center gap-4 text-sm text-zinc-500 shrink-0">
                <span className="hidden md:inline">{formatFee(card.annual_fee_cents)}</span>
                <span className="hidden lg:inline">{card.default_earn_rate}x</span>
                
                {removingId === wc.id ? (
                  <div className="flex items-center gap-1">
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
          </div>
        );
      })}
    </div>
  );
}
