"use client";

import { useState, useTransition } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
}

interface Card {
  id: string;
  name: string;
  issuer_name: string | null;
  primary_currency_name: string | null;
}

interface EligibilityEditorProps {
  currentCurrencyIds: string[];
  currentCardIds: string[];
  allCurrencies: Currency[];
  allCards: Card[];
  onUpdateCurrencies: (currencyIds: string[]) => Promise<void>;
  onUpdateCards: (cardIds: string[]) => Promise<void>;
}

export function EligibilityEditor({
  currentCurrencyIds,
  currentCardIds,
  allCurrencies,
  allCards,
  onUpdateCurrencies,
  onUpdateCards,
}: EligibilityEditorProps) {
  const [selectedCurrencyIds, setSelectedCurrencyIds] = useState<Set<string>>(
    new Set(currentCurrencyIds)
  );
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set(currentCardIds)
  );
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"currencies" | "cards">("currencies");

  const hasChanges =
    selectedCurrencyIds.size !== currentCurrencyIds.length ||
    !currentCurrencyIds.every((id) => selectedCurrencyIds.has(id)) ||
    selectedCardIds.size !== currentCardIds.length ||
    !currentCardIds.every((id) => selectedCardIds.has(id));

  const handleSave = () => {
    startTransition(async () => {
      await onUpdateCurrencies(Array.from(selectedCurrencyIds));
      await onUpdateCards(Array.from(selectedCardIds));
    });
  };

  const toggleCurrency = (id: string) => {
    const newSet = new Set(selectedCurrencyIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCurrencyIds(newSet);
  };

  const toggleCard = (id: string) => {
    const newSet = new Set(selectedCardIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCardIds(newSet);
  };

  // Group cards by issuer
  const cardsByIssuer = allCards.reduce((acc, card) => {
    const issuer = card.issuer_name ?? "Unknown";
    if (!acc[issuer]) acc[issuer] = [];
    acc[issuer].push(card);
    return acc;
  }, {} as Record<string, Card[]>);

  return (
    <div className="space-y-4">
      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-zinc-700 pb-2">
        <button
          onClick={() => setActiveTab("currencies")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "currencies"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          By Currency ({selectedCurrencyIds.size})
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "cards"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          By Specific Cards ({selectedCardIds.size})
        </button>
      </div>

      {/* Currency Selection */}
      {activeTab === "currencies" && (
        <div>
          <p className="text-xs text-zinc-500 mb-3">
            Select currencies - all cards earning these currencies will be eligible for the multiplier.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg border border-zinc-700 bg-zinc-800/30">
            {allCurrencies.map((currency) => (
              <label
                key={currency.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-zinc-700/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCurrencyIds.has(currency.id)}
                  onChange={() => toggleCurrency(currency.id)}
                  className="rounded border-zinc-600 bg-zinc-700 text-green-500 focus:ring-green-500"
                />
                <span className="text-white text-sm">{currency.name}</span>
                <span className="text-zinc-500 text-xs font-mono">{currency.code}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Card Selection */}
      {activeTab === "cards" && (
        <div>
          <p className="text-xs text-zinc-500 mb-3">
            Select specific cards - use this for card-specific programs (like US Bank Smartly).
          </p>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-zinc-700 divide-y divide-zinc-700">
            {Object.entries(cardsByIssuer).sort(([a], [b]) => a.localeCompare(b)).map(([issuer, cards]) => (
              <div key={issuer}>
                <div className="px-4 py-2 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase sticky top-0">
                  {issuer}
                </div>
                {cards.map((card) => (
                  <label
                    key={card.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCardIds.has(card.id)}
                      onChange={() => toggleCard(card.id)}
                      className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm">{card.name}</span>
                      {card.primary_currency_name && (
                        <span className="text-zinc-500 text-xs ml-2">
                          ({card.primary_currency_name})
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      )}

      {/* Summary */}
      {(selectedCurrencyIds.size > 0 || selectedCardIds.size > 0) && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Current Selection</h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedCurrencyIds).map((id) => {
              const currency = allCurrencies.find((c) => c.id === id);
              return currency ? (
                <span
                  key={id}
                  className="inline-flex items-center px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs"
                >
                  {currency.name}
                </span>
              ) : null;
            })}
            {Array.from(selectedCardIds).map((id) => {
              const card = allCards.find((c) => c.id === id);
              return card ? (
                <span
                  key={id}
                  className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs"
                >
                  {card.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

