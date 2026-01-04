"use client";

import { useState, useTransition } from "react";

interface AvailableCard {
  id: string;
  name: string;
  slug: string;
  annual_fee: number;
  issuer_name?: string;
  primary_currency_name?: string;
}

interface AddCardModalProps {
  availableCards: AvailableCard[];
  onAddCard: (cardId: string) => Promise<void>;
  debitPayEnabled?: boolean;
  onEnableDebitPay?: () => Promise<void>;
  ownedCardIds?: string[];
}

const SECRET_CODE = "secretdebitpay";

// Keyword mappings for search aliases
// Maps search terms to issuer names or currency names they should match
const ISSUER_KEYWORDS: Record<string, string[]> = {
  "american express": ["amex", "americanexpress"],
  "bank of america": ["bofa", "boa", "bankofamerica"],
  "capital one": ["capitalone", "cap1", "c1"],
  "us bank": ["usbank"],
  "wells fargo": ["wellsfargo", "wf"],
  "barclays": ["barclaycard"],
};

const CURRENCY_KEYWORDS: Record<string, string[]> = {
  "american": ["aa", "aadvantage", "american airlines"],
  "united": ["mileageplus", "ua"],
  "delta": ["skymiles", "dl"],
  "southwest": ["rapid rewards", "wn"],
  "alaska": ["mileage plan", "as"],
  "marriott": ["bonvoy"],
  "hilton": ["honors"],
  "hyatt": ["world of hyatt", "woh"],
  "ihg": ["one rewards"],
  "chase": ["ultimate rewards", "ur"],
  "amex": ["membership rewards", "mr"],
  "citi": ["thankyou", "thank you", "typ"],
  "capital one": ["venture miles"],
  "wells fargo": ["rewards"],
  "bilt": ["bilt rewards"],
};

// Build bidirectional lookup: maps keywords to values AND values to keywords
// So "amex" -> ["american express"] AND "american express" -> ["amex"]
function buildBidirectionalLookup(mapping: Record<string, string[]>): Map<string, string[]> {
  const lookup = new Map<string, string[]>();
  
  for (const [value, keywords] of Object.entries(mapping)) {
    const valueLower = value.toLowerCase();
    
    // Map each keyword -> value (e.g., "amex" -> "american express")
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const existing = lookup.get(keywordLower) ?? [];
      if (!existing.includes(valueLower)) existing.push(valueLower);
      lookup.set(keywordLower, existing);
    }
    
    // Map value -> all keywords (e.g., "american express" -> ["amex", "americanexpress"])
    // This enables reverse lookups
    const existingForValue = lookup.get(valueLower) ?? [];
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (!existingForValue.includes(keywordLower)) existingForValue.push(keywordLower);
    }
    lookup.set(valueLower, existingForValue);
  }
  
  return lookup;
}

const issuerKeywordLookup = buildBidirectionalLookup(ISSUER_KEYWORDS);
const currencyKeywordLookup = buildBidirectionalLookup(CURRENCY_KEYWORDS);

