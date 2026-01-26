"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Info, Search } from "lucide-react";
import Link from "next/link";

// Keyword mappings for search aliases (from add-card-modal)
const ISSUER_KEYWORDS: Record<string, string[]> = {
  "american express": ["amex", "americanexpress", "ae"],
  "bank of america": ["bofa", "boa", "bankofamerica"],
  "capital one": ["capitalone", "cap1", "c1", "capone"],
  "us bank": ["usbank", "usb"],
  "wells fargo": ["wellsfargo", "wf"],
  "barclays": ["barclaycard"],
  "discover": ["disc"],
};

const CARD_ABBREVIATIONS: Record<string, string[]> = {
  "platinum": ["abp", "app", "plat"],
  "business platinum": ["abp", "biz plat", "bizplat"],
  "gold": ["abg", "apg"],
  "business gold": ["abg", "biz gold", "bizgold"],
  "green": ["ag", "agr", "amex green"],
  "business green": ["abgr", "biz green", "bizgreen"],
  "blue business plus": ["bbp"],
  "blue cash preferred": ["bcp"],
  "blue cash everyday": ["bce"],
  "everyday preferred": ["edp", "ed pref"],
  "everyday": ["ed"],
  "delta gold": ["adg", "delta gold"],
  "delta platinum": ["adp", "delta plat"],
  "delta reserve": ["adr"],
  "hilton aspire": ["aspire", "hh aspire"],
  "hilton surpass": ["surpass", "hh surpass"],
  "hilton business": ["hh biz"],
  "bonvoy brilliant": ["brilliant", "mb brilliant"],
  "bonvoy business": ["mb biz", "bonvoy biz"],
  "bonvoy bevy": ["bevy"],
  "sapphire reserve": ["csr", "reserve"],
  "sapphire preferred": ["csp"],
  "sapphire reserve business": ["csrb", "biz reserve"],
  "ink business preferred": ["cip", "ink preferred", "ink pref"],
  "ink business cash": ["cic", "ink cash"],
  "ink business unlimited": ["ciu", "ink unlimited"],
  "ink cash": ["cic"],
  "ink unlimited": ["ciu"],
  "ink premier": ["cip2", "ink prem"],
  "freedom": ["cf", "chase freedom"],
  "freedom unlimited": ["cfu", "fu"],
  "freedom flex": ["cff", "ff"],
  "united explorer": ["ue", "mpx explorer"],
  "united quest": ["uq", "mpx quest"],
  "united club": ["uc", "mpx club"],
  "united business": ["ub", "mpx biz"],
  "united gateway": ["ug", "mpx gateway"],
  "sw priority": ["swp", "sw pri"],
  "sw premier": ["sw prem"],
  "sw plus": ["sw+"],
  "sw performance business": ["sw perf", "sw biz"],
  "hyatt personal": ["woh card", "hyatt"],
  "hyatt business": ["woh biz"],
  "ihg premier": ["ihg"],
  "ritz carlton": ["ritz", "rc"],
  "bonvoy boundless": ["boundless"],
  "bonvoy bountiful": ["bountiful"],
  "bonvoy bold": ["bold"],
  "double cash": ["dc", "citi dc"],
  "strata premier": ["cp", "citi premier", "premier"],
  "strata elite": ["cse", "citi elite"],
  "custom cash": ["ccc"],
  "aa platinum": ["citi aa", "aa plat"],
  "aa executive": ["aa exec", "citi exec"],
  "aa business": ["aa biz"],
  "venture x": ["vx", "c1vx", "cap1 vx"],
  "venture x business": ["vxb", "c1vxb"],
  "venture": ["c1v", "cap1 venture"],
  "ventureone": ["v1", "c1v1"],
  "quicksilver": ["qs", "c1qs"],
  "savor": ["c1s", "cap1 savor"],
  "spark cash plus": ["spark", "spark cash"],
  "spark miles": ["spark miles"],
  "altitude reserve": ["ar", "usb ar", "altitude"],
  "altitude connect": ["ac", "usb ac"],
  "bilt card": ["bilt"],
  "amazon prime": ["amazon", "prime visa"],
  "costco visa": ["costco"],
  "apple card": ["apple"],
};

