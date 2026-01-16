"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { UpcomingItem, CreditSubGroup } from "./upcoming-item";

// Type definitions
export interface ExpiringCredit {
  id: string;
  creditId: string;
  creditName: string;
  cardName: string;
  walletCardId: string;
  playerNumber: number | null;
  expiresAt: Date;
  value: number;
  isValueBased: boolean;
  unitName: string | null;
  isUsed: boolean;
  resetCycle: string;
}

export interface ExpiringInventoryItem {
  id: string;
  name: string;
  brand: string | null;
  typeName: string;
  typeSlug: string;
  expirationDate: Date;
  value: number;
  playerNumber: number | null;
  trackingType: string;
  quantity: number | null;
  quantityUsed: number | null;
  remainingValueCents: number | null;
  originalValueCents: number | null;
}

export interface UpcomingFee {
  walletId: string;
  cardName: string;
  annualFee: number;
  anniversaryDate: Date;
  playerNumber: number | null;
}

export interface ExpiringPoint {
  currencyId: string;
  currencyName: string;
  balance: number;
  expirationDate: Date;
  playerNumber: number;
}

export interface Player {
  player_number: number;
  description: string | null;
}

interface UpcomingClientProps {
  expiringCredits: ExpiringCredit[];
  expiringInventory: ExpiringInventoryItem[];
  upcomingFees: UpcomingFee[];
  expiringPoints: ExpiringPoint[];
  players: Player[];
  onMarkCreditUsed: (formData: FormData) => Promise<void>;
  onToggleCreditHidden: (formData: FormData) => Promise<void>;
}

type ItemType = "all" | "credits" | "inventory" | "renewals" | "points";

// Unified item type for sorting
type UnifiedItem =
  | { type: "credit"; date: Date; data: ExpiringCredit }
  | { type: "credit-group"; date: Date; data: CreditSubGroupData }
  | { type: "inventory"; date: Date; data: ExpiringInventoryItem }
  | { type: "renewal"; date: Date; data: UpcomingFee }
  | { type: "points"; date: Date; data: ExpiringPoint };

// Credit subgroup for grouping same credits across cards
export interface CreditSubGroupData {
  key: string;
  creditName: string;
  expiresAt: Date;
  credits: ExpiringCredit[];
  totalValue: number;
  isValueBased: boolean;
  unitName: string | null;
}

// Helper to get quarter from month (0-indexed)
function getQuarter(month: number): number {
  return Math.floor(month / 3) + 1;
}

// Helper to get quarter label with year suffix
function getQuarterLabel(quarter: number, year: number): string {
  const yearSuffix = `'${String(year).slice(-2)}`;
  return `Q${quarter} ${yearSuffix}`;
}

// Helper to get expiration bucket for grouping (matches inventory page)
function getExpirationBucket(date: Date): { key: string; label: string; sortOrder: number } {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { key: "expired", label: "Expired", sortOrder: -1 };
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = getQuarter(currentMonth);
  const expYear = date.getFullYear();
  const expMonth = date.getMonth();
  const expQuarter = getQuarter(expMonth);

  // This Month - same year and month as now
  if (expYear === currentYear && expMonth === currentMonth) {
    return { key: "this-month", label: "This Month", sortOrder: 1 };
  }

  // Current year quarters (excluding current month from its quarter)
  if (expYear === currentYear) {
    // Calculate sort order: base 10 + quarter number
    const sortOrder = 10 + expQuarter;
    return { 
      key: `q${expQuarter}-${currentYear}`, 
      label: getQuarterLabel(expQuarter, currentYear), 
      sortOrder 
    };
  }

  // Next year - show quarters only if we're currently in Q4
  const nextYear = currentYear + 1;
  if (expYear === nextYear) {
    if (currentQuarter === 4) {
      // In Q4, show next year's quarters
      const sortOrder = 20 + expQuarter;
      return { 
        key: `q${expQuarter}-${nextYear}`, 
        label: getQuarterLabel(expQuarter, nextYear), 
        sortOrder 
      };
    } else {
      // Not in Q4, show next year as whole year
      return { 
        key: `year-${nextYear}`, 
        label: String(nextYear), 
        sortOrder: 30 
      };
    }
  }

  // Far future - just show year
  return { 
    key: `year-${expYear}`, 
    label: String(expYear), 
    sortOrder: 40 + (expYear - currentYear) 
  };
}

