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

// Unified item type for the combined list
type UnifiedItem = 
  | { type: "fee"; data: UpcomingFee }
  | { type: "points"; data: ExpiringPoint }
  | { type: "credits_summary"; count: number; totalValue: number };

export function UpcomingUnified({ 
  expiringPoints, 
  expiringCredits, 
  upcomingFees 
}: UpcomingUnifiedProps) {
  // Build unified list sorted by type: fees first, then points, then credits summary
  const items: UnifiedItem[] = [];
  
  // Add annual fees (each as its own entry)
  upcomingFees.forEach((fee) => {
    items.push({ type: "fee", data: fee });
  });
  
  // Add expiring points (each as its own entry)
  expiringPoints.forEach((point) => {
    items.push({ type: "points", data: point });
  });
  
  // Add credits summary (single entry if any credits exist)
  if (expiringCredits.length > 0) {
    const totalValue = expiringCredits.reduce((sum, c) => sum + (c.isValueBased ? c.value : 0), 0);
    items.push({ type: "credits_summary", count: expiringCredits.length, totalValue });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">Upcoming (Next 30 Days)</h3>
      
      <div className="space-y-2">
        {items.map((item, idx) => {
          if (item.type === "fee") {
            return (
              <div 
                key={`fee-${idx}`} 
                className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-zinc-300">{item.data.cardName}</span>
                    <span className="text-xs text-zinc-500 ml-2">Annual Fee</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{formatCurrency(item.data.annualFee)}</span>
                  <span className="text-xs text-rose-400/80 min-w-[60px] text-right">{formatDate(item.data.anniversaryDate)}</span>
                </div>
              </div>
            );
          }
          
          if (item.type === "points") {
            return (
              <div 
                key={`points-${idx}`} 
                className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-zinc-300">{item.data.currencyName}</span>
                    <span className="text-xs text-zinc-500 ml-2">Expiring Points</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{formatNumber(item.data.balance)}</span>
                  <span className="text-xs text-amber-400/80 min-w-[60px] text-right">{formatDate(item.data.expirationDate)}</span>
                </div>
              </div>
            );
          }
          
          if (item.type === "credits_summary") {
            return (
              <Link
                key="credits-summary"
                href="/credits"
                className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 -mx-2 px-2 rounded transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-zinc-300">{item.count} expiring credit{item.count !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.totalValue > 0 && (
                    <span className="text-sm text-zinc-400">{formatCurrency(item.totalValue)}</span>
                  )}
                  <span className="text-xs text-blue-400/80">View all →</span>
                </div>
              </Link>
            );
          }
          
          return null;
        })}
      </div>
    </div>
  );
}