export function AddCardModal({ 
  availableCards, 
  onAddCard, 
  debitPayEnabled = false,
  onEnableDebitPay,
  ownedCardIds = [],
}: AddCardModalProps) {
  // Convert array to Set for efficient lookup
  const ownedCardIdsSet = new Set(ownedCardIds);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showSecretUnlock, setShowSecretUnlock] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Check if user typed the secret code
  const isSecretCode = search.toLowerCase() === SECRET_CODE;

  const filteredCards = availableCards.filter((card) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    
    const cardName = card.name?.toLowerCase() ?? "";
    const issuerName = card.issuer_name?.toLowerCase() ?? "";
    const currencyName = card.primary_currency_name?.toLowerCase() ?? "";
    
    // Direct matches on name, issuer, or currency
    if (cardName.includes(query)) return true;
    if (issuerName.includes(query)) return true;
    if (currencyName.includes(query)) return true;
    
    // Check if search term is a keyword that maps to this card's issuer
    const matchedIssuers = issuerKeywordLookup.get(query) ?? [];
    if (matchedIssuers.some(issuer => issuerName.includes(issuer))) return true;
    
    // Check if search term is a keyword that maps to this card's currency
    const matchedCurrencies = currencyKeywordLookup.get(query) ?? [];
    if (matchedCurrencies.some(currency => currencyName.includes(currency))) return true;
    
    // Also check partial keyword matches (e.g., "amex" typed as "ame")
    for (const [keyword, issuers] of issuerKeywordLookup.entries()) {
      if (keyword.includes(query) || query.includes(keyword)) {
        if (issuers.some(issuer => issuerName.includes(issuer))) return true;
      }
    }
    for (const [keyword, currencies] of currencyKeywordLookup.entries()) {
      if (keyword.includes(query) || query.includes(keyword)) {
        if (currencies.some(currency => currencyName.includes(currency))) return true;
      }
    }
    
    return false;
  });

  const handleEnableDebitPay = () => {
    if (onEnableDebitPay) {
      startTransition(async () => {
        await onEnableDebitPay();
        setSearch("");
        setShowSecretUnlock(true);
      });
    }
  };

  // Group by issuer and sort cards within each issuer
  const cardsByIssuer = filteredCards.reduce((acc, card) => {
    const issuer = card.issuer_name ?? "Unknown";
    if (!acc[issuer]) acc[issuer] = [];
    acc[issuer].push(card);
    return acc;
  }, {} as Record<string, AvailableCard[]>);
  
  // Sort cards within each issuer alphabetically
  Object.values(cardsByIssuer).forEach(cards => 
    cards.sort((a, b) => a.name.localeCompare(b.name))
  );

  const handleAdd = async (cardId: string) => {
    setAddingId(cardId);
    await onAddCard(cardId);
    setAddingId(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-onboarding="add-card"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Add Card
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] max-w-lg mx-auto z-50 max-h-[80vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="p-4 border-b border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Add Card to Wallet</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Secret Debit Pay Unlock */}
          {isSecretCode && !debitPayEnabled && onEnableDebitPay && (
            <div className="p-6 text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 mb-4">
                  <span className="text-3xl">🔓</span>
                </div>
                <h3 className="text-lg font-semibold text-pink-400 mb-2">Secret Feature Unlocked!</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  You've discovered the Debit Pay feature. This allows you to add an extra earning 
                  percentage to any card in your wallet.
                </p>
              </div>
              <button
                onClick={handleEnableDebitPay}
                disabled={isPending}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 transition-all"
              >
                {isPending ? "Enabling..." : "Enable Debit Pay"}
              </button>
            </div>
          )}

          {/* Already Unlocked Message */}
          {showSecretUnlock && debitPayEnabled && (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-pink-400 mb-2">Debit Pay Enabled!</h3>
              <p className="text-sm text-zinc-400">
                You can now add Debit Pay percentages to your cards in the wallet table.
              </p>
            </div>
          )}

          {/* Normal Card List */}
          {!isSecretCode && !showSecretUnlock && (
            Object.entries(cardsByIssuer).length > 0 ? (
              Object.entries(cardsByIssuer)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([issuer, cards]) => (
                <div key={issuer}>
                  <div className="px-4 py-2 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase sticky top-0">
                    {issuer}
                  </div>
                  {cards.map((card, index) => (
                    <div
                      key={card.id ?? `modal-card-${index}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div>
                        <p className="text-white font-medium">{card.name}</p>
                        <p className="text-sm text-zinc-500">
                          {card.primary_currency_name}
                          {card.annual_fee
                            ? ` • $${card.annual_fee}/yr`
                            : " • No annual fee"}
                        </p>
                      </div>
                      {card.id && (
                        <button
                          onClick={() => handleAdd(card.id!)}
                          disabled={addingId === card.id}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {addingId === card.id 
                            ? "Adding..." 
                            : ownedCardIdsSet.has(card.id) 
                              ? "Add Another" 
                              : "Add"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500">
                {search ? "No cards found matching your search." : "No more cards available to add."}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}