export function UpcomingClient({
  expiringCredits,
  expiringInventory,
  upcomingFees,
  expiringPoints,
  players,
  onMarkCreditUsed,
  onToggleCreditHidden,
}: UpcomingClientProps) {
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as ItemType) || "all";

  const [typeFilter, setTypeFilter] = useState<ItemType>(initialType);
  const [playerFilter, setPlayerFilter] = useState<number | "all">("all");
  const [hideUsedCredits, setHideUsedCredits] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedCreditGroups, setExpandedCreditGroups] = useState<Set<string>>(new Set());

  // Build unified item list
  const allItems = useMemo(() => {
    const items: UnifiedItem[] = [];

    // Add credits - group by name + expiration date
    if (typeFilter === "all" || typeFilter === "credits") {
      // First filter credits
      const filteredCredits = expiringCredits.filter(credit => {
        if (hideUsedCredits && credit.isUsed) return false;
        if (playerFilter !== "all" && credit.playerNumber !== playerFilter) return false;
        return true;
      });

      // Group credits by name + expiration date
      const creditGroups = new Map<string, ExpiringCredit[]>();
      for (const credit of filteredCredits) {
        const dateStr = credit.expiresAt.toISOString().split("T")[0];
        const key = `${credit.creditName}|${dateStr}`;
        if (!creditGroups.has(key)) {
          creditGroups.set(key, []);
        }
        creditGroups.get(key)!.push(credit);
      }

      // Convert to unified items
      for (const [key, credits] of creditGroups.entries()) {
        if (credits.length === 1) {
          // Single credit - add directly
          items.push({ type: "credit", date: credits[0].expiresAt, data: credits[0] });
        } else {
          // Multiple credits - create a group
          const firstCredit = credits[0];
          const totalValue = credits.reduce((sum, c) => sum + (c.isValueBased ? c.value : 0), 0);
          const subGroup: CreditSubGroupData = {
            key,
            creditName: firstCredit.creditName,
            expiresAt: firstCredit.expiresAt,
            credits,
            totalValue,
            isValueBased: firstCredit.isValueBased,
            unitName: firstCredit.unitName,
          };
          items.push({ type: "credit-group", date: firstCredit.expiresAt, data: subGroup });
        }
      }
    }

    // Add inventory
    if (typeFilter === "all" || typeFilter === "inventory") {
      expiringInventory.forEach(item => {
        if (playerFilter !== "all" && item.playerNumber !== playerFilter) return;
        items.push({ type: "inventory", date: item.expirationDate, data: item });
      });
    }

    // Add renewals
    if (typeFilter === "all" || typeFilter === "renewals") {
      upcomingFees.forEach(fee => {
        if (playerFilter !== "all" && fee.playerNumber !== playerFilter) return;
        items.push({ type: "renewal", date: fee.anniversaryDate, data: fee });
      });
    }

    // Add points
    if (typeFilter === "all" || typeFilter === "points") {
      expiringPoints.forEach(point => {
        if (playerFilter !== "all" && point.playerNumber !== playerFilter) return;
        items.push({ type: "points", date: point.expirationDate, data: point });
      });
    }

    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    return items;
  }, [
    expiringCredits,
    expiringInventory,
    upcomingFees,
    expiringPoints,
    typeFilter,
    playerFilter,
    hideUsedCredits,
  ]);

  // Group items by expiration bucket
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { label: string; items: UnifiedItem[]; sortOrder: number }>();

    for (const item of allItems) {
      const bucket = getExpirationBucket(item.date);

      if (!groups.has(bucket.key)) {
        groups.set(bucket.key, { label: bucket.label, items: [], sortOrder: bucket.sortOrder });
      }
      groups.get(bucket.key)!.items.push(item);
    }

    return Array.from(groups.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [allItems]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCreditGroup = (key: string) => {
    setExpandedCreditGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Calculate summary totals
  const totals = useMemo(() => {
    let creditsValue = 0;
    let inventoryValue = 0;
    let feesTotal = 0;
    let pointsTotal = 0;

    for (const item of allItems) {
      if (item.type === "credit" && item.data.isValueBased && !item.data.isUsed) {
        creditsValue += item.data.value;
      } else if (item.type === "credit-group") {
        // Sum values from grouped credits (only unused ones)
        creditsValue += item.data.credits
          .filter(c => !c.isUsed && c.isValueBased)
          .reduce((sum, c) => sum + c.value, 0);
      } else if (item.type === "inventory") {
        inventoryValue += item.data.value;
      } else if (item.type === "renewal") {
        feesTotal += item.data.annualFee;
      } else if (item.type === "points") {
        pointsTotal += item.data.balance;
      }
    }

    return { creditsValue, inventoryValue, feesTotal, pointsTotal };
  }, [allItems]);

  const hasMultiplePlayers = players.length > 1;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as ItemType)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="credits">Credits</option>
              <option value="inventory">Inventory</option>
              <option value="renewals">Card Renewals</option>
              <option value="points">Expiring Points</option>
            </select>
          </div>

          {/* Player Filter */}
          {hasMultiplePlayers && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Player:</span>
              <select
                value={playerFilter}
                onChange={e => setPlayerFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Players</option>
                {players.map(p => (
                  <option key={p.player_number} value={p.player_number}>
                    {p.description || `Player ${p.player_number}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hide Used Credits */}
          {(typeFilter === "all" || typeFilter === "credits") && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideUsedCredits}
                onChange={e => setHideUsedCredits(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-400">Hide used</span>
            </label>
          )}

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsedGroups(new Set())}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
            >
              Expand
            </button>
            <span className="text-zinc-600">|</span>
            <button
              onClick={() => setCollapsedGroups(new Set(groupedItems.map(g => g.key)))}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="flex items-center gap-6">
          {(typeFilter === "all" || typeFilter === "credits") && totals.creditsValue > 0 && (
            <div className="text-right">
              <div className="text-xs text-zinc-500">Credits</div>
              <div className="text-sm font-medium text-blue-400">${Math.round(totals.creditsValue).toLocaleString()}</div>
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "inventory") && totals.inventoryValue > 0 && (
            <div className="text-right">
              <div className="text-xs text-zinc-500">Inventory</div>
              <div className="text-sm font-medium text-purple-400">${Math.round(totals.inventoryValue).toLocaleString()}</div>
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "renewals") && totals.feesTotal > 0 && (
            <div className="text-right">
              <div className="text-xs text-zinc-500">Renewals</div>
              <div className="text-sm font-medium text-amber-400">${Math.round(totals.feesTotal).toLocaleString()}</div>
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "points") && totals.pointsTotal > 0 && (
            <div className="text-right">
              <div className="text-xs text-zinc-500">Points</div>
              <div className="text-sm font-medium text-red-400">{totals.pointsTotal.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Items List */}
      {allItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400 mb-2">No upcoming items</p>
          <p className="text-zinc-500 text-sm">
            {typeFilter !== "all"
              ? "Try selecting 'All' types."
              : "Check back later or extend the time period."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedItems.map(group => {
            const isCollapsed = collapsedGroups.has(group.key);
            return (
              <div key={group.key} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between bg-zinc-800/50 px-4 py-2 border-b border-zinc-700 hover:bg-zinc-800/70 transition-colors"
                >
                  <h3 className="font-medium text-white">{group.label}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                    </span>
                    <svg
                      className={`w-5 h-5 text-zinc-400 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-zinc-800">
                    {group.items.map((item, idx) =>
                      item.type === "credit-group" ? (
                        <CreditSubGroup
                          key={item.data.key}
                          subGroup={item.data}
                          isExpanded={expandedCreditGroups.has(item.data.key)}
                          onToggle={() => toggleCreditGroup(item.data.key)}
                          showPlayer={hasMultiplePlayers}
                          players={players}
                          onMarkCreditUsed={onMarkCreditUsed}
                          onToggleCreditHidden={onToggleCreditHidden}
                        />
                      ) : (
                        <UpcomingItem
                          key={`${item.type}-${idx}`}
                          item={item}
                          showPlayer={hasMultiplePlayers}
                          players={players}
                          onMarkCreditUsed={onMarkCreditUsed}
                          onToggleCreditHidden={onToggleCreditHidden}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
