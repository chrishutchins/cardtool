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

interface ComparisonTableProps {
  cards: Card[];
  categories: Category[];
  defaultCategorySlugs: string[];
}

type SortConfig = {
  type: "card" | "category";
  categoryId?: number;
  direction: "asc" | "desc";
};

type FilterMode = "all" | "my-cards";

export function ComparisonTable({
  cards,
  categories,
  defaultCategorySlugs,
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

  // Selected categories in order
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => selectedCategorySlugs.has(cat.slug));
  }, [categories, selectedCategorySlugs]);

  // Calculate effective value for a card and category
  const getEffectiveValue = (card: Card, categoryId: number): number => {
    const rate = card.earningRates[categoryId] ?? card.defaultEarnRate;
    return rate * card.pointValue;
  };

  // Get min/max values per category for color scaling
  const categoryStats = useMemo(() => {
    const stats: Record<number, { min: number; max: number }> = {};
    
    const filteredCards = filterMode === "my-cards" 
      ? cards.filter((c) => c.isOwned)
      : cards;

    for (const category of selectedCategories) {
      const values = filteredCards.map((card) => getEffectiveValue(card, category.id));
      stats[category.id] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
    return stats;
  }, [cards, selectedCategories, filterMode]);

  // Get color class based on value position in range
  const getColorStyle = (value: number, categoryId: number): string => {
    const stats = categoryStats[categoryId];
    if (!stats || stats.min === stats.max) {
      return "text-zinc-400";
    }

    const position = (value - stats.min) / (stats.max - stats.min);
    
    // Simple scale: neutral (low) -> green (high)
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

  // Sort and filter cards
  const sortedCards = useMemo(() => {
    let filtered = filterMode === "my-cards" 
      ? cards.filter((c) => c.isOwned)
      : [...cards];

    filtered.sort((a, b) => {
      if (sortConfig.type === "card") {
        const cmp = a.name.localeCompare(b.name);
        return sortConfig.direction === "asc" ? cmp : -cmp;
      } else if (sortConfig.categoryId !== undefined) {
        const aVal = getEffectiveValue(a, sortConfig.categoryId);
        const bVal = getEffectiveValue(b, sortConfig.categoryId);
        const cmp = aVal - bVal;
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });

    return filtered;
  }, [cards, filterMode, sortConfig]);

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
        direction: type === "category" ? "desc" : "asc", // Default to desc for values (highest first)
      });
    }
  };

  // Sort indicator
  const SortIndicator = ({ active, direction }: { active: boolean; direction: "asc" | "desc" }) => (
    <span className={`ml-1 ${active ? "text-blue-400" : "text-zinc-600"}`}>
      {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

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

  // Add all categories
  const selectAllCategories = () => {
    setSelectedCategorySlugs(new Set(categories.map((c) => c.slug)));
  };

  // Clear categories
  const clearCategories = () => {
    setSelectedCategorySlugs(new Set());
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSelectedCategorySlugs(new Set(defaultCategorySlugs));
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
        </div>

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
                {categories.map((cat) => (
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
                    <span className="text-sm text-zinc-300">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card count */}
        <span className="text-sm text-zinc-500">
          {sortedCards.length} cards
          {filterMode === "all" && ` (${cards.filter((c) => c.isOwned).length} owned)`}
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
                  className="sticky left-0 z-10 bg-zinc-800 px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white min-w-[280px] border-r border-zinc-700"
                >
                  Card
                  <SortIndicator
                    active={sortConfig.type === "card"}
                    direction={sortConfig.direction}
                  />
                </th>
                
                {/* Category Headers */}
                {selectedCategories.map((cat) => (
                  <th
                    key={cat.id}
                    onClick={() => handleSort("category", cat.id)}
                    className="px-3 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white min-w-[80px] whitespace-nowrap"
                  >
                    {cat.name}
                    <SortIndicator
                      active={sortConfig.type === "category" && sortConfig.categoryId === cat.id}
                      direction={sortConfig.direction}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sortedCards.map((card) => (
                <tr
                  key={card.id}
                  className={`hover:bg-zinc-800/30 ${
                    filterMode === "all" && card.isOwned
                      ? "bg-blue-950/20"
                      : ""
                  }`}
                >
                  {/* Sticky Card Info */}
                  <td className="sticky left-0 z-10 bg-zinc-900 px-4 py-3 border-r border-zinc-700">
                    <div className="flex items-center gap-2">
                      {filterMode === "all" && card.isOwned && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" title="In your wallet" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{card.name}</div>
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
                    const value = getEffectiveValue(card, cat.id);
                    const colorClass = getColorStyle(value, cat.id);
                    
                    return (
                      <td
                        key={cat.id}
                        className={`px-3 py-3 text-center text-sm font-mono ${colorClass}`}
                      >
                        {value.toFixed(1)}¢
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-xs text-zinc-500">
        <span>Per-category scale:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-zinc-800" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500/40" />
          <span>High</span>
        </div>
        {filterMode === "all" && (
          <>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>In your wallet</span>
            </div>
          </>
        )}
      </div>

      {/* Click outside to close category selector */}
      {showCategorySelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCategorySelector(false)}
        />
      )}
    </div>
  );
}

