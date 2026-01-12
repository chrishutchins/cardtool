"use client";

import Link from "next/link";

interface CreditSummaryProps {
  totalBalance: number;
  totalAvailable: number;
  totalCreditLine: number;
  hasPlaidAccounts: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Utilization donut chart
function UtilizationDonut({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 40;
  const usedDash = (percent / 100) * circumference;
  const availableDash = circumference - usedDash;
  
  const getColor = (p: number) => {
    if (p <= 10) return "#34d399";
    if (p <= 30) return "#4ade80";
    if (p <= 50) return "#facc15";
    if (p <= 75) return "#fb923c";
    return "#f87171";
  };
  
  return (
    <div className="relative flex-shrink-0">
      <svg width="64" height="64" viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#27272a"
          strokeWidth="12"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={getColor(percent)}
          strokeWidth="12"
          strokeDasharray={`${usedDash} ${availableDash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{percent}%</span>
      </div>
    </div>
  );
}

export function CreditSummary({ 
  totalBalance, 
  totalAvailable, 
  totalCreditLine,
  hasPlaidAccounts 
}: CreditSummaryProps) {
  const utilizationPercent = totalCreditLine > 0 
    ? Math.round((totalBalance / totalCreditLine) * 100) 
    : 0;

  return (
    <Link
      href="/wallet"
      className="block p-5 rounded-xl border transition-all duration-200 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-zinc-400">Total Credit</p>
      </div>
      
      <p className="text-3xl font-bold text-white mb-3">
        {totalCreditLine > 0 ? formatCurrency(totalCreditLine) : "—"}
      </p>
      
      {hasPlaidAccounts && totalCreditLine > 0 && (
        <div className="flex items-center gap-4 pt-3 border-t border-zinc-800">
          <div className="flex flex-col gap-1 text-sm flex-1">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Balance</span>
              <span className="text-white font-medium">{formatCurrency(totalBalance)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Available</span>
              <span className="text-emerald-400 font-medium">{formatCurrency(totalAvailable)}</span>
            </div>
          </div>
          <UtilizationDonut percent={utilizationPercent} />
        </div>
      )}
      
      {!hasPlaidAccounts && totalCreditLine > 0 && (
        <p className="text-sm text-zinc-500 pt-3 border-t border-zinc-800">
          Connect Plaid for balances
        </p>
      )}
    </Link>
  );
}
