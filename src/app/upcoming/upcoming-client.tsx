"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { UpcomingItem, CreditSubGroup, InventorySubGroup } from "./upcoming-item";

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
  onHideItem: (formData: FormData) => Promise<void>;
}

type ItemType = "credits" | "inventory" | "renewals" | "points";
const ALL_TYPES: ItemType[] = ["credits", "inventory", "renewals", "points"];

// Unified item type for sorting
type UnifiedItem =
  | { type: "credit"; date: Date; data: ExpiringCredit }
  | { type: "credit-group"; date: Date; data: CreditSubGroupData }
  | { type: "inventory"; date: Date; data: ExpiringInventoryItem }
  | { type: "inventory-group"; date: Date; data: InventorySubGroupData }
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

// Inventory subgroup for grouping same inventory items
export interface InventorySubGroupData {
  key: string;
  name: string;
  brand: string | null;
  typeName: string;
  typeSlug: string;
  expirationDate: Date;
  items: ExpiringInventoryItem[];
  totalValue: number;
  trackingType: string;
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
  onHideItem,
}: UpcomingClientProps) {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") as ItemType | null;

  const [selectedTypes, setSelectedTypes] = useState<Set<ItemType>>(() => {
    if (initialType && ALL_TYPES.includes(initialType)) {
      return new Set([initialType]);
    }
    return new Set(ALL_TYPES); // Default to all selected
  });

  const toggleType = (type: ItemType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow deselecting all
        if (next.size > 1) {
          next.delete(type);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const selectAllTypes = () => {
    setSelectedTypes(new Set(ALL_TYPES));
  };
  const [playerFilter, setPlayerFilter] = useState<number | "all">("all");
  const [hideUsedCredits, setHideUsedCredits] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedCreditGroups, setExpandedCreditGroups] = useState<Set<string>>(new Set());
  const [expandedInventoryGroups, setExpandedInventoryGroups] = useState<Set<string>>(new Set());

  // Build unified item list
  const allItems = useMemo(() => {
    const items: UnifiedItem[] = [];

    // Add credits - group by name + expiration date
    if (selectedTypes.has("credits")) {
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

    // Add inventory - group by name + expiration date
    if (selectedTypes.has("inventory")) {
      // First filter inventory
      const filteredInventory = expiringInventory.filter(item => {
        if (playerFilter !== "all" && item.playerNumber !== playerFilter) return false;
        return true;
      });

      // Group inventory by name + expiration date
      const inventoryGroups = new Map<string, ExpiringInventoryItem[]>();
      for (const item of filteredInventory) {
        const dateStr = item.expirationDate.toISOString().split("T")[0];
        const key = `${item.name}|${dateStr}`;
        if (!inventoryGroups.has(key)) {
          inventoryGroups.set(key, []);
        }
        inventoryGroups.get(key)!.push(item);
      }

      // Convert to unified items
      for (const [key, invItems] of inventoryGroups.entries()) {
        if (invItems.length === 1) {
          // Single item - add directly
          items.push({ type: "inventory", date: invItems[0].expirationDate, data: invItems[0] });
        } else {
          // Multiple items - create a group
          const firstItem = invItems[0];
          const totalValue = invItems.reduce((sum, i) => sum + i.value, 0);
          const subGroup: InventorySubGroupData = {
            key,
            name: firstItem.name,
            brand: firstItem.brand,
            typeName: firstItem.typeName,
            typeSlug: firstItem.typeSlug,
            expirationDate: firstItem.expirationDate,
            items: invItems,
            totalValue,
            trackingType: firstItem.trackingType,
          };
          items.push({ type: "inventory-group", date: firstItem.expirationDate, data: subGroup });
        }
      }
    }

    // Add renewals
    if (selectedTypes.has("renewals")) {
      upcomingFees.forEach(fee => {
        if (playerFilter !== "all" && fee.playerNumber !== playerFilter) return;
        items.push({ type: "renewal", date: fee.anniversaryDate, data: fee });
      });
    }

    // Add points
    if (selectedTypes.has("points")) {
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
    selectedTypes,
    playerFilter,
    hideUsedCredits,
  ]);

  // Group items by expiration bucket
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { 
      label: string; 
      items: UnifiedItem[]; 
      sortOrder: number;
      totals: { credits: number; inventory: number; fees: number; points: number };
    }>();

    for (const item of allItems) {
      const bucket = getExpirationBucket(item.date);

      if (!groups.has(bucket.key)) {
        groups.set(bucket.key, { 
          label: bucket.label, 
          items: [], 
          sortOrder: bucket.sortOrder,
          totals: { credits: 0, inventory: 0, fees: 0, points: 0 }
        });
      }
      const group = groups.get(bucket.key)!;
      group.items.push(item);

      // Calculate totals per bucket
      if (item.type === "credit" && item.data.isValueBased && !item.data.isUsed) {
        group.totals.credits += item.data.value;
      } else if (item.type === "credit-group") {
        group.totals.credits += item.data.credits
          .filter(c => !c.isUsed && c.isValueBased)
          .reduce((sum, c) => sum + c.value, 0);
      } else if (item.type === "inventory") {
        group.totals.inventory += item.data.value;
      } else if (item.type === "inventory-group") {
        group.totals.inventory += item.data.items.reduce((sum, i) => sum + i.value, 0);
      } else if (item.type === "renewal") {
        group.totals.fees += item.data.annualFee;
      } else if (item.type === "points") {
        group.totals.points += item.data.balance;
      }
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

  const toggleInventoryGroup = (key: string) => {
    setExpandedInventoryGroups(prev => {
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
  const hasMultiplePlayers = players.length > 1;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Type Filter - Multi-select buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllTypes}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedTypes.size === ALL_TYPES.length
                  ? "border-zinc-500 bg-zinc-700 text-white"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              All
            </button>
            <button
              onClick={() => toggleType("credits")}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedTypes.has("credits")
                  ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Credits
            </button>
            <button
              onClick={() => toggleType("inventory")}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedTypes.has("inventory")
                  ? "border-purple-500/50 bg-purple-500/20 text-purple-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => toggleType("renewals")}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedTypes.has("renewals")
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Renewals
            </button>
            <button
              onClick={() => toggleType("points")}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedTypes.has("points")
                  ? "border-red-500/50 bg-red-500/20 text-red-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              Points
            </button>
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
          {selectedTypes.has("credits") && (
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

      </div>

      {/* Items List */}
      {allItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400 mb-2">No upcoming items</p>
          <p className="text-zinc-500 text-sm">
            {selectedTypes.size < ALL_TYPES.length
              ? "Try selecting more types."
              : "Check back later."}
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
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-white">{group.label}</h3>
                    <span className="text-xs text-zinc-500">
                      {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Bucket Totals */}
                    <div className="flex items-center gap-3 text-xs">
                      {group.totals.credits > 0 && (
                        <span className="text-blue-400">${Math.round(group.totals.credits).toLocaleString()}</span>
                      )}
                      {group.totals.inventory > 0 && (
                        <span className="text-purple-400">${Math.round(group.totals.inventory).toLocaleString()}</span>
                      )}
                      {group.totals.fees > 0 && (
                        <span className="text-amber-400">${Math.round(group.totals.fees).toLocaleString()}</span>
                      )}
                      {group.totals.points > 0 && (
                        <span className="text-red-400">{group.totals.points.toLocaleString()} pts</span>
                      )}
                    </div>
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
                    {group.items.map((item, idx) => {
                      if (item.type === "credit-group") {
                        return (
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
                        );
                      } else if (item.type === "inventory-group") {
                        return (
                          <InventorySubGroup
                            key={item.data.key}
                            subGroup={item.data}
                            isExpanded={expandedInventoryGroups.has(item.data.key)}
                            onToggle={() => toggleInventoryGroup(item.data.key)}
                            showPlayer={hasMultiplePlayers}
                            players={players}
                            onHideItem={onHideItem}
                          />
                        );
                      } else {
                        return (
                          <UpcomingItem
                            key={`${item.type}-${idx}`}
                            item={item}
                            showPlayer={hasMultiplePlayers}
                            players={players}
                            onMarkCreditUsed={onMarkCreditUsed}
                            onToggleCreditHidden={onToggleCreditHidden}
                            onHideItem={onHideItem}
                          />
                        );
                      }
                    })}
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
