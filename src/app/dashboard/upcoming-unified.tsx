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
  
  // Calculate total value of expiring credits
  const totalCreditValue = expiringCredits.reduce((sum, c) => sum + (c.isValueBased ? c.value : 0), 0);

  if (!hasAnyItems) {
    return (
      <div className="p-5 rounded-xl border bg-zinc-900/50 border-zinc-800 h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-zinc-400 mb-1">Upcoming</p>
            <p className="text-xl font-bold text-white">Nothing Soon</p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
            <CalendarIcon />
          </div>
        </div>
        <p className="text-sm text-zinc-500">No items expiring in the next 30 days</p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border bg-zinc-900/50 border-zinc-800 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">Upcoming</p>
          <p className="text-xl font-bold text-white">Next 30 Days</p>
        </div>
        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
          <CalendarIcon />
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Expiring Credits Summary (always first) */}
        {expiringCredits.length > 0 && (
          <Link
            href="/credits"
            className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-blue-500/20 text-blue-400">
                <GiftIcon />
              </div>
              <div>
                <span className="text-white font-medium">{expiringCredits.length} Expiring Credits</span>
              </div>
            </div>
            {totalCreditValue > 0 && (
              <span className="text-rose-400 font-semibold">{formatCurrency(totalCreditValue)}</span>
            )}
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
                <div className="flex items-center gap-4 text-right">
                  <span className="text-rose-400 font-semibold">{formatCurrency(item.data.annualFee)}</span>
                  <span className="text-zinc-500 text-sm min-w-[60px]">{formatDate(item.date)}</span>
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
                <div className="flex items-center gap-4 text-right">
                  <span className="text-rose-400 font-semibold">{item.data.balance.toLocaleString()}</span>
                  <span className="text-zinc-500 text-sm min-w-[60px]">{formatDate(item.date)}</span>
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
