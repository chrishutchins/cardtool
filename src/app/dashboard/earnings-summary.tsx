"use client";

import Link from "next/link";
import type { PortfolioReturns } from "@/lib/returns-calculator";

interface EarningsSummaryProps {
  returns: PortfolioReturns | null;
  cardCount: number;
}

export function EarningsSummary({ returns, cardCount }: EarningsSummaryProps) {
  if (!returns || cardCount === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Earnings Summary</h2>
          <Link href="/returns" className="text-sm text-blue-400 hover:text-blue-300">
            View details →
          </Link>
        </div>
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">
            {cardCount === 0 
              ? "Add cards to your wallet to see earnings projections" 
              : "Set up your spending categories to see earnings projections"
            }
          </p>
          <Link
            href={cardCount === 0 ? "/wallet" : "/spending"}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            {cardCount === 0 ? "Add Cards" : "Set Up Spending"}
          </Link>
        </div>
      </div>
    );
  }

  // Note: totalSpend is in cents, but other summary values are in dollars
  const totalSpend = (returns.totalSpend ?? 0) / 100;
  const totalEarnings = returns.totalValue ?? 0;
  const returnRate = returns.netReturnRate ?? 0;
  const netFees = returns.netAnnualFees ?? 0;
  const netReturn = returns.netValueEarned ?? 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Earnings Summary</h2>
        <Link href="/returns" className="text-sm text-blue-400 hover:text-blue-300">
          View details →
        </Link>
      </div>

      <div className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-zinc-800/50">
            <p className="text-sm text-zinc-400 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-emerald-400">
              ${totalEarnings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-zinc-800/50">
            <p className="text-sm text-zinc-400 mb-1">Return Rate</p>
            <p className="text-2xl font-bold text-white">
              {returnRate.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 pt-4 border-t border-zinc-800">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Annual Spend</span>
            <span className="text-zinc-300">
              ${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Net Card Fees</span>
            <span className={netFees <= 0 ? "text-emerald-400" : "text-red-400"}>
              {netFees > 0 ? `-$${netFees.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `+$${Math.abs(netFees).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            </span>
          </div>
          <div className="flex justify-between text-sm font-medium pt-2 border-t border-zinc-800">
            <span className="text-zinc-300">Net Value</span>
            <span className={netReturn > 0 ? "text-emerald-400" : "text-red-400"}>
              {netReturn > 0 ? "+" : ""}${netReturn.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

