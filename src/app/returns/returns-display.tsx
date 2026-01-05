"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortfolioReturns, EarningsGoal, CardRecommendation, CategoryAllocation, AllocationEntry, BonusDetail } from "@/lib/returns-calculator";
import { CardRecommendations } from "@/app/wallet/card-recommendations";

// Tooltip component for showing allocation breakdown on click/hover
function AllocationTooltip({ 
  alloc, 
  children 
}: { 
  alloc: AllocationEntry;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleClick = () => {
    if (!isOpen) justOpenedRef.current = true;
    setIsOpen(!isOpen);
  };

  // Calculate components for tooltip - use baseEarnedValue (NOT including debit pay)
  const basePercent = alloc.spend > 0 ? (alloc.baseEarnedValue / alloc.spend) * 100 : 0;
  const debitPayPercent = alloc.spend > 0 ? (alloc.debitPayBonus / alloc.spend) * 100 : 0;

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onClick={handleClick}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => !justOpenedRef.current && setIsOpen(false)}
        className="cursor-pointer border-b border-dotted border-zinc-500 hover:border-zinc-300"
      >
        {children}
      </span>
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl p-3 text-xs">
          <div className="font-semibold text-white mb-2 border-b border-zinc-600 pb-1">
            Earning Breakdown
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Base earning:</span>
              <span className="text-white">{basePercent.toFixed(2)}%</span>
            </div>
            {debitPayPercent > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Debit pay:</span>
                <span className="text-white">+{debitPayPercent.toFixed(2)}%</span>
              </div>
            )}
            {alloc.bonusDetails && alloc.bonusDetails.map((bonus, idx) => {
              const bonusPercent = alloc.spend > 0 ? (bonus.value / alloc.spend) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between">
                  <span className="text-zinc-400">{bonus.name}:</span>
                  <span className="text-white">+{bonusPercent.toFixed(2)}%</span>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-zinc-600 pt-1 mt-1">
              <span className="text-emerald-400 font-semibold">Total:</span>
              <span className="text-emerald-400 font-semibold">{alloc.effectiveRate.toFixed(2)}%</span>
            </div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-zinc-600" />
        </div>
      )}
    </span>
  );
}

// Format allocation rate with optional bonus indicator
function formatAllocationRate(alloc: AllocationEntry): { main: string; bonus: string | null } {
  // Base rate display
  const main = alloc.isCashback 
    ? formatRate(alloc.rate, "%")
    : formatRate(alloc.rate, "x");
  
  // Calculate additional value (debit pay + bonus) as percentage
  const additionalValue = alloc.debitPayBonus + alloc.bonusContribution;
  const additionalPercent = alloc.spend > 0 ? (additionalValue / alloc.spend) * 100 : 0;
  
  if (additionalPercent > 0.01) {
    return { main, bonus: `+${additionalPercent.toFixed(1)}%` };
  }
  return { main, bonus: null };
}

// Tooltip for Card Breakdown showing earning sources
function CardEarningsTooltip({ 
  card, 
  children 
}: { 
  card: {
    totalEarned: number;
    totalDebitPay: number;
    totalBonusValue: number;
    bonusDetails: BonusDetail[];
    isCashback: boolean;
  };
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleClick = () => {
    if (!isOpen) justOpenedRef.current = true;
    setIsOpen(!isOpen);
  };

  const hasExtras = card.totalDebitPay > 0 || card.totalBonusValue > 0;
  if (!hasExtras) return <>{children}</>;

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onClick={handleClick}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => !justOpenedRef.current && setIsOpen(false)}
        className="cursor-pointer border-b border-dotted border-zinc-500 hover:border-zinc-300"
      >
        {children}
      </span>
      {isOpen && (
        <div className="absolute z-50 bottom-full right-0 mb-2 w-52 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl p-3 text-xs">
          <div className="font-semibold text-white mb-2 border-b border-zinc-600 pb-1">
            Earning Sources
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Base earning:</span>
              <span className="text-white">
                {card.isCashback 
                  ? formatCurrency(card.totalEarned - card.totalDebitPay - card.totalBonusValue)
                  : formatNumber(card.totalEarned, 0) + " pts"
                }
              </span>
            </div>
            {card.totalDebitPay > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Debit pay:</span>
                <span className="text-white">+{formatCurrency(card.totalDebitPay)}</span>
              </div>
            )}
            {card.bonusDetails && card.bonusDetails.map((bonus, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-zinc-400">{bonus.name}:</span>
                <span className="text-white">+{formatCurrency(bonus.value)}</span>
              </div>
            ))}
          </div>
          <div className="absolute top-full right-4 -mt-px border-8 border-transparent border-t-zinc-600" />
        </div>
      )}
    </span>
  );
}

