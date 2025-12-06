"use client";

import { useState, useMemo } from "react";

interface Card {
  id: string;
  name: string;
  slug: string;
  annualFee: number;
  defaultEarnRate: number;
  issuerName: string;
  currencyCode: string;
  currencyName: string;
  pointValue: number;
  isOwned: boolean;
  earningRates: Record<number, number>;
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

interface ComparisonTableProps {
  cards: Card[];
  categories: Category[];
  defaultCategorySlugs: string[];
  debitPayValues: Record<string, number>;
  userSpending: Record<number, number>;
  capInfo: Record<string, Record<number, CapInfo>>;
}

type SortConfig = {
  type: "card" | "category";
  categoryId?: number;
  direction: "asc" | "desc";
};

type FilterMode = "all" | "my-cards" | "evaluate";

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
  debitPayValues,
  userSpending,
  capInfo,
}: ComparisonTableProps) {
  // State
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(
    new Set(defaultCategorySlugs)
  );
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    type: "card",
    direction: "asc",
  });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showSpending, setShowSpending] = useState(false);
  const [evaluationCardIds, setEvaluationCardIds] = useState<Set<string>>(new Set());
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState("");

  // Selected categories in order
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => selectedCategorySlugs.has(cat.slug));
  }, [categories, selectedCategorySlugs]);

  // Calculate effective value for a card and category (rate in cents)
  const getEffectiveValue = (card: Card, categoryId: number): number => {
    const rate = card.earningRates[categoryId] ?? card.defaultEarnRate;
    return rate * card.pointValue;
  };

  // Calculate effective value including debit pay (for display and sorting)
  const getEffectiveValueWithDebit = (card: Card, categoryId: number): number => {
    const baseValue = getEffectiveValue(card, categoryId);
    const debitPay = debitPayValues[card.id] ?? 0;
    // Debit pay is a percentage, convert to cents (1% = 1 cent per dollar)
    return baseValue + debitPay;
  };

  // Calculate earnings for a spend amount considering caps
  const calculateEarnings = (card: Card, categoryId: number, spendCents: number): { earnings: number; debitPayEarnings: number } => {
    const rate = card.earningRates[categoryId] ?? card.defaultEarnRate;
    const pointValue = card.pointValue;
    const cap = capInfo[card.id]?.[categoryId];
    const debitPayPercent = debitPayValues[card.id] ?? 0;
    const spendDollars = spendCents / 100;
    
    let earnings: number;
    
    if (cap && cap.capAmount && spendDollars > cap.capAmount) {
      // Spend exceeds cap - blend elevated and post-cap rates
      const elevatedEarnings = cap.capAmount * cap.elevatedRate * (pointValue / 100);
      const postCapRate = cap.postCapRate ?? card.defaultEarnRate;
      const postCapEarnings = (spendDollars - cap.capAmount) * postCapRate * (pointValue / 100);
      earnings = elevatedEarnings + postCapEarnings;
    } else {
      // All spend at elevated rate
      earnings = spendDollars * rate * (pointValue / 100);
    }
    
    // Debit pay earnings (flat % of spend)
    const debitPayEarnings = spendDollars * (debitPayPercent / 100);
    
    return { earnings, debitPayEarnings };
  };

  // Get min/max values per category for color scaling (always use all cards)
  const categoryStats = useMemo(() => {
    const stats: Record<number, { min: number; max: number }> = {};

    for (const category of selectedCategories) {
      const values = cards.map((card) => getEffectiveValueWithDebit(card, category.id));
      stats[category.id] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
    return stats;
  }, [cards, selectedCategories, debitPayValues]);

  // Get color class based on value position in range
  const getColorStyle = (value: number, categoryId: number): string => {
    const stats = categoryStats[categoryId];
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
    
    if (filterMode === "my-cards") {
      filtered = cards.filter((c) => c.isOwned);
    } else if (filterMode === "evaluate") {
      filtered = cards.filter((c) => c.isOwned || evaluationCardIds.has(c.id));
    } else {
      filtered = [...cards];
    }

    filtered.sort((a, b) => {
      if (sortConfig.type === "card") {
        const cmp = a.name.localeCompare(b.name);
        return sortConfig.direction === "asc" ? cmp : -cmp;
      } else if (sortConfig.categoryId !== undefined) {
        const spendCents = userSpending[sortConfig.categoryId] ?? 0;
        // Only sort by earnings if there's actual spending; otherwise sort by rate
        const aVal = showSpending && spendCents > 0
          ? calculateEarnings(a, sortConfig.categoryId, spendCents).earnings + calculateEarnings(a, sortConfig.categoryId, spendCents).debitPayEarnings
          : getEffectiveValueWithDebit(a, sortConfig.categoryId);
        const bVal = showSpending && spendCents > 0
          ? calculateEarnings(b, sortConfig.categoryId, spendCents).earnings + calculateEarnings(b, sortConfig.categoryId, spendCents).debitPayEarnings
          : getEffectiveValueWithDebit(b, sortConfig.categoryId);
        const cmp = aVal - bVal;
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });

    return filtered;
  }, [cards, filterMode, sortConfig, evaluationCardIds, showSpending, userSpending]);

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
  const resetToDefaults = () => setSelectedCategorySlugs(new Set(defaultCategorySlugs));

  // Format currency
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
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
            All Cards
          </button>
          <button
            onClick={() => setFilterMode("my-cards")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filterMode === "my-cards"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            My Cards
          </button>
          <button
            onClick={() => setFilterMode("evaluate")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filterMode === "evaluate"
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Evaluate
            {evaluationCardIds.size > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-amber-500/30">
                {evaluationCardIds.size}
              </span>
            )}
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
              <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50 flex flex-col">
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
            <div className="absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
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
              <div className="p-2 space-y-1">
                {categories.map((cat) => {
                  const spendCents = userSpending[cat.id] ?? 0;
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategorySlugs.has(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-zinc-300 flex-1">{cat.name}</span>
                      {spendCents > 0 && (
                        <span className="text-xs text-zinc-500">{formatCurrency(spendCents)}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card count */}
        <span className="text-sm text-zinc-500">
          {sortedCards.length} cards
          {filterMode === "all" && ` (${cards.filter((c) => c.isOwned).length} owned)`}
          {filterMode === "evaluate" && evaluationCardIds.size > 0 && ` (${evaluationCardIds.size} evaluating)`}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-800/50">
                {/* Sticky Card Column Header */}
                <th
                  onClick={() => handleSort("card")}
                  className="sticky left-0 z-10 bg-zinc-800 px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white border-r border-zinc-700 whitespace-nowrap"
                >
                  <span className="inline-flex items-center">
                    Card
                    <SortIndicator
                      active={sortConfig.type === "card"}
                      direction={sortConfig.direction}
                    />
                  </span>
                </th>
                
                {/* Category Headers */}
                {selectedCategories.map((cat) => {
                  const spendCents = userSpending[cat.id] ?? 0;
                  return (
                    <th
                      key={cat.id}
                      onClick={() => handleSort("category", cat.id)}
                      className="px-3 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white min-w-[100px] whitespace-nowrap"
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
                const isEvaluating = !card.isOwned && evaluationCardIds.has(card.id);
                return (
                  <tr
                    key={card.id}
                    className={`hover:bg-zinc-800/30 ${isEvaluating ? "bg-amber-950/10" : ""}`}
                  >
                    {/* Sticky Card Info */}
                    <td className={`sticky left-0 z-10 px-4 py-3 border-r border-zinc-700 ${isEvaluating ? "bg-amber-950" : "bg-zinc-900"}`}>
                      <div className="flex items-center gap-2">
                        {card.isOwned && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" title="In your wallet" />
                        )}
                        {isEvaluating && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" title="Evaluating" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-white">{card.name}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2">
                            <span>{card.issuerName}</span>
                            <span>·</span>
                            <span className="text-zinc-600">{card.currencyCode}</span>
                            <span>·</span>
                            <span className="text-zinc-600">
                              {card.annualFee > 0 ? `$${card.annualFee}` : "$0"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category Values */}
                    {selectedCategories.map((cat) => {
                      const debitPay = debitPayValues[card.id] ?? 0;
                      const cap = capInfo[card.id]?.[cat.id];
                      const spendCents = userSpending[cat.id] ?? 0;
                      
                      if (showSpending && spendCents > 0) {
                        // Show earnings in dollars
                        const { earnings, debitPayEarnings } = calculateEarnings(card, cat.id, spendCents);
                        const totalValue = getEffectiveValueWithDebit(card, cat.id);
                        const colorClass = getColorStyle(totalValue, cat.id);
                        
                        return (
                          <td
                            key={cat.id}
                            className={`px-3 py-3 text-center text-sm ${colorClass}`}
                          >
                            <div className="font-mono">
                              ${Math.round(earnings)}
                              {debitPayEarnings > 0 && (
                                <span className="text-pink-400"> +${Math.round(debitPayEarnings)}</span>
                              )}
                            </div>
                            {cap && (
                              <span 
                                className="text-amber-500 cursor-help ml-0.5"
                                title={`${cap.capAmount ? `Capped at $${cap.capAmount.toLocaleString()}${formatCapPeriod(cap.capPeriod)}` : ""}${cap.capAmount && formatCapType(cap.capType) ? " • " : ""}${formatCapType(cap.capType)}`}
                              >
                                †
                              </span>
                            )}
                          </td>
                        );
                      } else {
                        // Show rate in cents
                        const value = getEffectiveValue(card, cat.id);
                        const totalValue = getEffectiveValueWithDebit(card, cat.id);
                        const colorClass = getColorStyle(totalValue, cat.id);
                        
                        return (
                          <td
                            key={cat.id}
                            className={`px-3 py-3 text-center text-sm font-mono ${colorClass}`}
                          >
                            {value.toFixed(1)}¢
                            {debitPay > 0 && (
                              <span className="text-pink-400"> +{debitPay}¢</span>
                            )}
                            {cap && (
                              <span 
                                className="text-amber-500 cursor-help ml-0.5"
                                title={`${cap.capAmount ? `Capped at $${cap.capAmount.toLocaleString()}${formatCapPeriod(cap.capPeriod)}` : ""}${cap.capAmount && formatCapType(cap.capType) ? " • " : ""}${formatCapType(cap.capType)}`}
                              >
                                †
                              </span>
                            )}
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
        {Object.keys(debitPayValues).length > 0 && (
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
    </div>
  );
}
