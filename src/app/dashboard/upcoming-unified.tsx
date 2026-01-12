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

interface UpcomingUnifiedProps {
  expiringPoints: ExpiringPoint[];
  expiringCredits: ExpiringCredit[];
  upcomingFees: UpcomingFee[];
}

function formatDate(date: Date): string {
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

// Combined item for sorting by date
type UpcomingItem = 
  | { type: "fee"; date: Date; data: UpcomingFee }
  | { type: "points"; date: Date; data: ExpiringPoint };

export function UpcomingUnified({ 
  expiringPoints, 
  expiringCredits, 
  upcomingFees 
}: UpcomingUnifiedProps) {
  // Build list of fees and points, sorted by date
  const items: UpcomingItem[] = [];
  
  upcomingFees.forEach((fee) => {
    items.push({ type: "fee", date: fee.anniversaryDate, data: fee });
  });
  
  expiringPoints.forEach((point) => {
    items.push({ type: "points", date: point.expirationDate, data: point });
  });
  
  // Sort by date (soonest first)
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  const hasAnyItems = expiringCredits.length > 0 || items.length > 0;

  if (!hasAnyItems) {
    return (
      <div className="rounded-xl border border-zinc-700/30 bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 p-6 h-full">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white mb-1">Upcoming</h2>
          <p className="text-sm text-zinc-400">Next 30 days</p>
        </div>
        <p className="text-sm text-zinc-500 mt-4">Nothing expiring soon</p>
      </div>
    );
  }

  // Calculate total value of expiring credits
  const totalCreditValue = expiringCredits.reduce((sum, c) => sum + (c.isValueBased ? c.value : 0), 0);

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 p-6 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Upcoming</h2>
          <p className="text-sm text-zinc-400">Next 30 days</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Expiring Credits Summary (always first) */}
        {expiringCredits.length > 0 && (
          <Link
            href="/credits"
            className="block py-2 hover:bg-zinc-800/30 -mx-2 px-2 rounded transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">
                <span className="font-medium text-white">{expiringCredits.length}</span> Expiring Credits
              </span>
              {totalCreditValue > 0 && (
                <span className="text-sm text-zinc-400">{formatCurrency(totalCreditValue)}</span>
              )}
            </div>
          </Link>
        )}

        {/* Annual Fees and Expiring Points sorted by date */}
        {items.map((item, idx) => {
          if (item.type === "fee") {
            return (
              <div 
                key={`fee-${idx}`} 
                className="flex items-center justify-between py-1"
              >
                <div className="text-sm">
                  <span className="text-zinc-500">Annual Fee: </span>
                  <span className="text-zinc-300">{item.data.cardName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-zinc-400">{formatCurrency(item.data.annualFee)}</span>
                  <span className="text-zinc-500 min-w-[50px] text-right">{formatDate(item.date)}</span>
                </div>
              </div>
            );
          }
          
          if (item.type === "points") {
            return (
              <div 
                key={`points-${idx}`} 
                className="flex items-center justify-between py-1"
              >
                <div className="text-sm">
                  <span className="text-zinc-500">Expiring Points: </span>
                  <span className="text-zinc-300">{item.data.currencyName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-zinc-400">{formatNumber(item.data.balance)}</span>
                  <span className="text-zinc-500 min-w-[50px] text-right">{formatDate(item.date)}</span>
                </div>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    </div>
  );
}