interface ReturnsDisplayProps {
  returns: PortfolioReturns;
  earningsGoal: EarningsGoal;
  recommendations?: CardRecommendation[];
}

// Display names for clarity in earnings breakdown
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  "all-travel": "Other Travel (excl. Flights, Hotels, Cars)",
  "online-retail": "Online Retail (excl. Amazon)",
  "entertainment": "Entertainment (excl. Streaming)",
  "foreign-currency": "Foreign Transactions",
};

// Category groupings for organized display (same as spending editor)
const CATEGORY_GROUPS: { name: string; slugs: string[] }[] = [
  {
    name: "Everyday",
    slugs: ["grocery", "dining", "gas-ev", "drugstore", "wholesale-clubs"],
  },
  {
    name: "Shopping",
    slugs: ["amazon", "online-retail", "apparel", "home-improvement", "home-decor", "pet-supply"],
  },
  {
    name: "Travel",
    slugs: ["flights", "hotels", "rental-car", "transit", "all-travel", "foreign-currency"],
  },
  {
    name: "Entertainment & Lifestyle",
    slugs: ["entertainment", "streaming", "fitness", "personal-care"],
  },
  {
    name: "Bills & Utilities",
    slugs: ["phone", "internet-cable", "utilities", "insurance", "rent", "mortgage", "daycare"],
  },
  {
    name: "Business",
    slugs: ["business-services", "office-supply", "software", "ads", "shipping", "contractors"],
  },
  {
    name: "Other",
    slugs: ["taxes", "paypal", "everything-else"],
  },
];

function getDisplayName(category: CategoryAllocation): string {
  return DISPLAY_NAME_OVERRIDES[category.categorySlug] || category.categoryName;
}

