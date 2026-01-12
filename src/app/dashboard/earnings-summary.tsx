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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">Total Earnings</h2>
            <p className="text-sm text-zinc-400">Based on your spending allocation</p>
          </div>
          <Link
            href={cardCount === 0 ? "/wallet" : "/spending"}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {cardCount === 0 ? "Add Cards" : "Set Up Spending"}
          </Link>
        </div>
      </div>
    );
  }

  const totalSpend = returns.totalSpend ?? 0;
  const netEarnings = returns.netValueEarned ?? 0;
  const returnRate = returns.netReturnRate ?? 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white mb-1">Total Earnings</h2>
          <p className="text-sm text-zinc-400">Based on your spending allocation</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 md:gap-8">
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-0.5">Total Spend</div>
            <div className="text-lg font-semibold text-white">{formatCurrency(totalSpend)}</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-0.5">Net Earnings</div>
            <div className="text-lg font-semibold text-emerald-400">{formatCurrency(netEarnings)}</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-0.5">Return Rate</div>
            <div className="text-lg font-bold text-emerald-400">{formatPercent(returnRate)}</div>
          </div>
          
          <Link
            href="/returns"
            className="text-sm text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