const CURRENCY_KEYWORDS: Record<string, string[]> = {
  "american": ["aa", "aadvantage", "american airlines"],
  "united": ["mileageplus", "ua", "mpx"],
  "delta": ["skymiles", "dl"],
  "southwest": ["rapid rewards", "wn", "sw", "rr"],
  "alaska": ["mileage plan", "as"],
  "jetblue": ["trueblue", "b6", "jb"],
  "british airways": ["avios", "ba", "exec club"],
  "marriott": ["bonvoy", "mb", "spg"],
  "hilton": ["honors", "hh"],
  "hyatt": ["world of hyatt", "woh"],
  "ihg": ["one rewards", "ihg rewards"],
  "chase": ["ultimate rewards", "ur"],
  "amex": ["membership rewards", "mr"],
  "citi": ["thankyou", "thank you", "typ", "ty"],
  "capital one": ["venture miles", "c1 miles"],
  "bilt": ["bilt rewards", "bilt points"],
};

// Build bidirectional lookup
function buildBidirectionalLookup(mapping: Record<string, string[]>): Map<string, string[]> {
  const lookup = new Map<string, string[]>();
  for (const [value, keywords] of Object.entries(mapping)) {
    const valueLower = value.toLowerCase();
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const existing = lookup.get(keywordLower) ?? [];
      if (!existing.includes(valueLower)) existing.push(valueLower);
      lookup.set(keywordLower, existing);
    }
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

// Rich tooltip component - uses fixed positioning to escape overflow containers
function RichTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, showBelow: false });
  const ref = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const showBelow = rect.top < 120; // Show below if near top of viewport
      setCoords({
        top: showBelow ? rect.bottom + 4 : rect.top - 4,
        left: Math.min(rect.left + rect.width / 2, window.innerWidth - 150), // Keep tooltip from going off right edge
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
      className="inline-flex items-center gap-1 cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <span 
          className="fixed px-3 py-2 text-xs bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-[9999] whitespace-pre-line pointer-events-none text-left text-zinc-300"
          style={{
            top: coords.showBelow ? coords.top : 'auto',
            bottom: coords.showBelow ? 'auto' : `calc(100vh - ${coords.top}px)`,
            left: coords.left,
            transform: 'translateX(-50%)',
            minWidth: '200px',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

interface Bonus {
  id: string;
  type: "points" | "cash" | "benefit";
  spendRequirement: number;
  timePeriod: number;
  timePeriodUnit: string;
  pointsAmount: number | null;
  currencyId: string | null;
  currencyName: string | null;
  currencyValue: number | null;
  cashAmount: number | null;
  benefitDescription: string | null;
  benefitValue: number | null;
}

interface ElevatedEarning {
  id: string;
  elevatedRate: number;
  durationMonths: number | null;
  durationUnit: string;
  categoryId: number | null;
  categoryName: string | null;
}

interface IntroApr {
  id: string;
  aprType: string;
  aprRate: number;
  duration: number;
  durationUnit: string;
}

interface CardOffer {
  id: string;
  description: string | null;
  internalDescription: string | null;
  offerType: "referral" | "affiliate" | "direct" | "nll" | "elevated" | "targeted";
  firstYearAfWaived: boolean;
  expiresAt: string | null;
  applicationUrl: string | null;
  bonuses: Bonus[];
  elevatedEarnings: ElevatedEarning[];
  introAprs: IntroApr[];
}

interface PlayerOwnership {
  playerNumber: number;
  playerName: string;
}

interface CardWithOffer {
  id: string;
  cardId: string;
  name: string;
  slug: string;
  officialName: string | null;
  imageUrl: string | null;
  annualFee: number;
  productType: "personal" | "business";
  issuerName: string;
  issuerId: string;
  brandName: string | null;
  brandId: string | null;
  currencyCode: string;
  currencyName: string;
  currencyType: string;
  currencyId: string | null;
  currencyValue: number;
  secondaryCurrencyId: string | null;
  secondaryCurrencyName: string | null;
  secondaryCurrencyCode: string | null;
  secondaryCurrencyValue: number | null;
  defaultEarnRate: number;
  players: PlayerOwnership[];
  isExcluded: boolean;
  offer: CardOffer;
  bonusValue: number;
  spendRequirement: number;
  returnOnSpend: number;
}

interface Player {
  playerNumber: number;
  description: string;
}

interface WalletCardForRules {
  cardId: string;
  playerNumber: number;
  approvalDate: string | null;
  issuerId: string;
  issuerName: string;
  brandName: string | null;
  productType: "personal" | "business";
  cardChargeType: "credit" | "charge" | null;
}

interface OffersTableProps {
  cards: CardWithOffer[];
  brands: { id: string; name: string }[];
  currencies: { id: string; name: string; code: string }[];
  players: Player[];
  walletCardsForRules: WalletCardForRules[];
  playerCurrencies: Record<number, string[]>; // player number -> array of currency IDs they earn
  isAdmin: boolean;
}

type SortKey = "bonusValue" | "name" | "returnOnSpend" | "annualFee";
type SortDirection = "asc" | "desc";

const currencyTypes = [
  { value: "transferable_points", label: "Flexible Points" },
  { value: "airline_miles", label: "Airline Miles" },
  { value: "hotel_points", label: "Hotel Points" },
  { value: "cash_back", label: "Cash Back" },
  { value: "non_transferable_points", label: "Other Points" },
];

// Get spectrum color for values (red = worst, green = best)
function getSpectrumColor(value: number, min: number, max: number): string {
  if (max === min) return "text-white";
  const ratio = (value - min) / (max - min);
  // ratio 0 = worst (red), 1 = best (green)
  if (ratio >= 0.8) return "text-emerald-400";
  if (ratio >= 0.6) return "text-green-400";
  if (ratio >= 0.4) return "text-yellow-400";
  if (ratio >= 0.2) return "text-orange-400";
  return "text-red-400";
}

// Card Rules Eligibility Logic
// Returns null if eligible, or a string describing why not eligible
function checkCardRulesEligibility(
  card: CardWithOffer,
  playerNumber: number,
  walletCards: WalletCardForRules[]
): string | null {
  const playerCards = walletCards.filter((w) => w.playerNumber === playerNumber && w.approvalDate);
  const now = new Date();
  
  // Helper to count cards from an issuer in a time window
  const countIssuerCardsInWindow = (issuerName: string, days: number) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return playerCards.filter((w) => 
      w.issuerName === issuerName && 
      w.approvalDate && 
      new Date(w.approvalDate) >= cutoff
    ).length;
  };

  // Helper to count all cards from any issuer in a time window  
  const countAllCardsInWindow = (days: number) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return playerCards.filter((w) => 
      w.approvalDate && 
      new Date(w.approvalDate) >= cutoff
    ).length;
  };

  // Helper to count cards of a specific type from an issuer
  const countIssuerCardsByType = (issuerName: string, chargeType: "credit" | "charge" | null) => {
    return playerCards.filter((w) => 
      w.issuerName === issuerName && 
      w.cardChargeType === chargeType
    ).length;
  };

  // Helper to count business cards from an issuer in a time window
  const countIssuerBizCardsInWindow = (issuerName: string, days: number) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return playerCards.filter((w) => 
      w.issuerName === issuerName && 
      w.productType === "business" &&
      w.approvalDate && 
      new Date(w.approvalDate) >= cutoff
    ).length;
  };

  const issuer = card.issuerName;

  // Amex Rules
  if (issuer === "American Express") {
    // 1 Amex card every 5 days
    if (countIssuerCardsInWindow("American Express", 5) >= 1) {
      return "1 Amex per 5 days";
    }
    // 2 Amex cards every 90 days
    if (countIssuerCardsInWindow("American Express", 90) >= 2) {
      return "2 Amex per 90 days";
    }
    // 5 Amex credit cards max - need to check card charge type
    // Note: We're assuming cards without explicit charge_type are credit cards
    const amexCreditCards = playerCards.filter((w) => 
      w.issuerName === "American Express" && 
      w.cardChargeType !== "charge"
    ).length;
    if (amexCreditCards >= 5) {
      return "5 Amex credit cards max";
    }
    // 10 Amex charge cards max
    if (countIssuerCardsByType("American Express", "charge") >= 10) {
      return "10 Amex charge cards max";
    }
  }

  // Bank of America Rules
  if (issuer === "Bank of America") {
    // 2 BoA cards every 2 months (60 days)
    if (countIssuerCardsInWindow("Bank of America", 60) >= 2) {
      return "2 BoA per 2 months";
    }
    // 3 BoA cards every 12 months (365 days)
    if (countIssuerCardsInWindow("Bank of America", 365) >= 3) {
      return "3 BoA per 12 months";
    }
    // 4 BoA cards every 24 months (730 days)
    if (countIssuerCardsInWindow("Bank of America", 730) >= 4) {
      return "4 BoA per 24 months";
    }
    // 7 cards from any issuer in 12 months (with BoA checking - assume they have it)
    if (countAllCardsInWindow(365) >= 7) {
      return "7+ cards in 12 months";
    }
  }

  // Capital One Rules
  if (issuer === "Capital One") {
    // Count only Capital One branded cards (exclude co-brands like REI, Sam's Club)
    const countCapOneBrandedCardsInWindow = (days: number) => {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return playerCards.filter((w) => 
        w.issuerName === "Capital One" && 
        w.brandName === "Capital One" &&
        w.approvalDate && 
        new Date(w.approvalDate) >= cutoff
      ).length;
    };
    
    // 1 Capital One card every 6 months (180 days) - excludes co-brands
    if (countCapOneBrandedCardsInWindow(180) >= 1) {
      return "1 Cap1 per 6 months";
    }
    // 1 Capital One business charge card maximum (lifetime)
    // Only applies to business charge cards
    // We don't have enough info to know if the target card is a charge card, so skip this
  }

  // Chase Rules
  if (issuer === "Chase") {
    // 5/24: 5 cards from any issuer in 24 months (730 days)
    if (countAllCardsInWindow(730) >= 5) {
      return "5/24 rule";
    }
    // 2 Chase cards every 30 days
    if (countIssuerCardsInWindow("Chase", 30) >= 2) {
      return "2 Chase per 30 days";
    }
  }

  // Citi Rules
  if (issuer === "Citi" || issuer === "Citibank") {
    const citiName = playerCards.some((w) => w.issuerName === "Citi") ? "Citi" : "Citibank";
    // 1 Citi card every 8 days
    if (countIssuerCardsInWindow(citiName, 8) >= 1) {
      return "1 Citi per 8 days";
    }
    // 2 Citi cards every 65 days
    if (countIssuerCardsInWindow(citiName, 65) >= 2) {
      return "2 Citi per 65 days";
    }
    // 1 Citi business card every 95 days
    if (card.productType === "business" && countIssuerBizCardsInWindow(citiName, 95) >= 1) {
      return "1 Citi biz per 95 days";
    }
  }

  return null; // Eligible
}

export function OffersTable({ cards, brands, currencies, players, walletCardsForRules, playerCurrencies, isAdmin }: OffersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("bonusValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");

  // Filter state - dropdown style like wallet table
  const [productTypeFilter, setProductTypeFilter] = useState<"" | "personal" | "business">("");
  const [brandFilter, setBrandFilter] = useState("");
  const [currencyTypeFilter, setCurrencyTypeFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<"" | number>(""); // "" = all, number = player doesn't have
  const [eligibilityFilter, setEligibilityFilter] = useState<"" | number>(""); // "" = all, number = player eligible

  // Helper function to check if a search term matches a card
  const termMatchesCard = (term: string, cardName: string, issuerName: string, currencyName: string): boolean => {
    // Direct matches on name, issuer, or currency
    if (cardName.includes(term)) return true;
    if (issuerName.includes(term)) return true;
    if (currencyName.includes(term)) return true;
    
    // Check if search term is a card abbreviation
    const matchedCardNames = cardAbbreviationLookup.get(term) ?? [];
    if (matchedCardNames.some(name => cardName.includes(name))) return true;
    
    // Check if search term is a keyword that maps to issuer
    const matchedIssuers = issuerKeywordLookup.get(term) ?? [];
    if (matchedIssuers.some(issuer => issuerName.includes(issuer))) return true;
    
    // Check if search term is a keyword that maps to currency
    const matchedCurrencies = currencyKeywordLookup.get(term) ?? [];
    if (matchedCurrencies.some(currency => currencyName.includes(currency))) return true;
    
    return false;
  };

  // Filtered and sorted cards
  const filteredCards = useMemo(() => {
    let result = cards.filter((card) => {
      // Hide excluded cards
      if (card.isExcluded) return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const cardName = card.name.toLowerCase();
        const issuerName = card.issuerName.toLowerCase();
        const currencyName = card.currencyName.toLowerCase();
        const internalDesc = card.offer.internalDescription?.toLowerCase() ?? "";
        
        // Combine searchable text
        const allText = `${cardName} ${issuerName} ${currencyName} ${internalDesc}`;
        
        // First try matching the full query
        if (!allText.includes(query)) {
          // Split into terms and check each term matches
          const terms = query.split(/\s+/).filter(t => t.length > 0);
          const allTermsMatch = terms.every(term => 
            termMatchesCard(term, cardName, issuerName, currencyName) || 
            internalDesc.includes(term)
          );
          if (!allTermsMatch) return false;
        }
      }

      // Product type filter
      if (productTypeFilter && card.productType !== productTypeFilter) return false;

      // Brand filter
      if (brandFilter && card.brandId !== brandFilter) return false;

      // Currency type filter
      if (currencyTypeFilter && card.currencyType !== currencyTypeFilter) return false;

      // Currency filter
      if (currencyFilter && card.currencyName !== currencyFilter) return false;

      // Ownership filter: cards player doesn't have
      if (ownershipFilter !== "") {
        const hasCard = card.players.some((p) => p.playerNumber === ownershipFilter);
        if (hasCard) return false;
      }

      // Eligibility filter: check card rules
      if (eligibilityFilter !== "") {
        const reason = checkCardRulesEligibility(card, eligibilityFilter, walletCardsForRules);
        if (reason !== null) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "bonusValue":
          comparison = a.bonusValue - b.bonusValue;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "returnOnSpend":
          comparison = a.returnOnSpend - b.returnOnSpend;
          break;
        case "annualFee":
          comparison = a.annualFee - b.annualFee;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [cards, search, sortKey, sortDirection, productTypeFilter, brandFilter, currencyTypeFilter, currencyFilter, ownershipFilter, eligibilityFilter, walletCardsForRules]);

  // Calculate min/max for spectrum coloring
  const valueStats = useMemo(() => {
    const values = filteredCards.map(c => c.bonusValue).filter(v => v > 0);
    const ros = filteredCards.map(c => c.returnOnSpend).filter(v => v > 0 && v !== Infinity);
    return {
      minValue: Math.min(...values, 0),
      // Cap bonus value max at $1000 so outliers don't skew the color scale
      maxValue: Math.min(Math.max(...values, 1), 1000),
      minRos: Math.min(...ros, 0),
      // Cap ROS max at 100% so outliers don't skew the color scale
      maxRos: Math.min(Math.max(...ros, 1), 100),
    };
  }, [filteredCards]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setProductTypeFilter("");
    setBrandFilter("");
    setCurrencyTypeFilter("");
    setCurrencyFilter("");
    setOwnershipFilter("");
    setEligibilityFilter("");
  };

  const hasActiveFilters = search || productTypeFilter || brandFilter || currencyTypeFilter || currencyFilter || ownershipFilter !== "" || eligibilityFilter !== "";

  // Helper to check if P1 has access to a card's secondary currency
  // If so, their bonus should show as that secondary currency
  const getEffectiveCurrencyForBonus = (card: CardWithOffer, bonus: Bonus): {
    currencyName: string | null;
    currencyValue: number | null;
    isSecondary: boolean;
  } => {
    // Only applies to point bonuses tied to the card's primary currency
    if (bonus.type !== "points" || !bonus.currencyId) {
      return { currencyName: bonus.currencyName, currencyValue: bonus.currencyValue, isSecondary: false };
    }
    
    // Check if this bonus is tied to the card's primary currency and card has a secondary
    if (bonus.currencyId === card.currencyId && card.secondaryCurrencyId) {
      // Check if P1 has another card earning the secondary currency
      const p1Currencies = playerCurrencies[1] ?? [];
      if (p1Currencies.includes(card.secondaryCurrencyId)) {
        return {
          currencyName: card.secondaryCurrencyName,
          currencyValue: card.secondaryCurrencyValue,
          isSecondary: true,
        };
      }
    }
    
    return { currencyName: bonus.currencyName, currencyValue: bonus.currencyValue, isSecondary: false };
  };

  const formatBonus = (bonus: Bonus, card: CardWithOffer) => {
    if (bonus.type === "points") {
      const { currencyName, isSecondary } = getEffectiveCurrencyForBonus(card, bonus);
      const displayName = currencyName ?? "points";
      // Show currency name for non-cash-back currencies, especially secondary ones
      if (isSecondary || (card.currencyType !== "cash_back" && currencyName)) {
        return `${bonus.pointsAmount?.toLocaleString()} ${displayName}`;
      }
      return `${bonus.pointsAmount?.toLocaleString()} points`;
    } else if (bonus.type === "cash") {
      return `$${bonus.cashAmount?.toLocaleString()}`;
    } else {
      return bonus.benefitDescription ?? "Benefit";
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // Build value calculation tooltip content
  const buildValueTooltip = (card: CardWithOffer) => {
    if (!card.offer) return "";
    const lines: string[] = [];
    let totalValue = 0;
    
    card.offer.bonuses.forEach((bonus) => {
      if (bonus.type === "points" && bonus.pointsAmount) {
        const { currencyName, currencyValue, isSecondary } = getEffectiveCurrencyForBonus(card, bonus);
        const effectiveValue = currencyValue ?? bonus.currencyValue ?? 1;
        const value = ((bonus.pointsAmount * effectiveValue) / 100);
        totalValue += value;
        const suffix = isSecondary ? ` (${currencyName})` : "";
        lines.push(`${bonus.pointsAmount.toLocaleString()} × ${effectiveValue.toFixed(2)}¢ = $${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`);
      } else if (bonus.type === "cash" && bonus.cashAmount) {
        totalValue += bonus.cashAmount;
        lines.push(`$${bonus.cashAmount.toLocaleString()} cash`);
      } else if (bonus.type === "benefit" && bonus.benefitValue) {
        totalValue += bonus.benefitValue;
        lines.push(`${bonus.benefitDescription}: $${bonus.benefitValue.toLocaleString()}`);
      }
    });
    
    if (lines.length > 1) {
      lines.push(`Total: $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    
    return lines.join("\n");
  };

  // Build ROS calculation tooltip content
  const buildRosTooltip = (card: CardWithOffer) => {
    if (!card.offer) return "";
    
    // Handle infinite ROS (no spend or first purchase only)
    if (card.spendRequirement <= 1) {
      const spendText = card.spendRequirement === 0 ? "No spend required" : "First purchase only";
      return `${spendText}\nBonus Value: $${card.bonusValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}\nROS: ∞ (infinite)`;
    }
    
    const earnRate = card.defaultEarnRate;
    const currencyValue = card.currencyValue;
    const earnedPoints = card.spendRequirement * earnRate;
    const earnedValue = (earnedPoints * currencyValue) / 100;
    
    const lines = [
      `Spend: $${card.spendRequirement.toLocaleString()}`,
      `Earned: ${earnedPoints.toLocaleString()} × ${(currencyValue / 100).toFixed(2)}¢ = $${earnedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `Bonus Value: $${card.bonusValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `Total Value: $${(card.bonusValue + earnedValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      `ROS: ${card.returnOnSpend >= 100 ? Math.round(card.returnOnSpend) : card.returnOnSpend.toFixed(1)}%`,
    ];
    
    return lines.join("\n");
  };

  // Get unique currencies from cards for dropdown
  const uniqueCurrencies = useMemo(() => {
    const currencySet = new Set<string>();
    cards.forEach((c) => {
      if (c.currencyName) currencySet.add(c.currencyName);
    });
    return Array.from(currencySet).sort();
  }, [cards]);

  return (
    <div className="space-y-4">
      {/* Filters Row - Dropdown style like wallet table */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards..."
              className="w-48 rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={productTypeFilter}
            onChange={(e) => setProductTypeFilter(e.target.value as "" | "personal" | "business")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>

          <select
            value={currencyTypeFilter}
            onChange={(e) => setCurrencyTypeFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Currency Types</option>
            {currencyTypes.map((ct) => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>

          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Currencies</option>
            {uniqueCurrencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>

          {players.length > 0 && (
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Cards</option>
              {players.map((p) => (
                <option key={p.playerNumber} value={p.playerNumber}>
                  {p.description} doesn&apos;t have
                </option>
              ))}
            </select>
          )}

          {players.length > 0 && (
            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Card Rules</option>
              {players.map((p) => (
                <option key={p.playerNumber} value={p.playerNumber}>
                  {p.description} is eligible
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
            >
              Clear
            </button>
          )}
        </div>

        <div className="text-sm text-zinc-400">
          {filteredCards.length} of {cards.filter(c => c.offer && !c.isExcluded).length} offers
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Card
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Welcome Offer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase max-w-xs">Description</th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort("bonusValue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Offer Value
                    <SortIcon columnKey="bonusValue" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort("returnOnSpend")}
                >
                  <div className="flex items-center justify-end gap-1">
                    ROS
                    <SortIcon columnKey="returnOnSpend" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort("annualFee")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Annual Fee
                    <SortIcon columnKey="annualFee" />
                  </div>
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredCards.map((card) => (
                <tr key={card.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {card.imageUrl && (
                        <img src={card.imageUrl} alt={card.name} className="w-12 h-8 object-contain rounded" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {card.offer?.applicationUrl ? (
                            <a
                              href={card.offer.applicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="text-white font-medium hover:text-blue-400 transition-colors"
                            >
                              {card.name}
                            </a>
                          ) : (
                            <span className="text-white font-medium">{card.name}</span>
                          )}
                          {card.players.length > 0 && (
                            card.players.map((p) => (
                              <span key={p.playerNumber} className="px-1.5 py-0.5 text-xs bg-blue-700/50 text-blue-300 rounded">
                                {p.playerName}
                              </span>
                            ))
                          )}
                          {card.offer?.offerType === "nll" && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-700/50 text-amber-300 rounded">NLL</span>
                          )}
                          {card.offer?.offerType === "targeted" && (
                            <span className="px-1.5 py-0.5 text-xs bg-teal-700/50 text-teal-300 rounded">Targeted</span>
                          )}
                          {card.offer?.expiresAt && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-700/50 text-amber-300 rounded">
                              Expires: {new Date(card.offer.expiresAt).getMonth() + 1}/{new Date(card.offer.expiresAt).getDate()}
                            </span>
                          )}
                          {card.isExcluded && (
                            <span className="px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-400 rounded">Excluded</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {card.issuerName} • {card.productType === "business" ? "Business" : "Personal"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {card.offer?.bonuses.slice(0, 2).map((bonus) => (
                        <div key={bonus.id}>
                          <span className="text-white font-medium">{formatBonus(bonus, card)}</span>
                          <span className="text-zinc-400 text-sm ml-1">
                            {bonus.spendRequirement === 0 ? (
                              "after approval"
                            ) : bonus.spendRequirement === 1 ? (
                              "after first purchase"
                            ) : (
                              <>after ${bonus.spendRequirement.toLocaleString()} in {bonus.timePeriod} {bonus.timePeriodUnit === "days" ? "days" : bonus.timePeriodUnit === "statement_cycles" ? "statement cycles" : "months"}</>
                            )}
                          </span>
                        </div>
                      ))}
                      {(card.offer?.bonuses.length ?? 0) > 2 && (
                        <div className="text-xs text-zinc-500">+{(card.offer?.bonuses.length ?? 0) - 2} more</div>
                      )}
                      {/* Elevated Earnings */}
                      {card.offer?.elevatedEarnings.length ? (
                        <div>
                          {card.offer.elevatedEarnings.map((e, i) => (
                            <span key={e.id}>
                              {i > 0 && ", "}
                              <span className="text-white font-medium">
                                {card.currencyType === "cash_back" ? `${e.elevatedRate}%` : `${e.elevatedRate}x`} on {e.categoryName ?? "all purchases"}
                              </span>
                              <span className="text-zinc-400 text-sm ml-1">
                                for {e.durationMonths}{e.durationUnit === "days" ? "d" : "mo"}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {/* Intro APR */}
                      {(card.offer?.introAprs.length ?? 0) > 0 && (
                        <div>
                          <span className="text-white font-medium">{card.offer?.introAprs[0].aprRate}% APR</span>
                          <span className="text-zinc-400 text-sm ml-1">
                            for {card.offer?.introAprs[0].duration}{card.offer?.introAprs[0].durationUnit === "days" ? "d" : "mo"}
                          </span>
                        </div>
                      )}
                      {/* Features */}
                      {card.offer?.firstYearAfWaived && (
                        <div className="text-sm text-zinc-400">AF waived</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {card.offer?.description && (
                      <p className="text-sm text-zinc-400 line-clamp-3">{card.offer.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RichTooltip content={buildValueTooltip(card)}>
                      <span className={`font-medium ${getSpectrumColor(card.bonusValue, valueStats.minValue, valueStats.maxValue)}`}>
                        ${card.bonusValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <Info className="w-3 h-3 text-zinc-500" />
                    </RichTooltip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RichTooltip content={buildRosTooltip(card)}>
                      {card.returnOnSpend === Infinity ? (
                        <span className="font-medium text-emerald-400">∞</span>
                      ) : (
                        <span className={`font-medium ${getSpectrumColor(card.returnOnSpend, valueStats.minRos, valueStats.maxRos)}`}>
                          {card.returnOnSpend >= 100 ? Math.round(card.returnOnSpend) : card.returnOnSpend.toFixed(1)}%
                        </span>
                      )}
                      <Info className="w-3 h-3 text-zinc-500" />
                    </RichTooltip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-medium">
                      {card.annualFee === 0 ? "$0" : `$${card.annualFee}`}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/cards/${card.cardId}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No cards match your filters. Try adjusting or clearing filters.
          </div>
        )}
      </div>
    </div>
  );
}
