"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortfolioReturns, EarningsGoal } from "@/lib/returns-calculator";

interface ReturnsDisplayProps {
  returns: PortfolioReturns;
  earningsGoal: EarningsGoal;
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

export function ReturnsDisplay({ returns, earningsGoal }: ReturnsDisplayProps) {
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
            // In maximize or points_only mode, show cash back and debit pay separately
            <div className="space-y-4">
              {returns.cashbackSpend > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-zinc-400 mb-1">Cash Back Spend</div>
                    <div className="text-xl font-semibold text-white">{formatCurrency(returns.cashbackSpend)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400 mb-1">Cash Back Earned</div>
                    <div className="text-xl font-semibold text-emerald-400">{formatCurrency(returns.cashbackEarned)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400 mb-1">Avg CB Earn Rate</div>
                    <div className="text-xl font-semibold text-white">{formatPercent(returns.avgCashbackRate)}</div>
                  </div>
                </div>
              )}
              {returns.totalDebitPay > 0 && (
                <div className={`grid grid-cols-3 gap-4 ${returns.cashbackSpend > 0 ? "pt-4 border-t border-zinc-700/50" : ""}`}>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400 mb-1">Debit Pay Spend</div>
                    <div className="text-xl font-semibold text-white">{formatCurrency(returns.totalSpend)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400 mb-1">Debit Pay Bonus</div>
                    <div className="text-xl font-semibold text-emerald-400">{formatCurrency(returns.totalDebitPay)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400 mb-1">Avg Debit Rate</div>
                    <div className="text-xl font-semibold text-white">
                      {returns.totalSpend > 0 ? formatPercent((returns.totalDebitPay / returns.totalSpend) * 100) : "0%"}
                    </div>
                  </div>
                </div>
              )}
              {returns.cashbackSpend === 0 && returns.totalDebitPay === 0 && (
                <p className="text-zinc-500 text-center">No cash back earnings in current allocation</p>
              )}
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
              <div className="text-xl font-semibold text-white">{returns.avgPointsRate.toFixed(2)}x</div>
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
          <div className="border-t border-zinc-700">
            <table className="w-full">
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
                {returns.categoryBreakdown
                  .filter(c => c.totalSpend > 0)
                  .sort((a, b) => b.totalSpend - a.totalSpend)
                  .map((category) => (
                    <tr key={category.categoryId} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 text-white font-medium">{category.categoryName}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(category.totalSpend)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {category.allocations.map((alloc, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-zinc-300">{alloc.cardName}</span>
                              <span className="text-zinc-500 ml-1">
                                ({formatCurrency(alloc.spend)} @ {alloc.isCashback ? `${alloc.rate.toFixed(2)}%` : `${alloc.rate.toFixed(2)}x`}
                                {alloc.debitPayBonus > 0 && (
                                  <span className="text-emerald-500"> + {((alloc.debitPayBonus / alloc.spend) * 100).toFixed(0)}% debit</span>
                                )})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {category.allocations.map((alloc, idx) => (
                          <div key={idx} className="text-sm text-zinc-300">
                            {alloc.isCashback 
                              ? formatCurrency(alloc.earned)
                              : formatNumber(alloc.earned, 0) + " pts"
                            }
                            {alloc.debitPayBonus > 0 && (
                              <span className="text-emerald-400 ml-1">+ {formatCurrency(alloc.debitPayBonus)}</span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {category.allocations.map((alloc, idx) => (
                          <div key={idx} className="text-sm text-emerald-400">
                            {formatCurrency(alloc.earnedValue)}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-medium">
                        {category.totalSpend > 0 
                          ? formatPercent((category.allocations.reduce((sum, a) => sum + a.earnedValue, 0) / category.totalSpend) * 100)
                          : "—"
                        }
                      </td>
                    </tr>
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
          <div className="border-t border-zinc-700">
            <table className="w-full">
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
                        <span className={card.isCashback ? "text-emerald-400" : "text-violet-400"}>
                          {card.isCashback 
                            ? formatCurrency(card.totalEarned)
                            : formatNumber(card.totalEarned, 0) + " pts"
                          }
                        </span>
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
          </div>
        )}
      </div>
    </div>
  );
}

