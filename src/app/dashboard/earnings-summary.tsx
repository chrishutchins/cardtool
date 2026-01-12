"use client";

import Link from "next/link";
import type { PortfolioReturns } from "@/lib/returns-calculator";

interface EarningsSummaryProps {
  returns: PortfolioReturns | null;
  cardCount: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function EarningsSummary({ returns, cardCount }: EarningsSummaryProps) {
  if (!returns || cardCount === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/30 bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 p-6 h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Total Earnings</h2>
            <p className="text-sm text-zinc-400">Based on your spending allocation</p>
          </div>
        </div>
        <Link
          href={cardCount === 0 ? "/wallet" : "/spending"}
          className="block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors text-center"
        >
          {cardCount === 0 ? "Add Cards" : "Set Up Spending"}
        </Link>
      </div>
    );
  }

  // Note: totalSpend is already in dollars
  const totalSpend = returns.totalSpend ?? 0;
  const netEarnings = returns.netValueEarned ?? 0;
  const returnRate = returns.netReturnRate ?? 0;

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 p-6 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Total Earnings</h2>
          <p className="text-sm text-zinc-400">Based on your spending allocation</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-zinc-500">Total Spend</span>
          <span className="text-sm font-medium text-white">{formatCurrency(totalSpend)}</span>
        </div>
        
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-zinc-500">Net Earnings</span>
          <span className="text-sm font-medium text-emerald-400">{formatCurrency(netEarnings)}</span>
        </div>
        
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-zinc-500">Return Rate</span>
          <span className="text-sm font-bold text-emerald-400">{formatPercent(returnRate)}</span>
        </div>
        
        <Link
          href="/returns"
          className="block mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors text-center"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
