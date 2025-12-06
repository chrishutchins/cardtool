"use client";

import { useState } from "react";
import { PortfolioReturns } from "@/lib/returns-calculator";

interface ReturnsDisplayProps {
  returns: PortfolioReturns;
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

export function ReturnsDisplay({ returns }: ReturnsDisplayProps) {
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <div className="text-center">
          <div className="text-sm text-zinc-500 uppercase tracking-wide mb-1">Total Spend</div>
          <div className="text-4xl font-bold text-white">{formatCurrency(returns.totalSpend)}</div>
        </div>
      </div>

      {/* Cashback Section */}
      {returns.cashbackSpend > 0 && (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-6">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <span className="text-xl">💵</span> Cash Back Earnings
          </h2>
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
        </div>
      )}

      {/* Points Section */}
      {returns.pointsSpend > 0 && (
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
              <div className="text-xl font-semibold text-violet-400">{formatNumber(returns.pointsEarned, 0)}</div>
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
          <div className="text-center text-sm text-zinc-500">
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
            <span className="text-zinc-400">Total Value</span>
            <span className="text-xl font-semibold text-white">{formatCurrency(returns.totalValue)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-700/50">
            <span className="text-zinc-400">Net Annual Fees</span>
            <span className="text-xl font-semibold text-red-400">-{formatCurrency(returns.netAnnualFees)}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-amber-900/20 rounded-lg px-4 -mx-4">
            <span className="text-amber-300 font-medium">Net Value Earned</span>
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
                                ({formatCurrency(alloc.spend)} @ {alloc.isCashback ? `${alloc.rate}%` : `${alloc.rate}x`})
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
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-4 py-3">Net Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {returns.cardBreakdown
                  .filter(c => c.totalSpend > 0 || c.netFee !== 0)
                  .sort((a, b) => b.totalEarnedValue - a.totalEarnedValue)
                  .map((card) => (
                    <tr key={card.cardId} className="hover:bg-zinc-800/30">
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
                        <span className={card.netFee <= 0 ? "text-emerald-400" : "text-red-400"}>
                          {card.netFee < 0 
                            ? `+${formatCurrency(Math.abs(card.netFee))}`
                            : card.netFee > 0 
                              ? `-${formatCurrency(card.netFee)}`
                              : "$0"
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

