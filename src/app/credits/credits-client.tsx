"use client";

import { useState, useMemo } from "react";
import { MarkUsedModal } from "./mark-used-modal";
import { CreditCard } from "./credit-card";
import { CreditHistoryRow } from "./credit-history-row";
import { parseLocalDate } from "@/lib/utils";

export interface WalletCard {
  id: string;
  card_id: string;
  display_name: string;
  card_name: string;
  approval_date: string | null;
}

export interface Credit {
  id: string;
  card_id: string;
  name: string;
  brand_name: string | null;
  reset_cycle: string;
  reset_day_of_month: number | null;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  notes: string | null;
  renewal_period_months: number | null;
  must_be_earned: boolean;
  credit_count?: number;
}

// Extended credit with slot information for multi-use credits
export interface CreditWithSlot extends Credit {
  slotNumber: number; // 1-indexed slot number (e.g., 1 of 2)
  totalSlots: number; // Total number of slots for this credit
  displayName: string; // Display name including slot info (e.g., "The Edit (1 of 2)")
}

export interface LinkedTransaction {
  id: string;
  name: string;
  amount_cents: number;
  date: string;
  merchant_name: string | null;
}

export interface UsageTransaction {
  id: string;
  amount_cents: number;
  transaction_id: string | null;
  user_plaid_transactions: LinkedTransaction | null;
}

export interface CreditUsage {
  id: string;
  user_wallet_id: string;
  credit_id: string;
  period_start: string;
  period_end: string;
  amount_used: number;
  perceived_value_cents: number | null;
  notes: string | null;
  used_at: string;
  auto_detected?: boolean | null;
  is_clawback?: boolean | null;
  slot_number?: number;
  user_credit_usage_transactions?: UsageTransaction[];
}

export interface CreditSettings {
  id: string;
  user_wallet_id: string;
  credit_id: string;
  is_hidden: boolean;
  user_value_override_cents: number | null;
  notes: string | null;
  is_auto_repeat?: boolean | null;
}

interface CreditsClientProps {
  walletCards: WalletCard[];
  credits: Credit[];
  creditUsage: CreditUsage[];
  creditSettings: CreditSettings[];
  onMarkUsed: (formData: FormData) => Promise<void>;
  onDeleteUsage: (usageId: string) => Promise<void>;
  onUpdateSettings: (formData: FormData) => Promise<void>;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
}

type SortMode = "card" | "brand" | "expiration";
type ViewMode = "current" | "history";

// Priority for sorting by expiration within groups (lower = expires sooner)
const CYCLE_PRIORITY: Record<string, number> = {
  monthly: 1,
  quarterly: 2,
  semiannual: 3,
  annual: 4,
  cardmember_year: 5,
  usage_based: 6,
};

// Get expiration bucket label for a credit (current view - uses current date)
function getExpirationBucket(credit: Credit, walletCard: WalletCard): { key: string; label: string; sortOrder: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Get the period end date based on reset cycle
  let endDate: Date;

  if (credit.reset_cycle === "monthly") {
    endDate = new Date(year, month + 1, 0);
    const monthName = endDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { key: `monthly-${year}-${month}`, label: monthName, sortOrder: endDate.getTime() };
  } else if (credit.reset_cycle === "quarterly") {
    const q = Math.floor(month / 3);
    endDate = new Date(year, (q + 1) * 3, 0);
    const qYear = endDate.getFullYear();
    const qNum = Math.floor(endDate.getMonth() / 3) + 1;
    return { key: `quarterly-${qYear}-Q${qNum}`, label: `Q${qNum} ${qYear}`, sortOrder: endDate.getTime() };
  } else if (credit.reset_cycle === "semiannual") {
    const h = month < 6 ? 0 : 1;
    endDate = new Date(year, (h + 1) * 6, 0);
    const hYear = endDate.getFullYear();
    const hNum = endDate.getMonth() < 6 ? 1 : 2;
    return { key: `semiannual-${hYear}-H${hNum}`, label: `H${hNum} ${hYear}`, sortOrder: endDate.getTime() };
  } else if (credit.reset_cycle === "annual") {
    endDate = new Date(year, 11, 31);
    return { key: `annual-${year}`, label: `${year} Annual`, sortOrder: endDate.getTime() };
  } else if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
    const approval = parseLocalDate(walletCard.approval_date);
    let nextAnniversary = new Date(year, approval.getMonth(), approval.getDate());
    if (nextAnniversary <= now) {
      nextAnniversary = new Date(year + 1, approval.getMonth(), approval.getDate());
    }
    // Use month/year as key to group all cardmember credits expiring in the same month
    const annMonth = nextAnniversary.getMonth();
    const annYear = nextAnniversary.getFullYear();
    const monthName = nextAnniversary.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { key: `cardmember-${annYear}-${annMonth}`, label: monthName, sortOrder: nextAnniversary.getTime() };
  } else if (credit.reset_cycle === "usage_based") {
    // Usage-based credits go in a separate bucket
    return { key: "usage_based", label: "Usage-Based", sortOrder: Number.MAX_SAFE_INTEGER };
  }

  // Default fallback
  return { key: "other", label: "Other", sortOrder: Number.MAX_SAFE_INTEGER };
}

