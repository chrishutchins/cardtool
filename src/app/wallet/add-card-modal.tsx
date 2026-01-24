"use client";

import { useState, useTransition } from "react";

interface AvailableCard {
  id: string;
  name: string;
  slug: string;
  annual_fee: number;
  issuer_name?: string;
  primary_currency_name?: string;
  search_aliases?: string[] | null;
}

interface Issuer {
  id: string;
  name: string;
}

interface Currency {
  id: string;
  name: string;
}

interface AddCardModalProps {
  availableCards: AvailableCard[];
  onAddCard: (cardId: string) => Promise<void>;
  debitPayEnabled?: boolean;
  onEnableDebitPay?: () => Promise<void>;
  ownedCardIds?: string[];
  issuers?: Issuer[];
  currencies?: Currency[];
  onSubmitNewCard?: (data: {
    name: string;
    issuer_id: string;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    product_type: "personal" | "business";
    card_charge_type: "credit" | "charge" | "debit";
    annual_fee: number;
    default_earn_rate: number;
    no_foreign_transaction_fees: boolean;
    network: "visa" | "mastercard" | "amex" | "discover" | null;
  }) => Promise<void>;
}

const SECRET_CODE = "secretdebitpay";

// Issuer keyword mappings (keep hardcoded since these are standard abbreviations)
const ISSUER_KEYWORDS: Record<string, string[]> = {
  "american express": ["amex", "americanexpress", "ae"],
  "bank of america": ["bofa", "boa", "bankofamerica"],
  "capital one": ["capitalone", "cap1", "c1", "capone"],
  "us bank": ["usbank", "usb"],
  "wells fargo": ["wellsfargo", "wf"],
  "barclays": ["barclaycard"],
  "discover": ["disc"],
};

// Note: Card-specific abbreviations are now stored in the database (cards.search_aliases)
// and passed via the availableCards prop

