"use client";

import { useState } from "react";
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Icons
const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const GiftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

type UpcomingItem = 
  | { type: "fee"; date: Date; data: UpcomingFee }
  | { type: "points"; date: Date; data: ExpiringPoint };

export function UpcomingUnified({ 
  expiringPoints, 
  expiringCredits, 
  upcomingFees,
}: UpcomingUnifiedProps) {
  const [period, setPeriod] = useState<"30" | "60" | "90">("30");
  
  // Calculate cutoff date based on period
  const now = new Date();
  const cutoffDate = new Date(now);
  const days = period === "30" ? 30 : period === "60" ? 60 : 90;
  cutoffDate.setDate(cutoffDate.getDate() + days);
  
  // Filter data based on period (all props contain up to 90 days of data)
  const activeCredits = expiringCredits.filter(c => c.expiresAt <= cutoffDate);
  const activePoints = expiringPoints.filter(p => p.expirationDate <= cutoffDate);
  const activeFees = upcomingFees.filter(f => f.anniversaryDate <= cutoffDate);
  
  // Build list of fees and points, sorted by date
  const items: UpcomingItem[] = [];
  
  activeFees.forEach((fee) => {
    items.push({ type: "fee", date: fee.anniversaryDate, data: fee });
  });
  
  activePoints.forEach((point) => {
    items.push({ type: "points", date: point.expirationDate, data: point });
  });
  
  // Sort by date (soonest first)
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  const hasAnyItems = activeCredits.length > 0 || items.length > 0;
  
  // Calculate total value of expiring credits
  const totalCreditValue = activeCredits.reduce((sum, c) => sum + (c.isValueBased ? c.value : 0), 0);

  return (
    <div className="p-5 rounded-xl border bg-zinc-900/50 border-zinc-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm text-zinc-400">Upcoming</p>
            <p className="text-xl font-bold text-white">Next {period} Days</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-zinc-800 p-0.5">
            <button
              onClick={() => setPeriod("30")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === "30" 
                  ? "bg-zinc-700 text-white" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setPeriod("60")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === "60" 
                  ? "bg-zinc-700 text-white" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              60d
            </button>
            <button
              onClick={() => setPeriod("90")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                period === "90" 
                  ? "bg-zinc-700 text-white" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              90d
            </button>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
            <CalendarIcon />
          </div>
        </div>
      </div>
      
      {!hasAnyItems ? (
        <p className="text-sm text-zinc-500">No items expiring in the next {period} days</p>
      ) : (
        <div className="space-y-2">
          {/* Expiring Credits Summary */}
          {activeCredits.length > 0 && (
            <Link
              href="/credits"
              className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-blue-500/20 text-blue-400">
                  <GiftIcon />
                </div>
                <span className="text-white font-medium">{activeCredits.length} Expiring Credits</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-zinc-500 text-sm">By {formatDate(cutoffDate)}</span>
                {totalCreditValue > 0 && (
                  <span className="text-white font-medium min-w-[70px] text-right">{formatCurrency(totalCreditValue)}</span>
                )}
              </div>
            </Link>
          )}

          {/* Annual Fees and Expiring Points sorted by date */}
          {items.map((item, idx) => {
            if (item.type === "fee") {
              return (
                <Link
                  key={`fee-${idx}`}
                  href="/wallet"
                  className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-amber-500/20 text-amber-400">
                      <CreditCardIcon />
                    </div>
                    <div>
                      <span className="text-white font-medium">Annual Fee</span>
                      <span className="text-zinc-500 ml-2">{item.data.cardName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-zinc-500 text-sm">{formatDate(item.date)}</span>
                    <span className="text-white font-medium min-w-[70px] text-right">{formatCurrency(item.data.annualFee)}</span>
                  </div>
                </Link>
              );
            }
            
            if (item.type === "points") {
              return (
                <Link
                  key={`points-${idx}`}
                  href="/points"
                  className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-purple-500/20 text-purple-400">
                      <StarIcon />
                    </div>
                    <div>
                      <span className="text-white font-medium">Expiring Points</span>
                      <span className="text-zinc-500 ml-2">{item.data.currencyName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-zinc-500 text-sm">{formatDate(item.date)}</span>
                    <span className="text-white font-medium min-w-[70px] text-right">{item.data.balance.toLocaleString()}</span>
                  </div>
                </Link>
              );
            }
            
            return null;
          })}
        </div>
      )}
    </div>
  );
}