export function CreditsClient({
  walletCards,
  credits,
  creditUsage,
  creditSettings,
  onMarkUsed,
  onDeleteUsage,
  onUpdateSettings,
  onUpdateApprovalDate,
}: CreditsClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>("expiration");
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [showHidden, setShowHidden] = useState(false);
  const [hideUsed, setHideUsed] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [markUsedModal, setMarkUsedModal] = useState<{
    credit: CreditWithSlot;
    walletCard: WalletCard;
    periodStart: string;
    periodEnd: string;
  } | null>(null);

  // Build wallet card map
  const walletCardMap = useMemo(() => {
    const map = new Map<string, WalletCard>();
    walletCards.forEach(wc => map.set(wc.id, wc));
    return map;
  }, [walletCards]);

  // Build card_id to wallet entries map
  const cardToWalletEntries = useMemo(() => {
    const map = new Map<string, WalletCard[]>();
    walletCards.forEach(wc => {
      if (!map.has(wc.card_id)) {
        map.set(wc.card_id, []);
      }
      map.get(wc.card_id)!.push(wc);
    });
    return map;
  }, [walletCards]);

  // Build settings map
  const settingsMap = useMemo(() => {
    const map = new Map<string, CreditSettings>();
    creditSettings.forEach(s => {
      map.set(`${s.user_wallet_id}:${s.credit_id}`, s);
    });
    return map;
  }, [creditSettings]);

  // Build usage map
  const usageMap = useMemo(() => {
    const map = new Map<string, CreditUsage[]>();
    creditUsage.forEach(u => {
      const key = `${u.user_wallet_id}:${u.credit_id}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(u);
    });
    return map;
  }, [creditUsage]);

  // Calculate current period end date for a credit
  const getCurrentPeriodEnd = (credit: Credit, walletCard: WalletCard): Date => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (credit.reset_cycle === "monthly") {
      return new Date(year, month + 1, 0);
    } else if (credit.reset_cycle === "quarterly") {
      const q = Math.floor(month / 3);
      return new Date(year, (q + 1) * 3, 0);
    } else if (credit.reset_cycle === "semiannual") {
      const h = month < 6 ? 0 : 1;
      return new Date(year, (h + 1) * 6, 0);
    } else if (credit.reset_cycle === "annual") {
      return new Date(year, 11, 31);
    } else if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
      const approval = parseLocalDate(walletCard.approval_date);
      let nextAnniversary = new Date(year, approval.getMonth(), approval.getDate());
      if (nextAnniversary <= now) {
        nextAnniversary = new Date(year + 1, approval.getMonth(), approval.getDate());
      }
      return nextAnniversary;
    }
    // usage_based or unknown
    return new Date(year + 10, 11, 31);
  };

  // Check if a credit slot is fully used in current period
  // For multi-count credits, each slot is checked independently
  const isFullyUsed = (credit: CreditWithSlot, walletCard: WalletCard, usage: CreditUsage[]): boolean => {
    const periodStart = getCurrentPeriodStart(credit, walletCard);
    const maxAmount = credit.default_quantity ?? 1;
    
    // Compare dates as strings to avoid timezone issues
    const periodStartStr = periodStart.toISOString().split("T")[0];
    const currentUsage = usage.filter(u => u.period_start === periodStartStr);
    
    const totalUsed = currentUsage.reduce((sum, u) => sum + u.amount_used, 0);
    return totalUsed >= maxAmount;
  };

  // Calculate current period start date
  const getCurrentPeriodStart = (credit: Credit, walletCard: WalletCard): Date => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (credit.reset_cycle === "monthly") {
      return new Date(year, month, 1);
    } else if (credit.reset_cycle === "quarterly") {
      const q = Math.floor(month / 3);
      return new Date(year, q * 3, 1);
    } else if (credit.reset_cycle === "semiannual") {
      const h = month < 6 ? 0 : 1;
      return new Date(year, h * 6, 1);
    } else if (credit.reset_cycle === "annual") {
      return new Date(year, 0, 1);
    } else if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
      const approval = parseLocalDate(walletCard.approval_date);
      const startYear = approval.getFullYear();
      const yearsElapsed = year - startYear;
      const start = new Date(startYear + yearsElapsed, approval.getMonth(), approval.getDate());
      if (start > now) {
        start.setFullYear(start.getFullYear() - 1);
      }
      return start;
    }
    return new Date(year, 0, 1);
  };

  // Combine credits with wallet cards and sort by expiration
  // Expands multi-count credits (credit_count > 1) into separate visual rows
  const userCredits = useMemo(() => {
    const result: Array<{
      credit: CreditWithSlot;
      walletCard: WalletCard;
      settings: CreditSettings | null;
      usage: CreditUsage[];
      periodEnd: Date;
    }> = [];

    for (const credit of credits) {
      const walletEntries = cardToWalletEntries.get(credit.card_id) ?? [];
      for (const walletCard of walletEntries) {
        const key = `${walletCard.id}:${credit.id}`;
        const settings = settingsMap.get(key) ?? null;
        const allUsage = usageMap.get(key) ?? [];

        // Filter out hidden credits unless showHidden is true
        if (!showHidden && settings?.is_hidden) continue;

        const periodEnd = getCurrentPeriodEnd(credit, walletCard);
        const totalSlots = credit.credit_count ?? 1;

        // Expand multi-count credits into separate visual rows
        for (let slotNumber = 1; slotNumber <= totalSlots; slotNumber++) {
          // Filter usage to only this slot
          const slotUsage = allUsage.filter(u => {
            // If there's only one slot or the usage doesn't have slot_number, include it for slot 1
            const usageSlot = (u as CreditUsage & { slot_number?: number }).slot_number ?? 1;
            return usageSlot === slotNumber;
          });

          // Create display name with slot info if multi-slot
          const displayName = totalSlots > 1 
            ? `${credit.name} (${slotNumber} of ${totalSlots})`
            : credit.name;

          const creditWithSlot: CreditWithSlot = {
            ...credit,
            slotNumber,
            totalSlots,
            displayName,
          };

          result.push({ 
            credit: creditWithSlot, 
            walletCard, 
            settings, 
            usage: slotUsage, 
            periodEnd 
          });
        }
      }
    }

    // Sort by expiration (soonest first), then by cycle priority
    result.sort((a, b) => {
      const priorityA = CYCLE_PRIORITY[a.credit.reset_cycle] ?? 10;
      const priorityB = CYCLE_PRIORITY[b.credit.reset_cycle] ?? 10;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (a.periodEnd.getTime() !== b.periodEnd.getTime()) {
        return a.periodEnd.getTime() - b.periodEnd.getTime();
      }
      // Sort by slot number within the same credit
      if (a.credit.id === b.credit.id && a.walletCard.id === b.walletCard.id) {
        return a.credit.slotNumber - b.credit.slotNumber;
      }
      return 0;
    });

    return result;
  }, [credits, cardToWalletEntries, settingsMap, usageMap, showHidden]);

  // Effective sort mode - force card/brand in history view
  const effectiveSortMode = viewMode === "history" && sortMode === "expiration" ? "card" : sortMode;

  // Group credits based on sort mode and view mode
  const groupedCredits = useMemo(() => {
    const groups = new Map<string, { label: string; credits: typeof userCredits; sortOrder: number }>();

    // Filter credits based on hideUsed (only in current view)
    const visibleCredits = viewMode === "current" && hideUsed
      ? userCredits.filter(item => !isFullyUsed(item.credit, item.walletCard, item.usage))
      : userCredits;

    for (const item of visibleCredits) {
      let key: string;
      let label: string;
      let sortOrder: number = 0;

      if (effectiveSortMode === "card") {
        key = item.walletCard.id;
        label = item.walletCard.display_name;
      } else if (effectiveSortMode === "brand") {
        // Group by brand first, then by credit name if multiple cards have same credit
        if (item.credit.brand_name) {
          // Has a brand - group by brand
          key = `brand:${item.credit.brand_name.toLowerCase()}`;
          label = item.credit.brand_name;
        } else {
          // No brand - check if this credit name appears on multiple cards
          const creditName = item.credit.name;
          const sameNameCredits = visibleCredits.filter(c => c.credit.name === creditName && !c.credit.brand_name);
          if (sameNameCredits.length > 1) {
            // Multiple cards have this credit - group by credit name
            key = `credit:${creditName.toLowerCase()}`;
            label = creditName;
          } else {
            // Single occurrence - put in "Not Grouped"
            key = "not-grouped";
            label = "Not Grouped";
          }
        }
      } else {
        // expiration mode (current view only)
        const bucket = getExpirationBucket(item.credit, item.walletCard);
        key = bucket.key;
        label = bucket.label;
        sortOrder = bucket.sortOrder;
      }

      if (!groups.has(key)) {
        groups.set(key, { label, credits: [], sortOrder });
      }
      groups.get(key)!.credits.push(item);
    }

    const result = Array.from(groups.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      credits: data.credits.sort((a, b) => a.credit.name.localeCompare(b.credit.name)),
      sortOrder: data.sortOrder,
    }));

    // Sort groups: by sortOrder for expiration mode, alphabetically otherwise
    if (effectiveSortMode === "expiration") {
      result.sort((a, b) => a.sortOrder - b.sortOrder);
    } else if (effectiveSortMode === "brand") {
      // For brand mode: sort alphabetically but put "Not Grouped" last
      result.sort((a, b) => {
        if (a.key === "not-grouped") return 1;
        if (b.key === "not-grouped") return -1;
        return a.label.localeCompare(b.label);
      });
    } else {
      result.sort((a, b) => a.label.localeCompare(b.label));
    }

    return result;
  }, [userCredits, effectiveSortMode, viewMode, hideUsed]);

  // Calculate totals based on visible credits
  // Credits Used: includes ALL credits (even hidden ones)
  // Credits Left: excludes hidden credits
  // For multi-slot credits, each slot contributes its share of the total value
  const totals = useMemo(() => {
    let creditsUsed = 0;
    let creditsLeft = 0;

    for (const item of userCredits) {
      const maxAmount = item.credit.default_quantity ?? 1;
      const periodStart = getCurrentPeriodStart(item.credit, item.walletCard);
      
      // Compare dates as strings to avoid timezone issues
      const periodStartStr = periodStart.toISOString().split("T")[0];
      const currentUsage = item.usage.filter(u => u.period_start === periodStartStr);
      
      const totalUsed = currentUsage.reduce((sum, u) => sum + u.amount_used, 0);
      const remaining = Math.max(0, maxAmount - totalUsed);
      
      // For multi-slot credits, divide the effective value by total slots
      // so each slot contributes its fair share
      const baseValue = item.settings?.user_value_override_cents ?? item.credit.default_value_cents;
      const effectiveValue = baseValue ? baseValue / item.credit.totalSlots : null;
      
      if (effectiveValue) {
        const usedValue = (totalUsed / maxAmount) * effectiveValue;
        const remainingValue = (remaining / maxAmount) * effectiveValue;
        
        // Credits Used always includes everything (even hidden)
        creditsUsed += usedValue;
        
        // Credits Left excludes hidden credits
        const isHidden = item.settings?.is_hidden ?? false;
        if (!isHidden) {
          creditsLeft += remainingValue;
        }
      }
    }

    return { creditsUsed, creditsLeft };
  }, [userCredits]);

  const handleMarkUsed = (credit: CreditWithSlot, walletCard: WalletCard, periodStart: string, periodEnd: string) => {
    setMarkUsedModal({ credit, walletCard, periodStart, periodEnd });
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Sort by:</span>
            <select
              value={viewMode === "history" && sortMode === "expiration" ? "card" : sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {viewMode === "current" && <option value="expiration">Expiration</option>}
              <option value="card">Card</option>
              <option value="brand">Brand/Credit</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">View:</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="current">Active</option>
              <option value="history">History</option>
            </select>
          </div>

          {viewMode === "history" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
              >
                &lt;
              </button>
              <span className="text-sm text-emerald-400 font-medium min-w-[4rem] text-center">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
              >
                &gt;
              </button>
            </div>
          )}

          {viewMode === "current" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideUsed}
                onChange={(e) => setHideUsed(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-400">Hide used</span>
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-400">Show hidden</span>
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
              onClick={() => setCollapsedGroups(new Set(groupedCredits.map(g => g.key)))}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
              title="Collapse all"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-zinc-500">Credits Used</div>
            <div className="text-lg font-semibold text-emerald-400">
              ${Math.round(totals.creditsUsed / 100).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Credits Left</div>
            <div className="text-lg font-semibold text-amber-400">
              ${Math.round(totals.creditsLeft / 100).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Credits List */}
      {groupedCredits.length === 0 || userCredits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400 mb-2">No credits to track.</p>
          <p className="text-zinc-500 text-sm">
            Credits will appear here once cards with credits are added to your wallet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedCredits.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key);
            return (
              <div key={group.key} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => {
                    setCollapsedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(group.key)) {
                        next.delete(group.key);
                      } else {
                        next.add(group.key);
                      }
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between bg-zinc-800/50 px-4 py-2 border-b border-zinc-700 hover:bg-zinc-800/70 transition-colors"
                >
                  <h3 className="font-medium text-white">{group.label}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{group.credits.length} credit{group.credits.length !== 1 ? 's' : ''}</span>
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
                    {group.credits.map((item) => (
                      viewMode === "history" ? (
                        <CreditHistoryRow
                          key={`${item.walletCard.id}:${item.credit.id}:${item.credit.slotNumber}`}
                          credit={item.credit}
                          walletCard={item.walletCard}
                          settings={item.settings}
                          usage={item.usage}
                          selectedYear={selectedYear}
                          onMarkUsed={onMarkUsed}
                          onDeleteUsage={onDeleteUsage}
                          onOpenModal={handleMarkUsed}
                          onUpdateApprovalDate={onUpdateApprovalDate}
                          onUpdateSettings={onUpdateSettings}
                          showCardName={sortMode !== "card"}
                        />
                      ) : (
                        <CreditCard
                          key={`${item.walletCard.id}:${item.credit.id}:${item.credit.slotNumber}`}
                          credit={item.credit}
                          walletCard={item.walletCard}
                          settings={item.settings}
                          usage={item.usage}
                          viewMode={viewMode}
                          selectedYear={selectedYear}
                          onMarkUsed={handleMarkUsed}
                          onMarkUsedDirect={onMarkUsed}
                          onDeleteUsage={onDeleteUsage}
                          onUpdateSettings={onUpdateSettings}
                          onUpdateApprovalDate={onUpdateApprovalDate}
                          showCardName={sortMode !== "card"}
                          hideUsed={hideUsed}
                        />
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mark Used Modal */}
      {markUsedModal && (
        <MarkUsedModal
          credit={markUsedModal.credit}
          walletCard={markUsedModal.walletCard}
          periodStart={markUsedModal.periodStart}
          periodEnd={markUsedModal.periodEnd}
          currentSettings={creditSettings.find(
            s => s.user_wallet_id === markUsedModal.walletCard.id && s.credit_id === markUsedModal.credit.id
          ) ?? null}
          onClose={() => setMarkUsedModal(null)}
          onSubmit={onMarkUsed}
          onUpdateSettings={onUpdateSettings}
        />
      )}
    </div>
  );
}