const CURRENCY_KEYWORDS: Record<string, string[]> = {
  // Airlines (IATA codes)
  "american": ["aa", "aadvantage", "american airlines"],
  "united": ["mileageplus", "ua", "mpx"],
  "delta": ["skymiles", "dl"],
  "southwest": ["rapid rewards", "wn", "sw", "rr"],
  "alaska": ["mileage plan", "as"],
  "jetblue": ["trueblue", "b6", "jb"],
  "british airways": ["avios", "ba", "exec club"],
  "air france": ["flying blue", "af"],
  "klm": ["flying blue", "kl"],
  "lufthansa": ["miles & more", "lh", "m&m"],
  "singapore": ["krisflyer", "sq"],
  "cathay pacific": ["asia miles", "cx"],
  "emirates": ["skywards", "ek"],
  "qatar": ["privilege club", "qr"],
  "turkish": ["miles&smiles", "tk"],
  "qantas": ["qf", "qff"],
  "virgin atlantic": ["flying club", "vs"],
  "air canada": ["aeroplan", "ac"],
  "ana": ["nh", "all nippon"],
  "jal": ["jl", "japan airlines"],
  "korean air": ["skypass", "ke"],
  "etihad": ["guest", "ey"],
  "avianca": ["lifemiles", "av"],
  "iberia": ["avios", "ib"],
  "hawaiian": ["hawaiianmiles", "ha"],
  // Hotels
  "marriott": ["bonvoy", "mb", "spg"],
  "hilton": ["honors", "hh"],
  "hyatt": ["world of hyatt", "woh"],
  "ihg": ["one rewards", "ihg rewards"],
  "choice": ["choice privileges"],
  "wyndham": ["wyndham rewards"],
  "radisson": ["radisson rewards"],
  // Bank Programs
  "chase": ["ultimate rewards", "ur"],
  "amex": ["membership rewards", "mr"],
  "citi": ["thankyou", "thank you", "typ", "ty"],
  "capital one": ["venture miles", "c1 miles"],
  "wells fargo": ["rewards", "wf rewards"],
  "bilt": ["bilt rewards", "bilt points"],
  "us bank": ["flexperks", "us bank points"],
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
  issuers = [],
  currencies = [],
  onSubmitNewCard,
}: AddCardModalProps) {
  // Convert array to Set for efficient lookup
  const ownedCardIdsSet = new Set(ownedCardIds);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showSecretUnlock, setShowSecretUnlock] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // New card submission form state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardIssuerId, setNewCardIssuerId] = useState("");
  const [newCardPrimaryCurrencyId, setNewCardPrimaryCurrencyId] = useState("");
  const [newCardSecondaryCurrencyId, setNewCardSecondaryCurrencyId] = useState("");
  const [newCardProductType, setNewCardProductType] = useState<"personal" | "business">("personal");
  const [newCardChargeType, setNewCardChargeType] = useState<"credit" | "charge" | "debit">("credit");
  const [newCardAnnualFee, setNewCardAnnualFee] = useState(0);
  const [newCardEarnRate, setNewCardEarnRate] = useState(1);
  const [newCardNoFTF, setNewCardNoFTF] = useState(false);
  const [newCardNetwork, setNewCardNetwork] = useState<"visa" | "mastercard" | "amex" | "discover" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user typed the secret code
  const isSecretCode = search.toLowerCase() === SECRET_CODE;

  // Improved search function using multiple strategies
  const filteredCards = availableCards.filter((card) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    
    const cardName = card.name?.toLowerCase() ?? "";
    const issuerName = card.issuer_name?.toLowerCase() ?? "";
    const currencyName = card.primary_currency_name?.toLowerCase() ?? "";
    const searchAliases = card.search_aliases?.map(a => a.toLowerCase()) ?? [];
    
    // Combine all searchable text for the card
    const allText = `${cardName} ${issuerName} ${currencyName}`;
    
    // Strategy 1: Exact phrase match in card name
    if (cardName.includes(query)) return true;
    
    // Strategy 2: Query matches a database search alias exactly
    if (searchAliases.includes(query)) return true;
    
    // Strategy 3: All query words exist in combined text (word order independent)
    const words = query.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 1) {
      const allWordsFound = words.every(word => allText.includes(word));
      if (allWordsFound) return true;
    }
    
    // Strategy 4: Query word matches a search alias
    if (words.some(word => searchAliases.includes(word))) return true;
    
    // Strategy 5: Issuer keyword expansion (e.g., "amex" -> "american express")
    for (const word of words) {
      const matchedIssuers = issuerKeywordLookup.get(word) ?? [];
      if (matchedIssuers.some(issuer => issuerName.includes(issuer))) {
        // Check if other words also match
        const otherWords = words.filter(w => w !== word);
        if (otherWords.length === 0) return true;
        if (otherWords.every(w => allText.includes(w) || searchAliases.includes(w))) return true;
      }
    }
    
    // Strategy 6: Currency keyword expansion (e.g., "ur" -> "ultimate rewards")
    for (const word of words) {
      const matchedCurrencies = currencyKeywordLookup.get(word) ?? [];
      if (matchedCurrencies.some(currency => currencyName.includes(currency))) {
        const otherWords = words.filter(w => w !== word);
        if (otherWords.length === 0) return true;
        if (otherWords.every(w => allText.includes(w) || searchAliases.includes(w))) return true;
      }
    }
    
    // Strategy 7: Prefix matching (3+ chars) - "sapp" matches "sapphire"
    if (query.length >= 3) {
      const prefixMatch = cardName.split(/\s+/).some(nameWord => nameWord.startsWith(query));
      if (prefixMatch) return true;
      
      // Also check if each query word is a prefix of a card name word
      if (words.length > 1) {
        const cardWords = cardName.split(/\s+/);
        const allPrefixMatch = words.every(qWord => 
          qWord.length >= 3 && cardWords.some(cWord => cWord.startsWith(qWord))
        );
        if (allPrefixMatch) return true;
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

  const handleSubmitNewCard = async () => {
    if (!onSubmitNewCard || !newCardName || !newCardIssuerId || !newCardPrimaryCurrencyId) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitNewCard({
        name: newCardName,
        issuer_id: newCardIssuerId,
        primary_currency_id: newCardPrimaryCurrencyId,
        secondary_currency_id: newCardSecondaryCurrencyId || null,
        product_type: newCardProductType,
        card_charge_type: newCardChargeType,
        annual_fee: newCardAnnualFee,
        default_earn_rate: newCardEarnRate,
        no_foreign_transaction_fees: newCardNoFTF,
        network: newCardNetwork || null,
      });
      // Reset form
      setNewCardName("");
      setNewCardIssuerId("");
      setNewCardPrimaryCurrencyId("");
      setNewCardSecondaryCurrencyId("");
      setNewCardProductType("personal");
      setNewCardChargeType("credit");
      setNewCardAnnualFee(0);
      setNewCardEarnRate(1);
      setNewCardNoFTF(false);
      setNewCardNetwork("");
      setShowSubmitForm(false);
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSubmitForm = () => {
    setNewCardName("");
    setNewCardIssuerId("");
    setNewCardPrimaryCurrencyId("");
    setNewCardSecondaryCurrencyId("");
    setNewCardProductType("personal");
    setNewCardChargeType("credit");
    setNewCardAnnualFee(0);
    setNewCardEarnRate(1);
    setNewCardNoFTF(false);
    setNewCardNetwork("");
    setShowSubmitForm(false);
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
          {!isSecretCode && !showSecretUnlock && !showSubmitForm && (
            <>
              {Object.entries(cardsByIssuer).length > 0 ? (
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
              )}
              
              {/* Submit New Card Option */}
              {onSubmitNewCard && issuers.length > 0 && currencies.length > 0 && (
                <div className="p-4 border-t border-zinc-700">
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full text-center text-sm text-zinc-400 hover:text-blue-400 transition-colors py-2"
                  >
                    Can&apos;t find your card? Submit a new one →
                  </button>
                </div>
              )}
            </>
          )}

          {/* Submit New Card Form */}
          {showSubmitForm && onSubmitNewCard && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Submit New Card</h3>
                <button
                  onClick={resetSubmitForm}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  ← Back to search
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Submit a card we don&apos;t have. It will be added to your wallet and reviewed by our team.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Card Name *</label>
                  <input
                    type="text"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="e.g., My Custom Card"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Issuer *</label>
                    <select
                      value={newCardIssuerId}
                      onChange={(e) => setNewCardIssuerId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select issuer</option>
                      {issuers.map((issuer) => (
                        <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Primary Currency *</label>
                    <select
                      value={newCardPrimaryCurrencyId}
                      onChange={(e) => setNewCardPrimaryCurrencyId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>{currency.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Type</label>
                    <select
                      value={newCardProductType}
                      onChange={(e) => setNewCardProductType(e.target.value as "personal" | "business")}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Card Type</label>
                    <select
                      value={newCardChargeType}
                      onChange={(e) => setNewCardChargeType(e.target.value as "credit" | "charge" | "debit")}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="credit">Credit</option>
                      <option value="charge">Charge</option>
                      <option value="debit">Debit</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Annual Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={newCardAnnualFee}
                        onChange={(e) => setNewCardAnnualFee(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Network</label>
                    <select
                      value={newCardNetwork}
                      onChange={(e) => setNewCardNetwork(e.target.value as typeof newCardNetwork)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Not specified</option>
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">Amex</option>
                      <option value="discover">Discover</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={newCardNoFTF}
                      onChange={(e) => setNewCardNoFTF(e.target.checked)}
                      className="rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                    />
                    No foreign transaction fees
                  </label>
                </div>

                <button
                  onClick={handleSubmitNewCard}
                  disabled={isSubmitting || !newCardName || !newCardIssuerId || !newCardPrimaryCurrencyId}
                  className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Submitting..." : "Submit Card & Add to Wallet"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

