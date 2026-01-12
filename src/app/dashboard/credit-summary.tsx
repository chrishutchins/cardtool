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
  
  // Color based on utilization
  const getColor = (p: number) => {
    if (p <= 10) return "#34d399"; // emerald
    if (p <= 30) return "#4ade80"; // green
    if (p <= 50) return "#facc15"; // yellow
    if (p <= 75) return "#fb923c"; // orange
    return "#f87171"; // red
  };
  
  return (
    <div className="relative">
      <svg width="80" height="80" viewBox="0 0 100 100" className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#27272a"
          strokeWidth="12"
        />
        {/* Used portion */}
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
        <span className="text-sm font-bold text-white">{percent}%</span>
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
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-400 mb-1">Total Credit</p>
          <p className="text-3xl font-bold text-white">
            {totalCreditLine > 0 ? formatCurrency(totalCreditLine) : "—"}
          </p>
          
          {hasPlaidAccounts && totalCreditLine > 0 && (
            <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-zinc-800 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Balance</span>
                <span className="text-white font-medium">{formatCurrency(totalBalance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Available</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(totalAvailable)}</span>
              </div>
            </div>
          )}
          
          {!hasPlaidAccounts && totalCreditLine > 0 && (
            <p className="text-sm text-zinc-500 mt-2">
              Connect Plaid for balances
            </p>
          )}
        </div>
        
        {totalCreditLine > 0 && hasPlaidAccounts && (
          <div className="ml-4">
            <UtilizationDonut percent={utilizationPercent} />
          </div>
        )}
      </div>
    </Link>
  );
}
