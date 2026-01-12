"use client";

import Link from "next/link";

interface ExpiringPoint {
  currencyName: string;
  balance: number;
  expirationDate: Date;
  playerNumber?: number;
}

interface ExpiringCredit {
  creditId: string;
  creditName: string;
  cardName: string;
  expiresAt: Date;
  value: number;
  isValueBased: boolean;
  unitName: string | null;
}

interface UpcomingFee {
  cardName: string;
  annualFee: number;
  anniversaryDate: Date;
  walletId: string;
}

interface UpcomingSectionProps {
  expiringPoints: ExpiringPoint[];
  expiringCredits: ExpiringCredit[];
  upcomingFees: UpcomingFee[];
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays} days`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function UpcomingSection({ 
  expiringPoints, 
  expiringCredits, 
  upcomingFees 
}: UpcomingSectionProps) {
  const hasAnyItems = expiringPoints.length > 0 || expiringCredits.length > 0 || upcomingFees.length > 0;

  if (!hasAnyItems) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">Upcoming (Next 30 Days)</h3>
      
      <div className="space-y-4">
        {/* Expiring Points */}
        {expiringPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Expiring Points
              </h4>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                {expiringPoints.length}
              </span>
            </div>
            <div className="space-y-1.5 pl-3.5">
              {expiringPoints.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span>{formatNumber(item.balance)}</span>
                    <span className="text-zinc-500">{item.currencyName}</span>
                  </div>
                  <span className="text-amber-400/80 text-xs">{formatDate(item.expirationDate)}</span>
                </div>
              ))}
              {expiringPoints.length > 3 && (
                <Link href="/points" className="text-xs text-zinc-500 hover:text-zinc-400">
                  +{expiringPoints.length - 3} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Expiring Credits */}
        {expiringCredits.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Expiring Credits
              </h4>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                {expiringCredits.length}
              </span>
            </div>
            <div className="space-y-1.5 pl-3.5">
              {expiringCredits.slice(0, 3).map((credit, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="text-zinc-300 truncate max-w-[200px]">
                    {credit.creditName}
                    <span className="text-zinc-500 ml-1">({credit.cardName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-xs">
                      {credit.isValueBased ? formatCurrency(credit.value) : `${credit.value} ${credit.unitName || "uses"}`}
                    </span>
                    <span className="text-blue-400/80 text-xs">{formatDate(credit.expiresAt)}</span>
                  </div>
                </div>
              ))}
              {expiringCredits.length > 3 && (
                <Link href="/credits" className="text-xs text-zinc-500 hover:text-zinc-400">
                  +{expiringCredits.length - 3} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Annual Fees */}
        {upcomingFees.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Annual Fees Due
              </h4>
              <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                {upcomingFees.length}
              </span>
            </div>
            <div className="space-y-1.5 pl-3.5">
              {upcomingFees.slice(0, 3).map((fee, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 truncate max-w-[200px]">{fee.cardName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">{formatCurrency(fee.annualFee)}</span>
                    <span className="text-rose-400/80 text-xs">{formatDate(fee.anniversaryDate)}</span>
                  </div>
                </div>
              ))}
              {upcomingFees.length > 3 && (
                <Link href="/wallet" className="text-xs text-zinc-500 hover:text-zinc-400">
                  +{upcomingFees.length - 3} more
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
