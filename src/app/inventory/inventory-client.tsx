"use client";

import { useState, useMemo } from "react";
import { InventoryItem } from "./inventory-item";
import { AddInventoryModal } from "./add-inventory-modal";

export interface InventoryType {
  id: string;
  name: string;
  slug: string;
  tracking_type: string;
  display_order: number | null;
}

export interface InventoryItemData {
  id: string;
  type_id: string;
  name: string;
  brand: string | null;
  expiration_date: string | null;
  no_expiration: boolean;
  code: string | null;
  pin: string | null;
  url: string | null;
  notes: string | null;
  quantity: number | null;
  quantity_used: number | null;
  original_value_cents: number | null;
  remaining_value_cents: number | null;
  is_used: boolean;
  used_at: string | null;
  source_credit_usage_id: string | null;
  created_at: string;
  inventory_types: {
    id: string;
    name: string;
    slug: string;
    tracking_type: string;
  } | null;
}

interface InventoryClientProps {
  inventoryItems: InventoryItemData[];
  inventoryTypes: InventoryType[];
  brandSuggestions: string[];
  onAddItem: (formData: FormData) => Promise<void>;
  onUpdateItem: (itemId: string, formData: FormData) => Promise<void>;
  onUseItem: (itemId: string, formData: FormData) => Promise<void>;
  onMarkUnused: (itemId: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
}

type GroupBy = "expiration" | "brand" | "type";

// Helper to get quarter from month (0-indexed)
function getQuarter(month: number): number {
  return Math.floor(month / 3) + 1;
}

// Helper to get quarter label with year suffix
function getQuarterLabel(quarter: number, year: number): string {
  const yearSuffix = `'${String(year).slice(-2)}`;
  return `Q${quarter} ${yearSuffix}`;
}

// Get expiration bucket for grouping
function getExpirationBucket(date: string | null): { key: string; label: string; sortOrder: number } {
  if (!date) {
    return { key: "no-expiration", label: "No Expiration", sortOrder: Number.MAX_SAFE_INTEGER };
  }

  const now = new Date();
  const expDate = new Date(date + "T00:00:00");
  const diffMs = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Expired items
  if (diffDays < 0) {
    return { key: "expired", label: "Expired", sortOrder: -1 };
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentQuarter = getQuarter(currentMonth);
  const expYear = expDate.getFullYear();
  const expMonth = expDate.getMonth();
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
      return { key: `year-${nextYear}`, label: String(nextYear), sortOrder: 30 };
    }
  }

  // Future years - show as whole years
  // Sort order: 30 + (year - currentYear) to keep them in order
  const yearOffset = expYear - currentYear;
  return { key: `year-${expYear}`, label: String(expYear), sortOrder: 30 + yearOffset };
}

export function InventoryClient({
  inventoryItems,
  inventoryTypes,
  brandSuggestions,
  onAddItem,
  onUpdateItem,
  onUseItem,
  onMarkUnused,
  onDeleteItem,
}: InventoryClientProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>("expiration");
  const [filterType, setFilterType] = useState<string>("all");
  const [showUsed, setShowUsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      // Filter by type
      if (filterType !== "all" && item.type_id !== filterType) {
        return false;
      }
      // Filter by used status
      if (!showUsed && item.is_used) {
        return false;
      }
      return true;
    });
  }, [inventoryItems, filterType, showUsed]);

  // Group items
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { label: string; items: InventoryItemData[]; sortOrder: number }>();

    for (const item of filteredItems) {
      let key: string;
      let label: string;
      let sortOrder: number = 0;

      if (groupBy === "expiration") {
        const bucket = getExpirationBucket(item.expiration_date);
        key = bucket.key;
        label = bucket.label;
        sortOrder = bucket.sortOrder;
      } else if (groupBy === "brand") {
        if (item.brand) {
          key = `brand:${item.brand.toLowerCase()}`;
          label = item.brand;
        } else {
          key = "no-brand";
          label = "No Brand";
        }
      } else {
        // type
        const typeName = item.inventory_types?.name ?? "Unknown";
        key = `type:${item.type_id}`;
        label = typeName;
        sortOrder = item.inventory_types ? 0 : 999;
      }

      if (!groups.has(key)) {
        groups.set(key, { label, items: [], sortOrder });
      }
      groups.get(key)!.items.push(item);
    }

    // Sort items within each group by expiration, then alphabetically for no-expiration items
    for (const group of groups.values()) {
      group.items.sort((a, b) => {
        if (!a.expiration_date && !b.expiration_date) {
          return a.name.localeCompare(b.name);
        }
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
      });
    }

    // Convert to array and sort groups
    const result = Array.from(groups.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      items: data.items,
      sortOrder: data.sortOrder,
    }));

    if (groupBy === "expiration") {
      result.sort((a, b) => a.sortOrder - b.sortOrder);
    } else if (groupBy === "brand") {
      result.sort((a, b) => {
        if (a.key === "no-brand") return 1;
        if (b.key === "no-brand") return -1;
        return a.label.localeCompare(b.label);
      });
    } else {
      result.sort((a, b) => a.label.localeCompare(b.label));
    }

    return result;
  }, [filteredItems, groupBy]);

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

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="expiration">Expiration</option>
              <option value="brand">Brand</option>
              <option value="type">Type</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              {inventoryTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUsed}
              onChange={(e) => setShowUsed(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-400">Show used</span>
          </label>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsedGroups(new Set())}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
              title="Expand all"
            >
              Expand
            </button>
            <span className="text-zinc-600">|</span>
            <button
              onClick={() => setCollapsedGroups(new Set(groupedItems.map(g => g.key)))}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
              title="Collapse all"
            >
              Collapse
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Inventory List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400 mb-2">No inventory items to display.</p>
          <p className="text-zinc-500 text-sm mb-4">
            {inventoryItems.length === 0
              ? "Add gift cards, free nights, lounge visits, and more to track them here."
              : "Try adjusting your filters or showing used items."}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedItems.map((group) => {
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
                    {group.items.map((item) => (
                      <InventoryItem
                        key={item.id}
                        item={item}
                        inventoryTypes={inventoryTypes}
                        brandSuggestions={brandSuggestions}
                        showBrand={groupBy !== "brand"}
                        showType={groupBy !== "type"}
                        onUpdateItem={onUpdateItem}
                        onUseItem={onUseItem}
                        onMarkUnused={onMarkUnused}
                        onDeleteItem={onDeleteItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddInventoryModal
          inventoryTypes={inventoryTypes}
          brandSuggestions={brandSuggestions}
          onClose={() => setShowAddModal(false)}
          onSubmit={onAddItem}
        />
      )}
    </div>
  );
}

