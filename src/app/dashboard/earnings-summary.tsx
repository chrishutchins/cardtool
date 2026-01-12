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

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export function EarningsSummary({ returns, cardCount }: EarningsSummaryProps) {
  if (!returns || cardCount === 0) {
    return (
      <Link
        href={cardCount === 0 ? "/wallet" : "/spending"}
        className="block p-5 rounded-xl border transition-all duration-200 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 h-full"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-zinc-400 mb-1">Total Earnings</p>
            <p className="text-xl font-bold text-white">
              {cardCount === 0 ? "Add Cards" : "Set Up Spending"}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
            <ChartIcon />
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          {cardCount === 0 
            ? "Add cards to see your potential earnings" 
            : "Configure your spending to calculate returns"}
        </p>
      </Link>
    );
  }

  // Note: totalSpend is already in dollars
  const totalSpend = returns.totalSpend ?? 0;
  const netEarnings = returns.netValueEarned ?? 0;
  const returnRate = returns.netReturnRate ?? 0;

  return (
    <Link
      href="/returns"
      className="block p-5 rounded-xl border transition-all duration-200 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 h-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">Total Earnings</p>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(netEarnings)}</p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
          <ChartIcon />
        </div>
      </div>
      
      <div className="flex flex-col gap-1 pt-3 border-t border-zinc-800 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Total Spend</span>
          <span className="text-white font-medium">{formatCurrency(totalSpend)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Return Rate</span>
          <span className="text-emerald-400 font-bold">{formatPercent(returnRate)}</span>
        </div>
      </div>
    </Link>
  );
}
