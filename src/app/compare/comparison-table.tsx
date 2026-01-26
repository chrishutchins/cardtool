"use client";

import { useState, useMemo, useEffect, useRef, useTransition, useCallback } from "react";
import { CardPreviewModal, CardPreviewData } from "@/components/card-preview-modal";

// ============================================================================
// DraggableItem Component for reorderable lists
// Uses IDs instead of indices to avoid issues with filtered arrays

interface DraggableItemProps {
  id: string;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

function DraggableItem({ id, onDragStart, onDragOver, onDragEnd, children }: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
        onDragOver(id);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      className={`
        transition-all duration-150
        ${isDragging ? "opacity-50" : ""}
        ${isDragOver ? "border-t-2 border-blue-500" : ""}
      `}
    >
      {children}
    </div>
  );
}

// Fast tooltip component - uses fixed positioning to escape overflow containers
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
          className="fixed px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-600 rounded shadow-lg max-w-xs z-[9999] pointer-events-none"
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

// Rich tooltip with ReactNode content support for colored breakdowns
// Smart positioning: appears above by default, below if not enough space
// Rich tooltip component - uses fixed positioning to escape overflow containers
function RichTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, showBelow: false });
  const ref = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const showBelow = rect.top < 80;
      setCoords({
        top: showBelow ? rect.bottom + 4 : rect.top - 4,
        left: rect.left + rect.width / 2,
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
      className="inline-flex cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <span 
          className="fixed px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-600 rounded shadow-lg z-[9999] whitespace-nowrap pointer-events-none -translate-x-1/2"
          style={{
            top: coords.showBelow ? coords.top : 'auto',
            bottom: coords.showBelow ? 'auto' : `calc(100vh - ${coords.top}px)`,
            left: coords.left,
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

interface CardPreviewEarningRule {
  category_id: number;
  category_name: string;
  rate: number;
  booking_method: string;
  has_cap: boolean;
  cap_amount: number | null;
  cap_period: string | null;
  cap_unit: string | null;
  post_cap_rate: number | null;
  brand_name: string | null;
}

interface CardPreviewCategoryBonus {
  id: string;
  cap_type: string;
  cap_amount: number | null;
  cap_period: string | null;
  elevated_rate: number;
  post_cap_rate: number | null;
  categories: { id: number; name: string }[];
}

interface CardPreviewCredit {
  id: string;
  name: string;
  brand_name: string | null;
  reset_cycle: string;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  notes: string | null;
  credit_count: number;
}

interface Card {
  id: string; // wallet_id for owned cards, card_id for non-owned cards
  cardId: string; // Original card_id for lookups (earning rates, debit pay, etc.)
  name: string;
  slug: string;
  annualFee: number;
  defaultEarnRate: number;
  issuerName: string;
  brandName: string | null;
  currencyCode: string;
  currencyName: string;
  currencyType: string;
  productType: "personal" | "business";
  chargeType: "credit" | "charge" | null;
  pointValue: number;
  isOwned: boolean;
  playerNumber: number | null;
  earningRates: Record<number, number>;
  multiplier: number;
  spendBonusRate: number;
  welcomeBonusRate: number;
  // Detailed bonus info for proper capped calculations
  spendBonuses: BonusInfo[];
  welcomeBonuses: BonusInfo[];
  // Preview modal data
  previewEarningRules: CardPreviewEarningRule[];
  previewCategoryBonuses: CardPreviewCategoryBonus[];
  previewCredits: CardPreviewCredit[];
  primaryCurrency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
}

interface BonusInfo {
  name: string;             // Display name for the bonus
  bonusValue: number;       // Max dollar value of this bonus
  spendCap: number;         // Spend threshold to earn full bonus
  type: "threshold" | "elite_earning";
  sourceType: "welcome" | "spend_threshold" | "elite_earning";
  unitCap?: number;         // Max units for elite earning (if capped)
  unitValue?: number;       // Value per unit for elite earning
  perSpend?: number;        // Spend per unit for elite earning
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parentCategoryId: number | null;
}

interface CapInfo {
  capAmount: number | null;
  capPeriod: string | null;
  capType: string;
  postCapRate: number | null;
  elevatedRate: number;
}

interface BonusDisplaySettings {
  includeWelcomeBonuses: boolean;
  includeSpendBonuses: boolean;
  includeDebitPay: boolean;
  showAvailableCredit: boolean;
}

// Bilt Housing Points info for breakdown tooltips
interface BiltHousingInfo {
  option: 1 | 2;
  tierRate: number;  // For Option 1: 0.5-1.25, For Option 2: 4/3
  housingSpendCents: number;  // Total housing spend
  capSpendCents: number;  // Cap on everyday spend for Housing Points
}

// Housing category IDs (Rent and Mortgage) - used for Bilt logic
const HOUSING_CATEGORY_IDS = [37, 59];

interface ComparisonTableProps {
  cards: Card[];
  categories: Category[];
  defaultCategorySlugs: string[];
  initialCategorySlugs: string[];
  initialEvalCardIds: string[];
  debitPayValues: Record<string, number>;
  userSpending: Record<number, number>;
  capInfo: Record<string, Record<number, CapInfo>>;
  biltHousingInfo?: Record<string, BiltHousingInfo>;
  bonusDisplaySettings: BonusDisplaySettings;
  availableCredit: Record<string, number>;
  creditLimits: Record<string, number>;
  accountLinkingEnabled: boolean;
  playerCount: number;
  players: { player_number: number; description: string }[];
  onSaveCategories?: (categoryIds: number[]) => Promise<void>;
  onSaveEvalCards?: (cardIds: string[]) => Promise<void>;
  onUpdateBonusSettings?: (includeWelcomeBonuses: boolean, includeSpendBonuses: boolean, includeDebitPay: boolean, showAvailableCredit: boolean) => Promise<void>;
}

type SortConfig = {
  type: "card" | "category";
  categoryId?: number;
  direction: "asc" | "desc";
};

type FilterMode = "all" | "my-cards" | "evaluate";

/**
 * Calculate the actual bonus value earned given total spend on a card.
 * 
 * For threshold bonuses: earn min(spend, spendCap) / spendCap * bonusValue
 *   (i.e., prorated if spend < requirement, full value if spend >= requirement)
 * 
 * For elite earning: earn (spend / perSpend) * unitValue, capped at unitCap * unitValue
 */
function calculateBonusValueFromSpend(
  totalSpend: number,
  bonuses: BonusInfo[]
): number {
  let totalBonusValue = 0;

  for (const bonus of bonuses) {
    if (bonus.type === "threshold") {
      // Threshold bonus: prorated based on how much of the spend requirement is met
      const earnedValue = Math.min(totalSpend / bonus.spendCap, 1) * bonus.bonusValue;
      totalBonusValue += earnedValue;
    } else if (bonus.type === "elite_earning" && bonus.unitValue && bonus.perSpend) {
      // Elite earning: earn units based on total spend
      const unitsEarned = totalSpend / bonus.perSpend;
      const cappedUnits = bonus.unitCap !== undefined ? Math.min(unitsEarned, bonus.unitCap) : unitsEarned;
      const earnedValue = cappedUnits * bonus.unitValue;
      totalBonusValue += earnedValue;
    }
  }

  return totalBonusValue;
}

// Format cap type for tooltip
function formatCapType(capType: string): string {
  switch (capType) {
    case "top_category":
      return "Only earns this rate if it's your top spending category";
    case "top_two_categories":
      return "Only earns this rate if it's in your top 2 spending categories";
    case "top_three_categories":
      return "Only earns this rate if it's in your top 3 spending categories";
    case "selected_category":
      return "Only earns this rate if you select this category";
    case "second_top_category":
      return "Only earns this rate if it's your 2nd highest spending category";
    default:
      return "";
  }
}

// Format cap period
function formatCapPeriod(period: string | null): string {
  switch (period) {
    case "month":
      return "/mo";
    case "quarter":
      return "/qtr";
    case "year":
      return "/yr";
    default:
      return "";
  }
}

export function ComparisonTable({
  cards,
  categories,
  defaultCategorySlugs,
  initialCategorySlugs,
  initialEvalCardIds,
  debitPayValues,
  userSpending,
  capInfo,
  biltHousingInfo = {},
  bonusDisplaySettings,
  availableCredit,
  creditLimits,
  accountLinkingEnabled,
  playerCount,
  players,
  onSaveCategories,
  onSaveEvalCards,
  onUpdateBonusSettings,
}: ComparisonTableProps) {
  // State
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(
    new Set(initialCategorySlugs)
  );
  const [filterMode, setFilterMode] = useState<FilterMode>(
    initialEvalCardIds.length > 0 ? "evaluate" : "my-cards"
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    type: "card",
    direction: "asc",
  });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showSpending, setShowSpending] = useState(false);
  const [evaluationCardIds, setEvaluationCardIds] = useState<Set<string>>(
    new Set(initialEvalCardIds)
  );
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState<"" | "personal" | "business">("");
  const [currencyTypeFilter, setCurrencyTypeFilter] = useState("");
  const [playerFilter, setPlayerFilter] = useState<number | "">("");
  
  // Preview modal state
  const [previewCard, setPreviewCard] = useState<CardPreviewData | null>(null);
  
  // Category order state - for custom column ordering (persisted to localStorage)
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return categories.map(c => c.slug);
    try {
      const stored = localStorage.getItem("compare-category-order");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Merge persisted order with any new categories
        const persistedSet = new Set(parsed);
        const allSlugs = categories.map(c => c.slug);
        const newCategories = allSlugs.filter(slug => !persistedSet.has(slug));
        return [...parsed.filter(slug => allSlugs.includes(slug)), ...newCategories];
      }
    } catch {
      // Ignore parse errors
    }
    return categories.map(c => c.slug);
  });
  
  // Drag state for category reordering
  
  // Persist category order to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("compare-category-order", JSON.stringify(categoryOrder));
    } catch {
      // Ignore storage errors
    }
  }, [categoryOrder]);
  
  // Local state for bonus toggles (optimistic updates)
  const [includeWelcomeBonuses, setIncludeWelcomeBonuses] = useState(bonusDisplaySettings.includeWelcomeBonuses);
  const [includeSpendBonuses, setIncludeSpendBonuses] = useState(bonusDisplaySettings.includeSpendBonuses);
  const [includeDebitPay, setIncludeDebitPay] = useState(bonusDisplaySettings.includeDebitPay);
  const [showAvailableCredit, setShowAvailableCredit] = useState(bonusDisplaySettings.showAvailableCredit);

  // Check if any cards have bonuses configured (only show toggles if there are bonuses)
  const hasAnySubs = useMemo(() => cards.some((c) => c.welcomeBonusRate > 0), [cards]);
  const hasAnySpendBonuses = useMemo(() => cards.some((c) => c.spendBonusRate > 0), [cards]);
  // Check if any cards have debit pay configured
  const hasAnyDebitPay = useMemo(() => Object.keys(debitPayValues).length > 0, [debitPayValues]);
  // Check if any cards have available credit data (linked AND paired)
  const hasAnyAvailableCredit = useMemo(() => Object.keys(availableCredit).length > 0, [availableCredit]);

  // Track if this is the initial mount (to avoid saving on first render)
  const isInitialMount = useRef(true);
  const categoriesInitialMount = useRef(true);

  // Debounced save for categories
  useEffect(() => {
    if (categoriesInitialMount.current) {
      categoriesInitialMount.current = false;
      return;
    }
    
    const categoryIds = categories
      .filter((cat) => selectedCategorySlugs.has(cat.slug))
      .map((cat) => cat.id);
    
    const timeout = setTimeout(() => {
      onSaveCategories?.(categoryIds);
    }, 500);
    return () => clearTimeout(timeout);
  }, [selectedCategorySlugs, categories, onSaveCategories]);

  // Debounced save for evaluation cards
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const timeout = setTimeout(() => {
      onSaveEvalCards?.(Array.from(evaluationCardIds));
    }, 500);
    return () => clearTimeout(timeout);
  }, [evaluationCardIds, onSaveEvalCards]);

  // Selected categories in custom order
  const selectedCategories = useMemo(() => {
    // Create a map for quick category lookup
    const categoryMap = new Map(categories.map(c => [c.slug, c]));
    // Return categories in the custom order, filtering to only selected ones
    return categoryOrder
      .map(slug => categoryMap.get(slug))
      .filter((cat): cat is Category => cat != null && selectedCategorySlugs.has(cat.slug));
  }, [categories, selectedCategorySlugs, categoryOrder]);
  
  // All categories in custom order (for the dropdown)
  const orderedCategories = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.slug, c]));
    return categoryOrder
      .map(slug => categoryMap.get(slug))
      .filter((cat): cat is Category => cat != null);
  }, [categories, categoryOrder]);

  // Calculate effective value for a card and category (rate in cents)
  // Includes bonus rates if enabled (converted from decimal to cents)
  const getEffectiveValue = (card: Card, categoryId: number): number => {
    const rate = card.earningRates[categoryId] ?? card.defaultEarnRate;
    let value = rate * card.pointValue;
    
    // Add bonus rates (they're stored as decimals representing return rate, convert to cents)
    // e.g., 0.01 = 1% = 1 cent per dollar
    if (includeSpendBonuses && card.spendBonusRate > 0) {
      value += card.spendBonusRate * 100; // Convert decimal to cents
    }
    if (includeWelcomeBonuses && card.welcomeBonusRate > 0) {
      value += card.welcomeBonusRate * 100; // Convert decimal to cents
    }
    
    return value;
  };

  // Calculate effective value including debit pay (for display and sorting)
  const getEffectiveValueWithDebit = (card: Card, categoryId: number): number => {
    const baseValue = getEffectiveValue(card, categoryId);
    // Only include debit pay if toggle is on
    // Use card.id (wallet_id for owned cards) for debit pay lookup since it's now per-instance
    const debitPay = includeDebitPay ? (debitPayValues[card.id] ?? 0) : 0;
    // Debit pay is a percentage, convert to cents (1% = 1 cent per dollar)
    return baseValue + debitPay;
  };

  // Get the bonus rates in cents for a card (for display purposes)
  const getBonusValueCents = (card: Card): { subCents: number; spendBonusCents: number } => {
    const subCents = includeWelcomeBonuses && card.welcomeBonusRate > 0 ? card.welcomeBonusRate * 100 : 0;
    const spendBonusCents = includeSpendBonuses && card.spendBonusRate > 0 ? card.spendBonusRate * 100 : 0;
    return { subCents, spendBonusCents };
  };

  // Calculate total spend per card across all selected categories (for bonus capping)
  const cardTotalSpend = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const card of cards) {
      let totalSpend = 0;
      for (const category of selectedCategories) {
        const spendCents = userSpending[category.id] ?? 0;
        totalSpend += spendCents / 100; // Convert to dollars
      }
      totals[card.id] = totalSpend;
    }
    return totals;
  }, [cards, selectedCategories, userSpending]);

  // Calculate properly-capped bonus values per card
  const cardCappedBonusValues = useMemo(() => {
    const values: Record<string, { welcomeBonus: number; spendBonus: number }> = {};
    for (const card of cards) {
      const totalSpend = cardTotalSpend[card.id] ?? 0;
      const welcomeBonus = includeWelcomeBonuses && card.welcomeBonuses.length > 0
        ? calculateBonusValueFromSpend(totalSpend, card.welcomeBonuses)
        : 0;
      const spendBonus = includeSpendBonuses && card.spendBonuses.length > 0
        ? calculateBonusValueFromSpend(totalSpend, card.spendBonuses)
        : 0;
      values[card.id] = { welcomeBonus, spendBonus };
    }
    return values;
  }, [cards, cardTotalSpend, includeWelcomeBonuses, includeSpendBonuses]);

  // Helper to annualize cap amount based on period
  const annualizeCap = (amount: number, period: string | null): number => {
    switch (period) {
      case "month": return amount * 12;
      case "quarter": return amount * 4;
      case "year": return amount;
      default: return amount; // Assume annual if not specified
    }
  };

  // Calculate earnings for a spend amount considering caps
  // Bonus earnings are distributed proportionally based on category spend / total card spend
  const calculateEarnings = (card: Card, categoryId: number, spendCents: number): { earnings: number; debitPayEarnings: number; subEarnings: number; spendBonusEarnings: number } => {
    const rate = card.earningRates[categoryId] ?? card.defaultEarnRate;
    const pointValue = card.pointValue;
    // Check for category-specific cap, fall back to all_categories cap (stored under ID 0)
    const cap = capInfo[card.cardId]?.[categoryId] ?? capInfo[card.cardId]?.[0];
    // Only include debit pay if toggle is on
    // Use card.id (wallet_id for owned cards) for debit pay lookup since it's now per-instance
    const debitPayPercent = includeDebitPay ? (debitPayValues[card.id] ?? 0) : 0;
    const spendDollars = spendCents / 100;
    
    let earnings: number;
    
    if (cap && cap.capAmount) {
      // Annualize the cap for comparison with annual spending
      const annualCapAmount = annualizeCap(cap.capAmount, cap.capPeriod);
      
      if (spendDollars > annualCapAmount) {
        // Spend exceeds annual cap - blend elevated and post-cap rates
        const elevatedEarnings = annualCapAmount * cap.elevatedRate * (pointValue / 100);
        const postCapRate = cap.postCapRate ?? card.defaultEarnRate;
        const postCapEarnings = (spendDollars - annualCapAmount) * postCapRate * (pointValue / 100);
        earnings = elevatedEarnings + postCapEarnings;
      } else {
        // All spend within cap at elevated rate
        earnings = spendDollars * cap.elevatedRate * (pointValue / 100);
      }
    } else {
      // No cap - use the card's rate for this category
      earnings = spendDollars * rate * (pointValue / 100);
    }
    
    // Debit pay earnings (flat % of spend)
    const debitPayEarnings = spendDollars * (debitPayPercent / 100);
    
    // Calculate bonus earnings as proportional share of the properly-capped card total
    // This ensures bonuses are capped at their spend requirement, not applied to all spend
    const totalSpend = cardTotalSpend[card.id] ?? 0;
    const spendProportion = totalSpend > 0 ? spendDollars / totalSpend : 0;
    
    const cappedBonuses = cardCappedBonusValues[card.id] ?? { welcomeBonus: 0, spendBonus: 0 };
    const subEarnings = spendProportion * cappedBonuses.welcomeBonus;
    const spendBonusEarnings = spendProportion * cappedBonuses.spendBonus;
    
    return { earnings, debitPayEarnings, subEarnings, spendBonusEarnings };
  };

  // Get min/max values per category for color scaling (rate-based, for non-spending view)
  const categoryRateStats = useMemo(() => {
    const stats: Record<number, { min: number; max: number }> = {};

    for (const category of selectedCategories) {
      const values = cards.map((card) => getEffectiveValueWithDebit(card, category.id));
      stats[category.id] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
    return stats;
  }, [cards, selectedCategories, debitPayValues, includeSpendBonuses, includeWelcomeBonuses, includeDebitPay]);

  // Get min/max earnings per category for color scaling (earnings-based, for spending view)
  const categoryEarningsStats = useMemo(() => {
    const stats: Record<number, { min: number; max: number }> = {};

    for (const category of selectedCategories) {
      const spendCents = userSpending[category.id] ?? 0;
      if (spendCents > 0) {
        const values = cards.map((card) => {
          const { earnings, debitPayEarnings, subEarnings, spendBonusEarnings } = calculateEarnings(card, category.id, spendCents);
          return earnings + debitPayEarnings + subEarnings + spendBonusEarnings;
        });
        stats[category.id] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    }
    return stats;
  }, [cards, selectedCategories, userSpending, debitPayValues, includeSpendBonuses, includeWelcomeBonuses, includeDebitPay]);

  // Get color class based on value position in range
  const getColorStyle = (value: number, categoryId: number, useEarnings: boolean = false): string => {
    const stats = useEarnings ? categoryEarningsStats[categoryId] : categoryRateStats[categoryId];
    if (!stats || stats.min === stats.max) {
      return "text-zinc-400";
    }

    const position = (value - stats.min) / (stats.max - stats.min);
    
    if (position >= 0.9) {
      return "bg-emerald-500/40 text-emerald-200";
    } else if (position >= 0.7) {
      return "bg-emerald-500/25 text-emerald-300";
    } else if (position >= 0.5) {
      return "bg-emerald-500/15 text-emerald-400";
    } else if (position >= 0.3) {
      return "bg-emerald-500/8 text-zinc-300";
    } else {
      return "text-zinc-400";
    }
  };

  // Get unique filter options from all cards
  const { uniqueBrands, uniqueCurrencyTypes } = useMemo(() => {
    const brands = new Set<string>();
    const currencyTypes = new Set<string>();
    cards.forEach((c) => {
      if (c.brandName) brands.add(c.brandName);
      if (c.currencyType) currencyTypes.add(c.currencyType);
    });
    return {
      uniqueBrands: Array.from(brands).sort(),
      uniqueCurrencyTypes: Array.from(currencyTypes).sort(),
    };
  }, [cards]);

  // Currency type labels for filter dropdown
  const currencyTypeLabels: Record<string, string> = {
    airline_miles: "Airline Miles",
    hotel_points: "Hotel Points",
    transferable_points: "Transferable Points",
    non_transferable_points: "Non-Transferable Points",
    cash_back: "Cash Back",
    crypto: "Crypto",
    other: "Other",
  };

  // Cards available for evaluation (not owned)
  const cardsForEvaluation = useMemo(() => {
    return cards.filter((c) => !c.isOwned);
  }, [cards]);

  // Filtered cards for evaluation selector
  const filteredEvaluationCards = useMemo(() => {
    if (!cardSearchQuery.trim()) return cardsForEvaluation;
    const query = cardSearchQuery.toLowerCase();
    return cardsForEvaluation.filter(
      (c) => c.name.toLowerCase().includes(query) || c.issuerName.toLowerCase().includes(query)
    );
  }, [cardsForEvaluation, cardSearchQuery]);

  // Sort and filter cards
  const sortedCards = useMemo(() => {
    let filtered: Card[];
    
    // First apply mode filter (my-cards, evaluate, all)
    if (filterMode === "my-cards") {
      filtered = cards.filter((c) => c.isOwned);
    } else if (filterMode === "evaluate") {
      filtered = cards.filter((c) => c.isOwned || evaluationCardIds.has(c.id));
    } else {
      filtered = [...cards];
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(query) || c.issuerName.toLowerCase().includes(query)
      );
    }
    
    // Apply brand filter
    if (brandFilter) {
      filtered = filtered.filter((c) => c.brandName === brandFilter);
    }
    
    // Apply product type filter
    if (productTypeFilter) {
      filtered = filtered.filter((c) => c.productType === productTypeFilter);
    }
    
    // Apply currency type filter
    if (currencyTypeFilter) {
      filtered = filtered.filter((c) => c.currencyType === currencyTypeFilter);
    }
    
    // Apply player filter (only for owned cards)
    if (playerFilter !== "") {
      filtered = filtered.filter((c) => !c.isOwned || c.playerNumber === playerFilter);
    }

    filtered.sort((a, b) => {
      if (sortConfig.type === "card") {
        const cmp = a.name.localeCompare(b.name);
        return sortConfig.direction === "asc" ? cmp : -cmp;
      } else if (sortConfig.categoryId !== undefined) {
        const spendCents = userSpending[sortConfig.categoryId] ?? 0;
        const isHousingCategory = HOUSING_CATEGORY_IDS.includes(sortConfig.categoryId);
        
        // Calculate Bilt Housing Points bonus for sorting
        const getBiltSortBonus = (card: Card): number => {
          const biltInfo = biltHousingInfo[card.cardId];
          if (!biltInfo || isHousingCategory || biltInfo.housingSpendCents === 0) return 0;
          return biltInfo.tierRate * card.pointValue;
        };
        
        // Only sort by earnings if there's actual spending; otherwise sort by rate
        let aVal: number;
        let bVal: number;
        if (showSpending && spendCents > 0) {
          const aEarnings = calculateEarnings(a, sortConfig.categoryId, spendCents);
          const bEarnings = calculateEarnings(b, sortConfig.categoryId, spendCents);
          
          // Add Bilt Housing Points earnings for spending view
          const aBiltInfo = biltHousingInfo[a.cardId];
          const bBiltInfo = biltHousingInfo[b.cardId];
          const aBiltEarnings = (aBiltInfo && !isHousingCategory && aBiltInfo.housingSpendCents > 0)
            ? (Math.min(spendCents, aBiltInfo.capSpendCents) / 100) * aBiltInfo.tierRate * a.pointValue
            : 0;
          const bBiltEarnings = (bBiltInfo && !isHousingCategory && bBiltInfo.housingSpendCents > 0)
            ? (Math.min(spendCents, bBiltInfo.capSpendCents) / 100) * bBiltInfo.tierRate * b.pointValue
            : 0;
          
          aVal = aEarnings.earnings + aEarnings.debitPayEarnings + aEarnings.subEarnings + aEarnings.spendBonusEarnings + aBiltEarnings;
          bVal = bEarnings.earnings + bEarnings.debitPayEarnings + bEarnings.subEarnings + bEarnings.spendBonusEarnings + bBiltEarnings;
        } else {
          aVal = getEffectiveValueWithDebit(a, sortConfig.categoryId) + getBiltSortBonus(a);
          bVal = getEffectiveValueWithDebit(b, sortConfig.categoryId) + getBiltSortBonus(b);
        }
        const cmp = aVal - bVal;
        const primarySort = sortConfig.direction === "asc" ? cmp : -cmp;
        
        // Secondary sort: when values are equal, owned cards come first
        if (primarySort === 0) {
          if (a.isOwned && !b.isOwned) return -1;
          if (!a.isOwned && b.isOwned) return 1;
          // If both owned or both not owned, sort by name
          return a.name.localeCompare(b.name);
        }
        return primarySort;
      }
      return 0;
    });

    return filtered;
  }, [cards, filterMode, sortConfig, evaluationCardIds, showSpending, userSpending, includeSpendBonuses, includeWelcomeBonuses, includeDebitPay, searchQuery, brandFilter, productTypeFilter, currencyTypeFilter, playerFilter, biltHousingInfo]);

  // Handle sort click
  const handleSort = (type: "card" | "category", categoryId?: number) => {
    if (sortConfig.type === type && sortConfig.categoryId === categoryId) {
      setSortConfig({
        ...sortConfig,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({
        type,
        categoryId,
        direction: type === "category" ? "desc" : "asc",
      });
    }
  };

  // Sort indicator
  const SortIndicator = ({ active, direction }: { active: boolean; direction: "asc" | "desc" }) => {
    if (!active) return null;
    return (
      <svg className="w-4 h-4 ml-1 text-blue-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === "asc" ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  // Toggle category selection
  const toggleCategory = (slug: string) => {
    const newSelected = new Set(selectedCategorySlugs);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedCategorySlugs(newSelected);
  };

  // Toggle evaluation card
  const toggleEvaluationCard = (cardId: string) => {
    const newSelected = new Set(evaluationCardIds);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setEvaluationCardIds(newSelected);
  };

  // Category selection helpers
  const selectAllCategories = () => setSelectedCategorySlugs(new Set(categories.map((c) => c.slug)));
  const clearCategories = () => setSelectedCategorySlugs(new Set());
  const resetToDefaults = () => {
    setSelectedCategorySlugs(new Set(defaultCategorySlugs));
    setCategoryOrder(categories.map(c => c.slug)); // Reset order too
  };
  
  // Category drag handlers for reordering (using IDs instead of indices)
  const [categoryDragSlug, setCategoryDragSlug] = useState<string | null>(null);
  
  const handleCategoryDragStart = useCallback((slug: string) => {
    setCategoryDragSlug(slug);
  }, []);
  
  const handleCategoryDragOver = useCallback((targetSlug: string) => {
    if (categoryDragSlug === null || categoryDragSlug === targetSlug) return;
    
    setCategoryOrder(prev => {
      const newOrder = [...prev];
      const dragIndex = newOrder.indexOf(categoryDragSlug);
      const targetIndex = newOrder.indexOf(targetSlug);
      
      if (dragIndex === -1 || targetIndex === -1) return prev;
      
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);
      return newOrder;
    });
  }, [categoryDragSlug]);
  
  const handleCategoryDragEnd = useCallback(() => {
    setCategoryDragSlug(null);
  }, []);

  // Format currency
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || brandFilter || productTypeFilter || currencyTypeFilter || playerFilter !== "";

  // Helper to open card preview modal
  const openCardPreview = useCallback((card: Card) => {
    setPreviewCard({
      card: {
        id: card.cardId,
        name: card.name,
        slug: card.slug,
        annual_fee: card.annualFee,
        default_earn_rate: card.defaultEarnRate,
        issuer_name: card.issuerName,
        card_charge_type: card.chargeType,
      },
      primaryCurrency: card.primaryCurrency,
      earningRules: card.previewEarningRules,
      categoryBonuses: card.previewCategoryBonuses,
      credits: card.previewCredits,
      welcomeBonuses: [],
      isOwned: card.isOwned,
    });
  }, []);

  // Calculate card counts for each mode (respecting current filters)
  const filteredCardsBase = useMemo(() => {
    let filtered = [...cards];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => 
        c.name.toLowerCase().includes(query) || 
        c.issuerName.toLowerCase().includes(query)
      );
    }
    
    // Apply filters
    if (productTypeFilter) {
      filtered = filtered.filter((c) => c.productType === productTypeFilter);
    }
    if (brandFilter) {
      filtered = filtered.filter((c) => c.brandName === brandFilter);
    }
    if (currencyTypeFilter) {
      filtered = filtered.filter((c) => c.currencyType === currencyTypeFilter);
    }
    if (playerFilter !== "") {
      filtered = filtered.filter((c) => !c.isOwned || c.playerNumber === playerFilter);
    }
    
    return filtered;
  }, [cards, searchQuery, productTypeFilter, brandFilter, currencyTypeFilter, playerFilter]);

  const allCardsCount = filteredCardsBase.length;
  const myCardsCount = filteredCardsBase.filter((c) => c.isOwned).length;
  const evaluateCardsCount = filteredCardsBase.filter((c) => c.isOwned || evaluationCardIds.has(c.id)).length;

  return (
    <div className="space-y-4">
      {/* Controls - Row 1: Mode Toggle, My Spending, Checkboxes */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filter Toggle */}
        <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filterMode === "all"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            All Cards ({allCardsCount})
          </button>
          <button
            onClick={() => setFilterMode("my-cards")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filterMode === "my-cards"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            My Cards ({myCardsCount})
          </button>
          <button
            onClick={() => setFilterMode("evaluate")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filterMode === "evaluate"
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Evaluate ({evaluateCardsCount})
          </button>
        </div>

        {/* Evaluation Card Selector - Only show in evaluate mode */}
        {filterMode === "evaluate" && (
          <div className="relative">
            <button
              onClick={() => setShowCardSelector(!showCardSelector)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-700/50 bg-amber-950/30 text-sm text-amber-300 hover:border-amber-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Cards to Compare</span>
            </button>

            {showCardSelector && (
              <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-[9999] flex flex-col">
                <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-2">
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={cardSearchQuery}
                    onChange={(e) => setCardSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    autoFocus
                  />
                  {evaluationCardIds.size > 0 && (
                    <button
                      onClick={() => setEvaluationCardIds(new Set())}
                      className="mt-2 w-full px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    >
                      Clear all ({evaluationCardIds.size} selected)
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                  {filteredEvaluationCards.map((card) => (
                    <label
                      key={card.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={evaluationCardIds.has(card.id)}
                        onChange={() => toggleEvaluationCard(card.id)}
                        className="rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-zinc-300">{card.name}</div>
                        <div className="text-xs text-zinc-500">{card.issuerName}</div>
                      </div>
                    </label>
                  ))}
                  {filteredEvaluationCards.length === 0 && (
                    <div className="text-sm text-zinc-500 text-center py-4">
                      No cards found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Spending Toggle */}
        <button
          onClick={() => setShowSpending(!showSpending)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showSpending
              ? "border-violet-600 bg-violet-600 text-white"
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          My Spending
        </button>

        {/* Bonus Toggles - Only show if user has any bonuses configured */}
        {(hasAnySubs || hasAnySpendBonuses || hasAnyDebitPay || (accountLinkingEnabled && hasAnyAvailableCredit)) && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50">
            {hasAnySubs && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWelcomeBonuses}
                  disabled={isPending}
                  onChange={(e) => {
                    setIncludeWelcomeBonuses(e.target.checked);
                    startTransition(() => {
                      onUpdateBonusSettings?.(e.target.checked, includeSpendBonuses, includeDebitPay, showAvailableCredit);
                    });
                  }}
                  className="rounded border-zinc-600 bg-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                />
                <span className={`text-sm ${includeWelcomeBonuses ? "text-cyan-400" : "text-zinc-300"}`}>SUBs</span>
              </label>
            )}
            {hasAnySpendBonuses && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSpendBonuses}
                  disabled={isPending}
                  onChange={(e) => {
                    setIncludeSpendBonuses(e.target.checked);
                    startTransition(() => {
                      onUpdateBonusSettings?.(includeWelcomeBonuses, e.target.checked, includeDebitPay, showAvailableCredit);
                    });
                  }}
                  className="rounded border-zinc-600 bg-zinc-700 text-lime-500 focus:ring-lime-500 focus:ring-offset-0"
                />
                <span className={`text-sm ${includeSpendBonuses ? "text-lime-400" : "text-zinc-300"}`}>Spend Bonuses</span>
              </label>
            )}
            {hasAnyDebitPay && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDebitPay}
                  disabled={isPending}
                  onChange={(e) => {
                    setIncludeDebitPay(e.target.checked);
                    startTransition(() => {
                      onUpdateBonusSettings?.(includeWelcomeBonuses, includeSpendBonuses, e.target.checked, showAvailableCredit);
                    });
                  }}
                  className="rounded border-zinc-600 bg-zinc-700 text-pink-500 focus:ring-pink-500 focus:ring-offset-0"
                />
                <span className={`text-sm ${includeDebitPay ? "text-pink-400" : "text-zinc-300"}`}>Debit Pay</span>
              </label>
            )}
            {accountLinkingEnabled && hasAnyAvailableCredit && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAvailableCredit}
                  disabled={isPending}
                  onChange={(e) => {
                    setShowAvailableCredit(e.target.checked);
                    startTransition(() => {
                      onUpdateBonusSettings?.(includeWelcomeBonuses, includeSpendBonuses, includeDebitPay, e.target.checked);
                    });
                  }}
                  className="rounded border-zinc-600 bg-zinc-700 text-zinc-300 focus:ring-zinc-500 focus:ring-offset-0"
                />
                <span className={`text-sm ${showAvailableCredit ? "text-zinc-200" : "text-zinc-400"}`}>Available Credit</span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Controls - Row 2: Filters and Categories */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Box */}
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none w-40"
        />

        {/* Filter Dropdowns */}
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
          {uniqueBrands.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        <select
          value={currencyTypeFilter}
          onChange={(e) => setCurrencyTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Currencies</option>
          {uniqueCurrencyTypes.map((type) => (
            <option key={type} value={type}>{currencyTypeLabels[type] ?? type}</option>
          ))}
        </select>

        {/* Player Filter - only show if multi-player */}
        {playerCount > 1 && (
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value === "" ? "" : parseInt(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Players</option>
            {Array.from({ length: playerCount }, (_, i) => i + 1).map((num) => {
              const player = players.find(p => p.player_number === num);
              return (
                <option key={num} value={num}>{player?.description ?? `P${num}`}</option>
              );
            })}
          </select>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery("");
              setBrandFilter("");
              setProductTypeFilter("");
              setCurrencyTypeFilter("");
              setPlayerFilter("");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
          >
            Clear filters
          </button>
        )}

        {/* Spacer to push Categories to the right */}
        <div className="flex-1" />

        {/* Category Selector */}
        <div className="relative">
          <button
            onClick={() => setShowCategorySelector(!showCategorySelector)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white hover:border-zinc-600 transition-colors"
          >
            <span>Categories ({selectedCategorySlugs.size})</span>
            <svg
              className={`w-4 h-4 transition-transform ${showCategorySelector ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCategorySelector && (
            <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-[9999]">
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-2 flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="flex-1 px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                >
                  All
                </button>
                <button
                  onClick={clearCategories}
                  className="flex-1 px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                >
                  None
                </button>
                <button
                  onClick={resetToDefaults}
                  className="flex-1 px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                >
                  Defaults
                </button>
              </div>
              <div className="p-1 text-[10px] text-zinc-500 text-center border-b border-zinc-800">
                Drag handles to reorder columns
              </div>
              <div className="p-2">
                {orderedCategories.map((cat) => {
                  const spendCents = userSpending[cat.id] ?? 0;
                  return (
                    <DraggableItem
                      key={cat.id}
                      id={cat.slug}
                      onDragStart={handleCategoryDragStart}
                      onDragOver={handleCategoryDragOver}
                      onDragEnd={handleCategoryDragEnd}
                    >
                      <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategorySlugs.has(cat.slug)}
                          onChange={() => toggleCategory(cat.slug)}
                          className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-zinc-300 flex-1">{cat.name}</span>
                        {spendCents > 0 && (
                          <span className="text-xs text-zinc-500 mr-2">{formatCurrency(spendCents)}</span>
                        )}
                        {/* Drag handle on the right */}
                        <span 
                          className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 shrink-0"
                          title="Drag to reorder"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </span>
                      </label>
                    </DraggableItem>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
                {/* Sticky Card Column Header - sticky both left AND top */}
                <th
                  onClick={() => handleSort("card")}
                  className={`sticky left-0 top-0 z-30 bg-zinc-800 px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap w-[220px] min-w-[220px] max-w-[220px] ${!showAvailableCredit ? "border-r border-zinc-700" : ""}`}
                  style={!showAvailableCredit ? { boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' } : undefined}
                >
                  <span className="inline-flex items-center">
                    Card
                    <SortIndicator
                      active={sortConfig.type === "card"}
                      direction={sortConfig.direction}
                    />
                  </span>
                </th>
                
                {/* Available Credit Column Header - sticky both left AND top */}
                {showAvailableCredit && (
                  <th className="sticky left-[220px] top-0 z-30 bg-zinc-800 px-3 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap min-w-[110px] border-r border-zinc-700" style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}>
                    Avail Credit
                  </th>
                )}
                
                {/* Category Headers - each individually sticky to top */}
                {selectedCategories.map((cat) => {
                  const spendCents = userSpending[cat.id] ?? 0;
                  return (
                    <th
                      key={cat.id}
                      onClick={() => handleSort("category", cat.id)}
                      className="sticky top-0 z-20 px-3 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white min-w-[100px] whitespace-nowrap bg-zinc-800"
                    >
                      <span className="inline-flex items-center justify-center">
                        {cat.name}
                        <SortIndicator
                          active={sortConfig.type === "category" && sortConfig.categoryId === cat.id}
                          direction={sortConfig.direction}
                        />
                      </span>
                      {showSpending && spendCents > 0 && (
                        <div className="text-violet-400 text-[10px] font-normal normal-case mt-0.5">
                          {formatCurrency(spendCents)}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sortedCards.map((card) => {
                // Only show evaluation styling when in evaluate mode
                const isEvaluating = filterMode === "evaluate" && !card.isOwned && evaluationCardIds.has(card.id);
                return (
                  <tr
                    key={card.id}
                    className={`hover:bg-zinc-800/30 ${isEvaluating ? "bg-amber-950/10" : ""}`}
                  >
                    {/* Sticky Card Info */}
                    <td 
                      className={`sticky left-0 z-20 px-4 py-3 w-[220px] min-w-[220px] max-w-[220px] ${!showAvailableCredit ? "border-r border-zinc-700" : ""} ${isEvaluating ? "bg-amber-950" : "bg-zinc-900"}`}
                      style={!showAvailableCredit ? { boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {card.isOwned && (
                          <Tooltip text="In your wallet">
                            <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                          </Tooltip>
                        )}
                        {isEvaluating && (
                          <Tooltip text="Evaluating">
                            <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                          </Tooltip>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-white text-sm truncate flex items-center gap-1">
                            <span className="truncate">{card.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCardPreview(card);
                              }}
                              className="shrink-0 p-0.5 text-zinc-500 hover:text-blue-400 transition-colors"
                              title="View card details"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Available Credit Cell - sticky */}
                    {showAvailableCredit && (
                      <td className={`sticky left-[220px] z-20 px-3 py-3 text-center text-sm font-mono min-w-[110px] border-r border-zinc-700 ${isEvaluating ? "bg-amber-950" : "bg-zinc-900"}`} style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}>
                        {/* For owned cards, use card.id (wallet ID) since linking is by wallet instance */}
                        {availableCredit[card.id] != null ? (
                          (() => {
                            const credit = availableCredit[card.id];
                            const limit = creditLimits[card.id];
                            // Red if available credit <= 10% of limit
                            const isLow = limit != null && credit <= limit * 0.1;
                            return (
                              <span className={isLow ? "text-red-400" : "text-zinc-300"}>
                                ${Math.round(credit).toLocaleString()}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    )}

                    {/* Category Values */}
                    {selectedCategories.map((cat) => {
                      // Only show debit pay if toggle is on
                      // Use card.id (wallet_id for owned cards) for debit pay lookup since it's now per-instance
                      const debitPay = includeDebitPay ? (debitPayValues[card.id] ?? 0) : 0;
                      // Check for category-specific cap, fall back to all_categories cap (stored under ID 0)
                      const cap = capInfo[card.cardId]?.[cat.id] ?? capInfo[card.cardId]?.[0];
                      const spendCents = userSpending[cat.id] ?? 0;
                      const { subCents, spendBonusCents } = getBonusValueCents(card);
                      
                      if (showSpending && spendCents > 0) {
                        // Show earnings in dollars
                        const { earnings, debitPayEarnings, subEarnings, spendBonusEarnings } = calculateEarnings(card, cat.id, spendCents);
                        
                        // Check for Bilt Housing Points bonus (for non-housing categories on Bilt cards)
                        const biltInfoSpend = biltHousingInfo[card.cardId];
                        const isHousingCategorySpend = HOUSING_CATEGORY_IDS.includes(cat.id);
                        const hasBiltHousingBonusSpend = biltInfoSpend && !isHousingCategorySpend && biltInfoSpend.housingSpendCents > 0;
                        
                        // Calculate Bilt Housing Points earnings (capped by the spending cap)
                        let biltHousingEarnings = 0;
                        if (hasBiltHousingBonusSpend) {
                          // Housing Points are earned at tierRate on spend up to capSpendCents
                          const cappedSpend = Math.min(spendCents, biltInfoSpend.capSpendCents);
                          const biltPointsRate = biltInfoSpend.tierRate;
                          biltHousingEarnings = (cappedSpend / 100) * biltPointsRate * card.pointValue;
                        }
                        
                        const totalEarnings = earnings + debitPayEarnings + subEarnings + spendBonusEarnings + biltHousingEarnings;
                        const colorClass = getColorStyle(totalEarnings, cat.id, true);
                        const hasBreakdown = subEarnings > 0 || spendBonusEarnings > 0 || debitPayEarnings > 0 || biltHousingEarnings > 0;
                        
                        // Build individual bonus lines with names
                        const bonusLinesSpend: { name: string; value: number }[] = [];
                        if (subEarnings > 0 && card.welcomeBonuses.length > 0) {
                          for (const wb of card.welcomeBonuses) {
                            const totalWelcome = cardCappedBonusValues[card.id]?.welcomeBonus ?? 0;
                            if (totalWelcome > 0) {
                              const proportion = (wb.bonusValue / card.welcomeBonuses.reduce((s, b) => s + b.bonusValue, 0)) || 1 / card.welcomeBonuses.length;
                              bonusLinesSpend.push({ name: wb.name, value: subEarnings * proportion });
                            }
                          }
                        }
                        if (spendBonusEarnings > 0 && card.spendBonuses.length > 0) {
                          for (const sb of card.spendBonuses) {
                            bonusLinesSpend.push({ name: sb.name, value: spendBonusEarnings / card.spendBonuses.length });
                          }
                        }
                        
                        // Format cap amount for Bilt Housing Points tooltip
                        const formatBiltCapSpend = (cents: number) => {
                          const dollars = Math.round(cents / 100);
                          return `$${dollars.toLocaleString()}`;
                        };
                        
                        const breakdownContent = hasBreakdown ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-zinc-400">Base: ${Math.round(earnings).toLocaleString()}</span>
                            {biltHousingEarnings > 0 && (
                              <span className="text-zinc-400">Housing Points: +${Math.round(biltHousingEarnings).toLocaleString()}</span>
                            )}
                            {bonusLinesSpend.map((line, idx) => (
                              <span key={idx} className="text-zinc-400">{line.name}: +${Math.round(line.value).toLocaleString()}</span>
                            ))}
                            {debitPayEarnings > 0 && <span className="text-zinc-400">Debit Pay: +${Math.round(debitPayEarnings).toLocaleString()}</span>}
                            <span className="text-emerald-400 font-semibold border-t border-zinc-600 pt-0.5 mt-0.5">Total: ${Math.round(totalEarnings).toLocaleString()}</span>
                          </div>
                        ) : null;
                        
                        // Build tooltip text for amber cross
                        const biltCapTextSpend = hasBiltHousingBonusSpend
                          ? (biltInfoSpend.option === 1 
                              ? `Housing Points only earned up to ${formatBiltCapSpend(biltInfoSpend.capSpendCents)} spend/year`
                              : `Housing Points only earned on up to ${formatBiltCapSpend(biltInfoSpend.capSpendCents)} spend/year`)
                          : null;
                        const capTextSpend = cap 
                          ? `${cap.capAmount ? `Capped at $${cap.capAmount.toLocaleString()}${formatCapPeriod(cap.capPeriod)}` : ""}${cap.capAmount && formatCapType(cap.capType) ? " • " : ""}${formatCapType(cap.capType)}`
                          : null;
                        const combinedCapTextSpend = [biltCapTextSpend, capTextSpend].filter(Boolean).join("\n");
                        const showAmberCrossSpend = cap || hasBiltHousingBonusSpend;
                        
                        return (
                          <td
                            key={cat.id}
                            className={`px-3 py-3 text-center text-sm ${colorClass}`}
                          >
                            <span className="font-mono inline-flex items-center justify-center">
                              {hasBreakdown ? (
                                <RichTooltip content={breakdownContent}>
                                  <span className="border-b border-dotted border-current">${Math.round(totalEarnings).toLocaleString()}</span>
                                </RichTooltip>
                              ) : (
                                <span>${Math.round(earnings).toLocaleString()}</span>
                              )}
                              {showAmberCrossSpend && (
                                <Tooltip text={combinedCapTextSpend}>
                                  <span className="text-amber-500 cursor-help ml-0.5">†</span>
                                </Tooltip>
                              )}
                            </span>
                          </td>
                        );
                      } else {
                        // Show rate in cents (excluding bonuses in the base display, but include in value for sorting)
                        // Get base value without bonuses for display
                        const rate = card.earningRates[cat.id] ?? card.defaultEarnRate;
                        const baseValue = rate * card.pointValue;
                        
                        // Check for Bilt Housing Points bonus (for non-housing categories on Bilt cards)
                        const biltInfo = biltHousingInfo[card.cardId];
                        const isHousingCategory = HOUSING_CATEGORY_IDS.includes(cat.id);
                        const hasBiltHousingBonus = biltInfo && !isHousingCategory && biltInfo.housingSpendCents > 0;
                        const biltHousingValue = hasBiltHousingBonus ? biltInfo.tierRate * card.pointValue : 0;
                        
                        // Total value includes Bilt Housing Points if applicable
                        const totalValue = getEffectiveValueWithDebit(card, cat.id) + biltHousingValue;
                        const colorClass = getColorStyle(totalValue, cat.id);
                        const hasBreakdown = subCents > 0 || spendBonusCents > 0 || debitPay > 0 || hasBiltHousingBonus;
                        
                        // Build individual bonus lines with names
                        const bonusLines: { name: string; value: number }[] = [];
                        if (subCents > 0 && card.welcomeBonuses.length > 0) {
                          for (const wb of card.welcomeBonuses) {
                            // Calculate proportional value for this bonus
                            const totalWelcome = cardCappedBonusValues[card.id]?.welcomeBonus ?? 0;
                            if (totalWelcome > 0) {
                              const proportion = (wb.bonusValue / card.welcomeBonuses.reduce((s, b) => s + b.bonusValue, 0)) || 1 / card.welcomeBonuses.length;
                              bonusLines.push({ name: wb.name, value: subCents * proportion });
                            }
                          }
                        }
                        if (spendBonusCents > 0 && card.spendBonuses.length > 0) {
                          for (const sb of card.spendBonuses) {
                            // For simplicity, divide evenly if multiple
                            bonusLines.push({ name: sb.name, value: spendBonusCents / card.spendBonuses.length });
                          }
                        }
                        
                        // Format cap amount for Bilt Housing Points tooltip
                        const formatBiltCap = (cents: number) => {
                          const dollars = Math.round(cents / 100);
                          return `$${dollars.toLocaleString()}`;
                        };
                        
                        const breakdownContent = hasBreakdown ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-zinc-400">Base: {baseValue.toFixed(2)}¢</span>
                            {hasBiltHousingBonus && (
                              <span className="text-zinc-400">Housing Points: +{biltHousingValue.toFixed(2)}¢</span>
                            )}
                            {bonusLines.map((line, idx) => (
                              <span key={idx} className="text-zinc-400">{line.name}: +{line.value.toFixed(2)}¢</span>
                            ))}
                            {debitPay > 0 && <span className="text-zinc-400">Debit Pay: +{debitPay.toFixed(2)}¢</span>}
                            <span className="text-emerald-400 font-semibold border-t border-zinc-600 pt-0.5 mt-0.5">Total: {totalValue.toFixed(2)}¢</span>
                          </div>
                        ) : null;
                        
                        // Build tooltip text for amber cross
                        const biltCapText = hasBiltHousingBonus
                          ? (biltInfo.option === 1 
                              ? `Housing Points only earned up to ${formatBiltCap(biltInfo.capSpendCents)} spend/year`
                              : `Housing Points only earned on up to ${formatBiltCap(biltInfo.capSpendCents)} spend/year`)
                          : null;
                        const capText = cap 
                          ? `${cap.capAmount ? `Capped at $${cap.capAmount.toLocaleString()}${formatCapPeriod(cap.capPeriod)}` : ""}${cap.capAmount && formatCapType(cap.capType) ? " • " : ""}${formatCapType(cap.capType)}`
                          : null;
                        const combinedCapText = [biltCapText, capText].filter(Boolean).join("\n");
                        const showAmberCross = cap || hasBiltHousingBonus;
                        
                        return (
                          <td
                            key={cat.id}
                            className={`px-3 py-3 text-center text-sm font-mono ${colorClass}`}
                          >
                            <span className="inline-flex items-center justify-center">
                              {hasBreakdown ? (
                                <RichTooltip content={breakdownContent}>
                                  <span className="border-b border-dotted border-current">{totalValue.toFixed(2)}¢</span>
                                </RichTooltip>
                              ) : (
                                <span>{baseValue.toFixed(2)}¢</span>
                              )}
                              {showAmberCross && (
                                <Tooltip text={combinedCapText}>
                                  <span className="text-amber-500 cursor-help ml-0.5">†</span>
                                </Tooltip>
                              )}
                            </span>
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-4 text-xs text-zinc-500">
        <span>Per-category scale:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-zinc-800" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500/40" />
          <span>High</span>
        </div>
        <span className="text-zinc-700">|</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Owned</span>
        </div>
        {filterMode === "evaluate" && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Evaluating</span>
          </div>
        )}
        {includeWelcomeBonuses && (
          <div className="flex items-center gap-1">
            <span className="text-cyan-400">+X¢</span>
            <span>SUBs</span>
          </div>
        )}
        {includeSpendBonuses && (
          <div className="flex items-center gap-1">
            <span className="text-lime-400">+X¢</span>
            <span>Spend Bonuses</span>
          </div>
        )}
        {includeDebitPay && Object.keys(debitPayValues).length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-pink-400">+X¢</span>
            <span>Debit pay</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-amber-500">†</span>
          <span>Has cap/condition</span>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showCategorySelector || showCardSelector) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowCategorySelector(false);
            setShowCardSelector(false);
          }}
        />
      )}

      {/* Card Preview Modal */}
      <CardPreviewModal
        isOpen={previewCard !== null}
        onClose={() => setPreviewCard(null)}
        data={previewCard}
      />
    </div>
  );
}
