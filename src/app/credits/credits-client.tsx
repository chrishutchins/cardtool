"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { MarkUsedModal } from "./mark-used-modal";
import { CreditCard } from "./credit-card";
import { CreditHistoryRow } from "./credit-history-row";
import { parseLocalDate } from "@/lib/utils";

// Prompt to add earned credit to inventory
function AddToInventoryPrompt({
  credit,
  usageId,
  walletCard,
  inventoryTypes,
  onClose,
  onSubmit,
}: {
  credit: Credit;
  usageId?: string;
  walletCard?: WalletCard;
  inventoryTypes: InventoryType[];
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  
  const inventoryType = inventoryTypes.find(t => t.id === credit.inventory_type_id);
  
  // Close if inventory type not found - must use useEffect for side effects
  useEffect(() => {
    if (!inventoryType) {
      onClose();
    }
  }, [inventoryType, onClose]);
  
  if (!inventoryType) {
    return null;
  }

  const handleAddToInventory = () => {
    startTransition(async () => {
      // Build form data with prefilled values
      const formData = new FormData();
      formData.set("type_id", credit.inventory_type_id ?? "");
      formData.set("name", credit.name);
      formData.set("brand", credit.brand_name ?? "");
      // Leave expiration_date blank - user will set it later
      formData.set("expiration_date", "");
      formData.set("code", "");
      formData.set("pin", "");
      formData.set("url", "");
      formData.set("notes", "");
      
      // Set value/quantity based on tracking type
      if (inventoryType.tracking_type === "dollar_value" && credit.default_value_cents) {
        formData.set("original_value", String(credit.default_value_cents / 100));
      }
      if (inventoryType.tracking_type === "quantity" && credit.default_quantity) {
        formData.set("quantity", String(credit.default_quantity));
      } else {
        formData.set("quantity", "1");
      }
      
      // Link to the credit usage
      if (usageId) {
        formData.set("source_credit_usage_id", usageId);
      }
      
      // Link to the source wallet card (for player auto-population)
      if (walletCard) {
        formData.set("source_wallet_id", walletCard.id);
      }
      
      await onSubmit(formData);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Credit Earned!</h2>
            <p className="text-sm text-zinc-400">{credit.name}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-300">
            Would you like to add this to your inventory as a <strong className="text-white">{inventoryType.name}</strong>?
          </p>
          <p className="text-xs text-zinc-500">
            You can set the expiration date and other details from the Inventory page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={handleAddToInventory}
              disabled={isPending}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add to Inventory"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface WalletCard {
  id: string;
  card_id: string;
  display_name: string;
  card_name: string;
  approval_date: string | null;
  closed_date: string | null;
  player_number: number | null;
}

export interface Player {
  player_number: number;
  description: string | null;
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
  inventory_type_id?: string | null;
}

export interface InventoryType {
  id: string;
  name: string;
  slug: string;
  tracking_type: string;
  display_order: number | null;
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
  original_description: string | null;
  amount_cents: number;
  date: string;
  authorized_date?: string | null;
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

interface RematchResult {
  success: boolean;
  matched?: number;
  clawbacks?: number;
  message?: string;
  error?: string;
  errors?: string[];
}

interface CreditsClientProps {
  walletCards: WalletCard[];
  credits: Credit[];
  creditUsage: CreditUsage[];
  creditSettings: CreditSettings[];
  inventoryTypes: InventoryType[];
  players: Player[];
  isAdmin?: boolean;
  accountLinkingEnabled?: boolean;
  onMarkUsed: (formData: FormData) => Promise<void>;
  onDeleteUsage: (usageId: string) => Promise<void>;
  onUpdateSettings: (formData: FormData) => Promise<void>;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
  onUpdateUsagePeriod?: (usageId: string, newDate: string) => Promise<void>;
  onMoveTransaction?: (transactionId: string, newDate: string) => Promise<void>;
  onAddInventoryItem: (formData: FormData) => Promise<void>;
  onRematch?: (forceRematch?: boolean) => Promise<RematchResult>;
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
  inventoryTypes,
  players,
  isAdmin = false,
  accountLinkingEnabled = false,
  onMarkUsed,
  onDeleteUsage,
  onUpdateSettings,
  onUpdateApprovalDate,
  onUpdateUsagePeriod,
  onMoveTransaction,
  onAddInventoryItem,
  onRematch,
}: CreditsClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>("expiration");
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [showHidden, setShowHidden] = useState(false);
  const [hideUsed, setHideUsed] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [playerFilter, setPlayerFilter] = useState<number | "all">("all");
  const [markUsedModal, setMarkUsedModal] = useState<{
    credit: CreditWithSlot;
    walletCard: WalletCard;
    periodStart: string;
    periodEnd: string;
  } | null>(null);
  const [inventoryPrompt, setInventoryPrompt] = useState<{
    credit: Credit;
    usageId?: string;
    walletCard?: WalletCard;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const hasMultiplePlayers = players.length > 1;
  
  // Rematch credits (admin only)
  const handleRematch = async (force: boolean = false) => {
    if (!onRematch) return;
    setIsRematching(true);
    setSyncMessage(null);
    try {
      const result = await onRematch(force);
      if (result.success) {
        if (result.matched === 0 && result.clawbacks === 0) {
          setSyncMessage(result.message || "No transactions to match");
        } else {
          setSyncMessage(`Matched ${result.matched} credits, ${result.clawbacks} clawbacks`);
        }
      } else {
        setSyncMessage(result.error || "Rematch failed");
      }
    } catch (err) {
      setSyncMessage("Rematch failed");
    } finally {
      setIsRematching(false);
    }
  };

  // Sync transactions from Plaid (what they already have)
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch("/api/plaid/sync-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: true }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        setSyncMessage(`Sync failed: ${response.status}${errorText ? ` - ${errorText}` : ""}`);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        const parts = [];
        if (data.transactionsAdded > 0) parts.push(`${data.transactionsAdded} added`);
        if (data.transactionsModified > 0) parts.push(`${data.transactionsModified} modified`);
        if (data.transactionsRemoved > 0) parts.push(`${data.transactionsRemoved} removed`);
        if (data.creditsMatched > 0) parts.push(`${data.creditsMatched} credits matched`);
        setSyncMessage(parts.length > 0 ? `Synced: ${parts.join(", ")}` : "Already up to date");
        // Refresh the page to show new data
        if (data.transactionsAdded > 0 || data.creditsMatched > 0) {
          window.location.reload();
        }
      } else {
        setSyncMessage(data.error || "Sync failed");
      }
    } catch {
      setSyncMessage("Sync failed");
    } finally {
      setIsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Refresh data from banks (admin only - triggers new data pull)
  const handleRefreshFromBank = async () => {
    setIsRefreshing(true);
    setSyncMessage(null);
    try {
      const response = await fetch("/api/plaid/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        setSyncMessage(`Refresh failed: ${response.status}${errorText ? ` - ${errorText}` : ""}`);
        return;
      }
      
      const data = await response.json();
      if (data.success || data.refreshed > 0) {
        setSyncMessage(data.message || `Refresh triggered for ${data.refreshed} institution(s)`);
        // After refresh, trigger a sync to get the new data
        setTimeout(() => handleSync(), 2000);
      } else {
        setSyncMessage(data.error || "Refresh failed");
      }
    } catch {
      setSyncMessage("Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

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
    const maxAmount = credit.default_quantity ?? 1;
    const now = new Date();
    const nowStr = now.toISOString().split("T")[0];
    
    // For usage_based credits (like Global Entry), check if period_end has passed
    // If it has, the credit is available for a new usage period
    if (credit.reset_cycle === "usage_based") {
      // Find usage records where period_end is still in the future
      const activeUsage = usage.filter(u => u.period_end >= nowStr);
      const totalUsed = activeUsage.reduce((sum, u) => sum + u.amount_used, 0);
      return totalUsed >= maxAmount;
    }
    
    // For regular credits, compare against the calculated period start
    const periodStart = getCurrentPeriodStart(credit, walletCard);
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
      isClosed: boolean;
    }> = [];

    for (const credit of credits) {
      const walletEntries = cardToWalletEntries.get(credit.card_id) ?? [];
      for (const walletCard of walletEntries) {
        const key = `${walletCard.id}:${credit.id}`;
        const settings = settingsMap.get(key) ?? null;
        const allUsage = usageMap.get(key) ?? [];

        // Filter out hidden credits unless showHidden is true
        if (!showHidden && settings?.is_hidden) continue;
        
        // Filter by player if filter is active
        if (playerFilter !== "all" && walletCard.player_number !== playerFilter) continue;

        const periodEnd = getCurrentPeriodEnd(credit, walletCard);
        const totalSlots = credit.credit_count ?? 1;
        const isClosed = !!walletCard.closed_date;

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
            periodEnd,
            isClosed,
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
  }, [credits, cardToWalletEntries, settingsMap, usageMap, showHidden, playerFilter]);

  // Effective sort mode - force card/brand in history view
  const effectiveSortMode = viewMode === "history" && sortMode === "expiration" ? "card" : sortMode;

  // Group credits based on sort mode and view mode
  const groupedCredits = useMemo(() => {
    const groups = new Map<string, { label: string; credits: typeof userCredits; sortOrder: number }>();

    // Filter credits based on view mode and other filters
    let visibleCredits = userCredits;
    
    // In current (Active) view: filter out closed cards entirely
    if (viewMode === "current") {
      visibleCredits = visibleCredits.filter(item => !item.isClosed);
      // Also filter out fully used credits if hideUsed is enabled
      if (hideUsed) {
        visibleCredits = visibleCredits.filter(item => !isFullyUsed(item.credit, item.walletCard, item.usage));
      }
    }
    // In history view: keep all credits (including closed cards) for historical display

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

  // Calculate totals based on view mode
  // Active view: current period used/left
  // History view: selected year used/left
  // Credits Left always excludes hidden credits
  // For multi-slot credits, each slot contributes its share of the total value
  //
  // IMPORTANT: Three types of credits based on how amount_used is interpreted:
  // 1. Usage-based credits (reset_cycle = "usage_based"): amount_used is a COUNT (1 = used once = full value)
  // 2. Dollar credits (default_value_cents !== null): amount_used is the DOLLAR amount (e.g., 300 = $300)
  // 3. Quantity credits (default_value_cents === null): amount_used is a COUNT, use perceived_value_cents
  const totals = useMemo(() => {
    let creditsUsed = 0;
    let creditsLeft = 0;

    // Helper to calculate used value in cents based on credit type
    const calculateUsedValueCents = (
      credit: Credit,
      usage: CreditUsage[],
      effectiveValue: number | null
    ): number => {
      const totalUsedAmount = usage.reduce((sum, u) => sum + u.amount_used, 0);
      
      // Usage-based credits (like Global Entry): amount_used is a count, multiply by credit value
      if (credit.reset_cycle === "usage_based" && effectiveValue) {
        return totalUsedAmount * effectiveValue;
      }
      
      // Dollar credits: amount_used is already in dollars, convert to cents
      if (credit.default_value_cents !== null) {
        return totalUsedAmount * 100;
      }
      
      // Quantity credits: use perceived_value_cents if available
      return usage.reduce((sum, u) => sum + (u.perceived_value_cents ?? 0), 0);
    };

    if (viewMode === "current") {
      // Active view: calculate for current period
      for (const item of userCredits) {
        // Skip closed cards for totals calculation
        if (item.isClosed) continue;

        const periodStart = getCurrentPeriodStart(item.credit, item.walletCard);
        
        // Compare dates as strings to avoid timezone issues
        const periodStartStr = periodStart.toISOString().split("T")[0];
        const currentUsage = item.usage.filter(u => u.period_start === periodStartStr);
        
        // For multi-slot credits, divide the effective value by total slots
        const baseValue = item.settings?.user_value_override_cents ?? item.credit.default_value_cents;
        const effectiveValue = baseValue ? baseValue / item.credit.totalSlots : null;
        
        const usedValueCents = calculateUsedValueCents(item.credit, currentUsage, effectiveValue);
        creditsUsed += usedValueCents;
        
        // Calculate remaining for credits with dollar values
        if (effectiveValue) {
          const remainingValueCents = Math.max(0, effectiveValue - usedValueCents);
          const isHidden = item.settings?.is_hidden ?? false;
          if (!isHidden) {
            creditsLeft += remainingValueCents;
          }
        }
      }
    } else {
      // History view: calculate for selected year
      for (const item of userCredits) {
        const baseValue = item.settings?.user_value_override_cents ?? item.credit.default_value_cents;
        const effectiveValue = baseValue ? baseValue / item.credit.totalSlots : null;
        const isHidden = item.settings?.is_hidden ?? false;
        
        // Filter usage to selected year
        const yearUsage = item.usage.filter(u => {
          const usedDate = new Date(u.used_at);
          return usedDate.getFullYear() === selectedYear;
        });
        
        const usedValueCents = calculateUsedValueCents(item.credit, yearUsage, effectiveValue);
        creditsUsed += usedValueCents;
        
        // Calculate remaining based on how much could have been used this year
        if (effectiveValue && !isHidden) {
          let periodsPerYear = 1;
          switch (item.credit.reset_cycle) {
            case "monthly": periodsPerYear = 12; break;
            case "quarterly": periodsPerYear = 4; break;
            case "semiannual": periodsPerYear = 2; break;
            case "annual": 
            case "cardmember_year": 
            case "usage_based":
            default: periodsPerYear = 1; break;
          }
          
          const yearlyValueCents = effectiveValue * periodsPerYear;
          const remainingValueCents = Math.max(0, yearlyValueCents - usedValueCents);
          creditsLeft += remainingValueCents;
        }
      }
    }

    return { creditsUsed, creditsLeft };
  }, [userCredits, viewMode, selectedYear]);

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

          {/* Player Filter */}
          {hasMultiplePlayers && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Player:</span>
              <select
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Players</option>
                {players.map(p => (
                  <option key={p.player_number} value={p.player_number}>
                    {p.description || `P${p.player_number}`}
                  </option>
                ))}
              </select>
            </div>
          )}

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

        {/* Sync Controls & Totals */}
        <div className="flex items-center gap-4">
          {/* Sync Buttons - only show when Plaid is enabled */}
          {accountLinkingEnabled && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing || isRefreshing}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync transactions from Plaid"
              >
                <svg
                  className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isSyncing ? "Syncing..." : "Sync"}
              </button>
              
              {isAdmin && (
                <button
                  onClick={handleRefreshFromBank}
                  disabled={isSyncing || isRefreshing}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Trigger fresh data pull from banks (admin only)"
                >
                  <svg
                    className={`w-4 h-4 ${isRefreshing ? "animate-pulse" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  {isRefreshing ? "Refreshing..." : "Refresh Banks"}
                </button>
              )}
              
              {isAdmin && onRematch && (
                <>
                  <button
                    onClick={() => handleRematch(false)}
                    disabled={isSyncing || isRefreshing || isRematching}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Re-run credit matching on unmatched transactions (admin only)"
                  >
                    <svg
                      className={`w-4 h-4 ${isRematching ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    {isRematching ? "Matching..." : "Rematch"}
                  </button>
                  <button
                    onClick={() => handleRematch(true)}
                    disabled={isSyncing || isRefreshing || isRematching}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear all existing matches and re-run matching (admin only)"
                  >
                    <svg
                      className={`w-4 h-4 ${isRematching ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Force Rematch
                  </button>
                </>
              )}
            </div>
          )}

          {/* Sync Status Message */}
          {accountLinkingEnabled && syncMessage && (
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
              {syncMessage}
            </span>
          )}

          {/* Totals */}
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-right">
              <div className="text-xs text-zinc-500">
                {viewMode === "history" ? `${selectedYear} Used` : "Credits Used"}
              </div>
              <div className="text-lg font-semibold text-emerald-400">
                ${Math.round(totals.creditsUsed / 100).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">
                {viewMode === "history" ? `${selectedYear} Unused` : "Credits Left"}
              </div>
              <div className="text-lg font-semibold text-amber-400">
                ${Math.round(totals.creditsLeft / 100).toLocaleString()}
              </div>
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
                          onUpdateCreditUsagePeriod={onUpdateUsagePeriod}
                          onMoveTransaction={onMoveTransaction}
                          showCardName={sortMode !== "card"}
                          players={players}
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
                          onUpdateUsagePeriod={onUpdateUsagePeriod}
                          onMoveTransaction={onMoveTransaction}
                          showCardName={sortMode !== "card"}
                          hideUsed={hideUsed}
                          players={players}
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
          onSubmit={async (formData) => {
            await onMarkUsed(formData);
            // Check if this is a must_be_earned credit with an inventory type
            const credit = markUsedModal.credit;
            if (credit.must_be_earned && credit.inventory_type_id) {
              setInventoryPrompt({ credit, walletCard: markUsedModal.walletCard });
            }
          }}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Add to Inventory Prompt Modal */}
      {inventoryPrompt && (
        <AddToInventoryPrompt
          credit={inventoryPrompt.credit}
          walletCard={inventoryPrompt.walletCard}
          inventoryTypes={inventoryTypes}
          onClose={() => setInventoryPrompt(null)}
          onSubmit={onAddInventoryItem}
        />
      )}
    </div>
  );
}
