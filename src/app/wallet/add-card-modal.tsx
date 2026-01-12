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
  "american express": ["amex", "americanexpress", "ae"],
  "bank of america": ["bofa", "boa", "bankofamerica"],
  "capital one": ["capitalone", "cap1", "c1", "capone"],
  "us bank": ["usbank", "usb"],
  "wells fargo": ["wellsfargo", "wf"],
  "barclays": ["barclaycard"],
  "discover": ["disc"],
};

// Card-specific abbreviations that map to card names
// These are common abbreviations used in the points/miles community
const CARD_ABBREVIATIONS: Record<string, string[]> = {
  // Amex Charge Cards
  "platinum": ["abp", "app", "plat"],
  "business platinum": ["abp", "biz plat", "bizplat"],
  "gold": ["abg", "apg"],
  "business gold": ["abg", "biz gold", "bizgold"],
  "green": ["ag", "agr", "amex green"],
  "business green": ["abgr", "biz green", "bizgreen"],
  // Amex Cash Back
  "blue business plus": ["bbp"],
  "blue cash preferred": ["bcp"],
  "blue cash everyday": ["bce"],
  "everyday preferred": ["edp", "ed pref"],
  "everyday": ["ed"],
  // Amex Delta
  "delta gold": ["adg", "delta gold"],
  "delta platinum": ["adp", "delta plat"],
  "delta reserve": ["adr"],
  // Amex Hilton
  "hilton aspire": ["aspire", "hh aspire"],
  "hilton surpass": ["surpass", "hh surpass"],
  "hilton business": ["hh biz"],
  // Amex Marriott
  "bonvoy brilliant": ["brilliant", "mb brilliant"],
  "bonvoy business": ["mb biz", "bonvoy biz"],
  "bonvoy bevy": ["bevy"],
  // Chase Sapphire
  "sapphire reserve": ["csr", "reserve"],
  "sapphire preferred": ["csp"],
  "sapphire reserve business": ["csrb", "biz reserve"],
  // Chase Ink
  "ink business preferred": ["cip", "ink preferred", "ink pref"],
  "ink business cash": ["cic", "ink cash"],
  "ink business unlimited": ["ciu", "ink unlimited"],
  "ink cash": ["cic"],
  "ink unlimited": ["ciu"],
  "ink premier": ["cip2", "ink prem"],
  // Chase Freedom
  "freedom": ["cf", "chase freedom"],
  "freedom unlimited": ["cfu", "fu"],
  "freedom flex": ["cff", "ff"],
  // Chase United
  "united explorer": ["ue", "mpx explorer"],
  "united quest": ["uq", "mpx quest"],
  "united club": ["uc", "mpx club"],
  "united business": ["ub", "mpx biz"],
  "united gateway": ["ug", "mpx gateway"],
  // Chase Southwest
  "sw priority": ["swp", "sw pri"],
  "sw premier": ["sw prem"],
  "sw plus": ["sw+"],
  "sw performance business": ["sw perf", "sw biz"],
  // Chase Hotel
  "hyatt personal": ["woh card", "hyatt"],
  "hyatt business": ["woh biz"],
  "ihg premier": ["ihg"],
  "ritz carlton": ["ritz", "rc"],
  "bonvoy boundless": ["boundless"],
  "bonvoy bountiful": ["bountiful"],
  "bonvoy bold": ["bold"],
  // Citi
  "double cash": ["dc", "citi dc"],
  "strata premier": ["cp", "citi premier", "premier"],
  "strata elite": ["cse", "citi elite"],
  "custom cash": ["ccc"],
  "aa platinum": ["citi aa", "aa plat"],
  "aa executive": ["aa exec", "citi exec"],
  "aa business": ["aa biz"],
  // Capital One
  "venture x": ["vx", "c1vx", "cap1 vx"],
  "venture x business": ["vxb", "c1vxb"],
  "venture": ["c1v", "cap1 venture"],
  "ventureone": ["v1", "c1v1"],
  "quicksilver": ["qs", "c1qs"],
  "savor": ["c1s", "cap1 savor"],
  "spark cash plus": ["spark", "spark cash"],
  "spark miles": ["spark miles"],
  // US Bank
  "altitude reserve": ["ar", "usb ar", "altitude"],
  "altitude connect": ["ac", "usb ac"],
  // Bilt
  "bilt card": ["bilt"],
  // Other
  "amazon prime": ["amazon", "prime visa"],
  "costco visa": ["costco"],
  "apple card": ["apple"],
};

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
const cardAbbreviationLookup = buildBidirectionalLookup(CARD_ABBREVIATIONS);

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
    
    // Check if search term is a card abbreviation (e.g., "csr" -> "sapphire reserve")
    const matchedCardNames = cardAbbreviationLookup.get(query) ?? [];
    if (matchedCardNames.some(name => cardName.includes(name))) return true;
    
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
    // Check card abbreviations with partial matching
    for (const [keyword, cardNames] of cardAbbreviationLookup.entries()) {
      if (keyword === query) {
        if (cardNames.some(name => cardName.includes(name))) return true;
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