function groupCategories(categories: CategoryAllocation[]): { name: string; categories: CategoryAllocation[] }[] {
  const slugToCategory = new Map(categories.map((c) => [c.categorySlug, c]));
  const usedSlugs = new Set<string>();
  
  const groups = CATEGORY_GROUPS.map((group) => {
    const groupCategories = group.slugs
      .map((slug) => {
        const cat = slugToCategory.get(slug);
        if (cat) usedSlugs.add(slug);
        return cat;
      })
      .filter((c): c is CategoryAllocation => c !== undefined);
    
    return { name: group.name, categories: groupCategories };
  }).filter((g) => g.categories.length > 0);
  
  // Add any uncategorized items to "Other"
  const uncategorized = categories.filter((c) => !usedSlugs.has(c.categorySlug));
  if (uncategorized.length > 0) {
    const otherGroup = groups.find((g) => g.name === "Other");
    if (otherGroup) {
      otherGroup.categories.push(...uncategorized);
    } else {
      groups.push({ name: "Other", categories: uncategorized });
    }
  }
  
  return groups;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Format rate without unnecessary trailing zeros (3.00 -> 3, 3.50 -> 3.5, 3.25 -> 3.25)
function formatRate(value: number, suffix: string): string {
  // Round to 2 decimal places first
  const rounded = Math.round(value * 100) / 100;
  // Remove trailing zeros
  const formatted = rounded % 1 === 0 
    ? rounded.toString() 
    : rounded.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted}${suffix}`;
}

export function ReturnsDisplay({ returns, earningsGoal, recommendations = [] }: ReturnsDisplayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCurrencyBreakdown, setShowCurrencyBreakdown] = useState(false);

  const handleGoalChange = (goal: EarningsGoal) => {
    const params = new URLSearchParams(searchParams.toString());
    if (goal === "maximize") {
      params.delete("goal");
    } else {
      params.set("goal", goal);
    }
    router.push(`/returns${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const goalButtons: { value: EarningsGoal; label: string; description: string }[] = [
    { value: "maximize", label: "Maximize", description: "Best total value" },
    { value: "cash_only", label: "Cash Back", description: "Use cash out values" },
    { value: "points_only", label: "Points Only", description: "Miles & hotel points" },
  ];

  return (
    <div className="space-y-6">
      {/* Earnings Goal Toggle */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">Earnings Goal:</span>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {goalButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => handleGoalChange(btn.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  earningsGoal === btn.value
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
                title={btn.description}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500">
            {earningsGoal === "maximize" && "Optimizes for highest total value across all cards"}
            {earningsGoal === "cash_only" && "All earnings shown as cash back (points valued at cash redemption rate)"}
            {earningsGoal === "points_only" && "Only considers airline miles, hotel points, and transferable points"}
          </span>
        </div>
      </div>

      {/* Overview Card */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <div className="text-center">
          <div className="text-sm text-zinc-500 uppercase tracking-wide mb-1">Total Spend</div>
          <div className="text-4xl font-bold text-white">{formatCurrency(returns.totalSpend)}</div>
        </div>
      </div>

      {/* Cashback Section - Show when there's actual cash back (including debit pay bonus) */}
      {(returns.cashbackEarned > 0 || returns.totalDebitPay > 0) && (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-6">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <span className="text-xl">💵</span> Cash Back Earnings
          </h2>
          {earningsGoal === "cash_only" ? (
            // In cash_only mode, show total value as cash back (all earnings converted to cash)
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-1">Total Spend</div>
                <div className="text-xl font-semibold text-white">{formatCurrency(returns.totalSpend)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-1">Cash Back Earned</div>
                <div className="text-xl font-semibold text-emerald-400">{formatCurrency(returns.totalValue)}</div>
                {returns.totalDebitPay > 0 && (
                  <div className="text-xs text-zinc-500 mt-1">
                    (includes {formatCurrency(returns.totalDebitPay)} debit pay)
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-1">Avg Cash Back Rate</div>
                <div className="text-xl font-semibold text-white">
                  {returns.totalSpend > 0 ? formatPercent((returns.totalValue / returns.totalSpend) * 100) : "0%"}
                </div>
              </div>
            </div>
          ) : (
            // In maximize or points_only mode, show cash back and debit pay
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-1">
                  {returns.cashbackSpend > 0 ? "Cash Back Spend" : "Total Spend"}
                </div>
                <div className="text-xl font-semibold text-white">
                  {formatCurrency(returns.cashbackSpend > 0 ? returns.cashbackSpend : returns.totalSpend)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-1">Total Earned</div>
                <div className="text-xl font-semibold text-emerald-400">
                  {formatCurrency(returns.cashbackEarned + returns.totalDebitPay)}
                </div>
                {returns.totalDebitPay > 0 && returns.cashbackEarned > 0 && (
                  <div className="text-xs text-pink-400 mt-1">
                    ({formatCurrency(returns.cashbackEarned)} + {formatCurrency(returns.totalDebitPay)} debit)
                  </div>
                )}
                {returns.totalDebitPay > 0 && returns.cashbackEarned === 0 && (
                  <div className="text-xs text-pink-400 mt-1">
                    (debit pay bonus)
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-1">Avg Rate</div>
                <div className="text-xl font-semibold text-white">
                  {returns.totalSpend > 0 
                    ? formatPercent(((returns.cashbackEarned + returns.totalDebitPay) / (returns.cashbackSpend > 0 ? returns.cashbackSpend : returns.totalSpend)) * 100) 
                    : "0%"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Points Section - Hide in cash_only mode */}
      {earningsGoal !== "cash_only" && returns.pointsSpend > 0 && (
        <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-6">
          <h2 className="text-lg font-semibold text-violet-400 mb-4 flex items-center gap-2">
            <span className="text-xl">🔮</span> Points Earnings
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-1">Point Spend</div>
              <div className="text-xl font-semibold text-white">{formatCurrency(returns.pointsSpend)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-1">Points Earned</div>
              <button 
                onClick={() => setShowCurrencyBreakdown(!showCurrencyBreakdown)}
                className="text-xl font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 mx-auto"
              >
                {formatNumber(returns.pointsEarned, 0)}
                <svg
                  className={`w-4 h-4 transition-transform ${showCurrencyBreakdown ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-1">Avg Point Earn Rate</div>
              <div className="text-xl font-semibold text-white">{formatRate(returns.avgPointsRate, "x")}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-1">Total Points Value</div>
              <div className="text-xl font-semibold text-violet-400">{formatCurrency(returns.totalPointsValue)}</div>
            </div>
          </div>
          
          {/* Currency Breakdown Expansion */}
          {showCurrencyBreakdown && returns.currencyBreakdown.length > 0 && (
            <div className="mt-4 pt-4 border-t border-violet-800/30">
              <div className="space-y-2">
                {returns.currencyBreakdown.map((currency) => (
                  <div 
                    key={currency.currencyId} 
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-violet-900/20"
                  >
                    <span className="text-zinc-300 font-medium">{currency.currencyName}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-violet-400">{formatNumber(currency.pointsEarned, 0)} pts</span>
                      <span className="text-zinc-400">({formatCurrency(currency.pointsValue)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-center text-sm text-zinc-500 mt-4">
            Avg Point Value: {returns.avgPointValue.toFixed(2)}¢
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span> Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
            <span className="text-zinc-400">Total Earnings</span>
            <span className="text-xl font-semibold text-white">{formatCurrency(returns.totalValue)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
            <span className="text-zinc-400">Net Annual Fees</span>
            <span className="text-xl font-semibold text-red-400">-{formatCurrency(returns.netAnnualFees)}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-amber-900/20 rounded-lg px-4 -mx-4">
            <span className="text-amber-300 font-medium">Total Net Earnings</span>
            <span className="text-2xl font-bold text-amber-400">{formatCurrency(returns.netValueEarned)}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-amber-900/20 rounded-lg px-4 -mx-4">
            <span className="text-amber-300 font-medium">Net Return Rate</span>
            <span className="text-2xl font-bold text-amber-400">{formatPercent(returns.netReturnRate)}</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
        <button
          onClick={() => setShowCategoryDetails(!showCategoryDetails)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-white">Category Breakdown</h2>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${showCategoryDetails ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCategoryDetails && (
          <div className="border-t border-zinc-700 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-4 py-3">Category</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Spend</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-4 py-3">Card(s)</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Earned</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Value</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">ROS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {groupCategories(returns.categoryBreakdown.filter(c => c.totalSpend > 0)).map((group) => (
                  <React.Fragment key={group.name}>
                    {/* Group header */}
                    <tr className="bg-zinc-800/30">
                      <td colSpan={6} className="px-4 py-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          {group.name}
                        </span>
                      </td>
                    </tr>
                    {/* Categories in this group */}
                    {group.categories.map((category, idx) => (
                      <tr key={`${category.categoryId}-${category.categorySlug}-${idx}`} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-white font-medium">{getDisplayName(category)}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(category.totalSpend)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {category.allocations.map((alloc, allocIdx) => {
                              const rateDisplay = formatAllocationRate(alloc);
                              return (
                                <div key={allocIdx} className="text-sm">
                                  <span className="text-zinc-300">{alloc.cardName}</span>
                                  <span className="text-zinc-500 ml-1">
                                    ({formatCurrency(alloc.spend)} @{" "}
                                    {alloc.hasBonus ? (
                                      <AllocationTooltip alloc={alloc}>
                                        <span className="text-white">{rateDisplay.main}</span>
                                        {rateDisplay.bonus && (
                                          <span className="text-zinc-400"> {rateDisplay.bonus}</span>
                                        )}
                                      </AllocationTooltip>
                                    ) : (
                                      <span>{rateDisplay.main}</span>
                                    )}
                                    )
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {category.allocations.map((alloc, allocIdx) => {
                            const hasExtras = alloc.debitPayBonus > 0 || alloc.bonusContribution > 0;
                            return (
                              <div key={allocIdx} className="text-sm text-zinc-300">
                                {alloc.isCashback 
                                  ? formatCurrency(alloc.earned)
                                  : formatNumber(alloc.earned, 0) + " pts"
                                }
                                {hasExtras && (
                                  <span className="text-zinc-400"> + {formatCurrency(alloc.debitPayBonus + alloc.bonusContribution)}</span>
                                )}
                              </div>
                            );
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {category.allocations.map((alloc, allocIdx) => (
                            <div key={allocIdx} className="text-sm text-emerald-400">
                              {formatCurrency(alloc.baseEarnedValue + alloc.debitPayBonus + alloc.bonusContribution)}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-medium">
                          {category.totalSpend > 0 
                            ? formatPercent((category.allocations.reduce((sum, a) => sum + a.earnedValue + a.bonusContribution, 0) / category.totalSpend) * 100)
                            : "—"
                          }
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card Breakdown */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
        <button
          onClick={() => setShowCardDetails(!showCardDetails)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-white">Card Breakdown</h2>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${showCardDetails ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCardDetails && (
          <div className="border-t border-zinc-700 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-4 py-3">Card</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Spend</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Earned</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Value</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3" title="What this card earns minus what other cards would earn if removed, minus net fee">
                    Marginal Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {returns.cardBreakdown
                  .filter(c => c.totalSpend > 0 || c.netFee !== 0)
                  .sort((a, b) => (b.marginalValue ?? 0) - (a.marginalValue ?? 0))
                  .map((card) => (
                    <tr 
                      key={card.cardId} 
                      className={`hover:bg-zinc-800/30 ${
                        (card.marginalValue ?? 0) < 0 ? "bg-red-950/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{card.cardName}</div>
                        <div className="text-xs text-zinc-500">{card.currencyName}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">
                        {formatCurrency(card.totalSpend)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CardEarningsTooltip card={card}>
                          <span className="text-zinc-300">
                            {card.isCashback 
                              ? formatCurrency(card.totalEarned)
                              : formatNumber(card.totalEarned, 0) + " pts"
                            }
                            {(card.totalDebitPay > 0 || card.totalBonusValue > 0) && (
                              <span className="text-zinc-400"> + {formatCurrency(card.totalDebitPay + card.totalBonusValue)}</span>
                            )}
                          </span>
                        </CardEarningsTooltip>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatCurrency(card.totalEarnedValue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={
                          (card.marginalValue ?? 0) < 0 
                            ? "text-red-400 font-semibold" 
                            : (card.marginalValue ?? 0) > 0 
                              ? "text-emerald-400" 
                              : "text-zinc-400"
                        }>
                          {(card.marginalValue ?? 0) < 0 
                            ? `-${formatCurrency(Math.abs(card.marginalValue ?? 0))}`
                            : (card.marginalValue ?? 0) > 0 
                              ? `+${formatCurrency(card.marginalValue ?? 0)}`
                              : "$0"
                          }
                        </span>
                        {(card.marginalValue ?? 0) < 0 && (
                          <div className="text-xs text-red-400 mt-0.5">Consider removing</div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="px-4 py-3 text-xs text-zinc-500 border-t border-zinc-700/50">
              Marginal Value = Card Value - Replacement Value - Net Fee. Negative values indicate cards that cost more than they contribute.
            </div>

            {/* Card Recommendations - shown when card breakdown is expanded */}
            {recommendations.length > 0 && (
              <div className="p-4 border-t border-zinc-700">
                <CardRecommendations 
                  recommendations={recommendations}
                  variant="callout"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

