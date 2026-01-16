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

interface ExpiringInventory {
  id: string;
  name: string;
  brand: string | null;
  expirationDate: Date;
  value: number; // in dollars
}

interface UpcomingUnifiedProps {
  expiringPoints: ExpiringPoint[];
  expiringCredits: ExpiringCredit[];
  upcomingFees: UpcomingFee[];
  expiringInventory: ExpiringInventory[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

// Icons
const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const ExpiringIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const GiftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

// Helper to truncate a list of names with "..."
function truncateList(items: string[], maxLength: number = 35): string {
  if (items.length === 0) return "";
  
  let result = items[0];
  let i = 1;
  
  while (i < items.length) {
    const next = result + ", " + items[i];
    if (next.length > maxLength) {
      return result + ", ...";
    }
    result = next;
    i++;
  }
  
  return result;
}

export function UpcomingUnified({ 
  expiringPoints, 
  expiringCredits, 
  upcomingFees,
  expiringInventory,
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
  const activeInventory = expiringInventory.filter(i => i.expirationDate <= cutoffDate);
  
  // Calculate totals
  const totalCreditValue = activeCredits.reduce((sum, c) => sum + (c.isValueBased ? c.value : 0), 0);
  const totalInventoryValue = activeInventory.reduce((sum, i) => sum + i.value, 0);
  const totalFeeValue = activeFees.reduce((sum, f) => sum + f.annualFee, 0);
  const totalPointsExpiring = activePoints.reduce((sum, p) => sum + p.balance, 0);
  
  // Get unique names for each category (deduplicate)
  const creditNames = [...new Set(activeCredits.map(c => c.creditName))];
  const inventoryNames = [...new Set(activeInventory.map(i => i.brand ? `${i.brand} ${i.name}` : i.name))];
  const feeCardNames = activeFees
    .sort((a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime())
    .map(f => f.cardName);
  const pointsNames = [...new Set(activePoints.map(p => p.currencyName))];
  
  const hasAnyItems = activeCredits.length > 0 || activeInventory.length > 0 || activeFees.length > 0 || activePoints.length > 0;

  return (
    <div className="p-5 rounded-xl border bg-zinc-900/50 border-zinc-800">
      <div className="flex items-start justify-between mb-4">
        <Link href="/upcoming" className="group">
          <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Upcoming</p>
          <p className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">Next {period} Days</p>
        </Link>
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
          <Link href="/upcoming" className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <CalendarIcon />
          </Link>
        </div>
      </div>
      
      {!hasAnyItems ? (
        <p className="text-sm text-zinc-500">No items expiring in the next {period} days</p>
      ) : (
        <div className="space-y-2">
          {/* Expiring Credits */}
          {activeCredits.length > 0 && (
            <Link
              href="/upcoming?type=credits"
              className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 flex-shrink-0">
                <GiftIcon />
              </div>
              <span className="text-white font-medium flex-shrink-0">Expiring Credits</span>
              <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">{truncateList(creditNames)}</span>
              <span className="text-white font-medium flex-shrink-0">{formatCurrency(totalCreditValue)}</span>
            </Link>
          )}

          {/* Expiring Inventory */}
          {activeInventory.length > 0 && (
            <Link
              href="/upcoming?type=inventory"
              className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="p-1.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">
                <PackageIcon />
              </div>
              <span className="text-white font-medium flex-shrink-0">Expiring Inventory</span>
              <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">{truncateList(inventoryNames)}</span>
              <span className="text-white font-medium flex-shrink-0">{formatCurrency(totalInventoryValue)}</span>
            </Link>
          )}

          {/* Card Renewals */}
          {activeFees.length > 0 && (
            <Link
              href="/upcoming?type=renewals"
              className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 flex-shrink-0">
                <CreditCardIcon />
              </div>
              <span className="text-white font-medium flex-shrink-0">Card Renewals</span>
              <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">{truncateList(feeCardNames)}</span>
              <span className="text-white font-medium flex-shrink-0">{formatCurrency(totalFeeValue)}</span>
            </Link>
          )}

          {/* Expiring Points */}
          {activePoints.length > 0 && (
            <Link
              href="/upcoming?type=points"
              className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="p-1.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">
                <ExpiringIcon />
              </div>
              <span className="text-white font-medium flex-shrink-0">Expiring Points</span>
              <span className="text-sm text-zinc-500 truncate flex-1 min-w-0">{truncateList(pointsNames)}</span>
              <span className="text-white font-medium flex-shrink-0">{formatNumber(totalPointsExpiring)}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
