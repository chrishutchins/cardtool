"use client";

import Link from "next/link";
import { PortfolioReturns } from "@/lib/returns-calculator";

interface ReturnsSummaryProps {
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

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function ReturnsSummary({ returns }: ReturnsSummaryProps) {
  return (
    <div className="rounded-xl border border-amber-700/30 bg-gradient-to-r from-amber-950/30 to-zinc-900/50 p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-amber-400 mb-1">Portfolio Returns</h2>
          <p className="text-sm text-zinc-400">Based on your spending allocation</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 md:gap-8">
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-0.5">Total Spend</div>
            <div className="text-lg font-semibold text-white">{formatCurrency(returns.totalSpend)}</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-0.5">Net Value</div>
            <div className="text-lg font-semibold text-emerald-400">{formatCurrency(returns.netValueEarned)}</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-0.5">Return Rate</div>
            <div className="text-lg font-bold text-amber-400">{formatPercent(returns.netReturnRate)}</div>
          </div>
          
          <Link
            href="/returns"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}

