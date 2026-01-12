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

export function CreditSummary({ 
  totalBalance, 
  totalAvailable, 
  totalCreditLine,
  hasPlaidAccounts 
}: CreditSummaryProps) {
  // Only show balance/available if user has Plaid accounts linked
  // Credit line is always shown if any value exists (from manual entry or Plaid)
  
  const utilizationPercent = totalCreditLine > 0 
    ? Math.round((totalBalance / totalCreditLine) * 100) 
    : 0;
  
  // Determine utilization color
  const getUtilizationColor = (percent: number) => {
    if (percent <= 10) return "text-emerald-400";
    if (percent <= 30) return "text-green-400";
    if (percent <= 50) return "text-yellow-400";
    if (percent <= 75) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm text-zinc-400 mb-1">Credit Summary</h3>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">
              {totalCreditLine > 0 ? formatCurrency(totalCreditLine) : "—"}
            </span>
            {totalCreditLine > 0 && (
              <span className="text-sm text-zinc-500">total credit</span>
            )}
          </div>
        </div>
        <Link
          href="/wallet"
          className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </Link>
      </div>

      {hasPlaidAccounts ? (
        <div className="space-y-3">
          {/* Balance Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-zinc-500">Balance: </span>
              <span className="text-white font-medium">{formatCurrency(totalBalance)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Available: </span>
              <span className="text-emerald-400 font-medium">{formatCurrency(totalAvailable)}</span>
            </div>
          </div>

          {/* Utilization Bar */}
          {totalCreditLine > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Utilization</span>
                <span className={getUtilizationColor(utilizationPercent)}>
                  {utilizationPercent}%
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    utilizationPercent <= 10 ? "bg-emerald-400" :
                    utilizationPercent <= 30 ? "bg-green-400" :
                    utilizationPercent <= 50 ? "bg-yellow-400" :
                    utilizationPercent <= 75 ? "bg-orange-400" :
                    "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : totalCreditLine > 0 ? (
        <p className="text-sm text-zinc-500">
          Connect accounts via{" "}
          <Link href="/settings" className="text-blue-400 hover:text-blue-300">Settings</Link>{" "}
          to track balances automatically.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          Set credit limits in{" "}
          <Link href="/wallet" className="text-blue-400 hover:text-blue-300">Wallet</Link>{" "}
          to track your total credit.
        </p>
      )}
    </div>
  );
}
