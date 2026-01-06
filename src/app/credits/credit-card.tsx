"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import { Credit, CreditWithSlot, CreditUsage, CreditSettings, WalletCard, UsageTransaction } from "./credits-client";
import { parseLocalDate } from "@/lib/utils";
import { LinkedTransactionModal } from "./linked-transaction-modal";

// Tooltip component - appears on hover (desktop) or tap (mobile)
// Smart positioning: appears above by default, below if not enough space
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const ref = useRef<HTMLSpanElement>(null);
  const justOpenedRef = useRef(false);

  // Check position on open and update if needed
  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // If less than 60px from top of viewport, show below
      setPosition(rect.top < 60 ? "below" : "above");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const handleClick = () => {
    if (!isOpen) {
      justOpenedRef.current = true;
    }
    setIsOpen(!isOpen);
  };

  const positionClasses = position === "above" 
    ? "bottom-full mb-1" 
    : "top-full mt-1";

  return (
    <span 
      ref={ref}
      className="relative group/tooltip inline-flex"
      onClick={handleClick}
      onMouseEnter={() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setPosition(rect.top < 60 ? "below" : "above");
        }
      }}
    >
      {children}
      <span className={`pointer-events-none absolute left-0 ${positionClasses} px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-600 rounded shadow-lg min-w-48 max-w-sm z-[100] transition-opacity duration-75 whitespace-normal ${isOpen ? "opacity-100" : "opacity-0 group-hover/tooltip:opacity-100"}`}>
        {text}
      </span>
    </span>
  );
}

// Component to display linked Plaid transactions
function LinkedTransactions({ 
  transactions, 
  isClawback 
}: { 
  transactions: UsageTransaction[];
  isClawback: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(transactions.length <= 2);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
  };

  const formatAmount = (cents: number) => {
    const dollars = Math.abs(cents) / 100;
    return `$${dollars.toFixed(2)}`;
  };

  const visibleTransactions = isExpanded ? transactions : transactions.slice(0, 2);

  return (
    <div className="pl-11 space-y-1">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isClawback ? "text-amber-400" : "text-emerald-400/70"}`}>
          {isClawback ? "Clawback detected" : "Detected from Plaid"}
          {transactions.length > 1 && ` (${transactions.length} transactions)`}
        </span>
        {transactions.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            {isExpanded ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        {visibleTransactions.map((utxn, idx) => {
          const txn = utxn.user_plaid_transactions;
          if (!txn) return null;
          
          const isLast = idx === visibleTransactions.length - 1 && (isExpanded || transactions.length <= 2);
          const prefix = isLast ? "└─" : "├─";
          
          return (
            <div 
              key={utxn.id}
              className="flex items-center gap-2 text-xs text-zinc-500"
            >
              <span className="text-zinc-600 font-mono">{prefix}</span>
              <span className={isClawback ? "text-amber-400/70" : "text-emerald-400/70"}>
                {formatAmount(txn.amount_cents)}
              </span>
              <span className="truncate max-w-[200px]" title={txn.name}>
                "{txn.name}"
              </span>
              <span className="text-zinc-600">on {formatDate(txn.date)}</span>
            </div>
          );
        })}
        {!isExpanded && transactions.length > 2 && (
          <div className="text-xs text-zinc-600 pl-4">
            ... and {transactions.length - 2} more
          </div>
        )}
      </div>
    </div>
  );
}

interface CreditCardProps {
  credit: CreditWithSlot;
  walletCard: WalletCard;
  settings: CreditSettings | null;
  usage: CreditUsage[];
  viewMode: "current" | "history";
  selectedYear: number;
  historyPeriodStart?: string;
  historyPeriodEnd?: string;
  onMarkUsed: (credit: CreditWithSlot, walletCard: WalletCard, periodStart: string, periodEnd: string) => void;
  onMarkUsedDirect: (formData: FormData) => Promise<void>;
  onDeleteUsage: (usageId: string) => Promise<void>;
  onUpdateSettings: (formData: FormData) => Promise<void>;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
  onUpdateUsagePeriod?: (usageId: string, newDate: string) => Promise<void>;
  showCardName: boolean;
  hideUsed: boolean;
}

interface Period {
  start: Date;
  end: Date;
  label: string;
  shortLabel: string;
}

export function CreditCard({
  credit,
  walletCard,
  settings,
  usage,
  viewMode,
  selectedYear,
  historyPeriodStart,
  historyPeriodEnd,
  onMarkUsed,
  onMarkUsedDirect,
  onDeleteUsage,
  onUpdateSettings,
  onUpdateApprovalDate,
  onUpdateUsagePeriod,
  showCardName,
  hideUsed,
}: CreditCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsNotes, setSettingsNotes] = useState(settings?.notes ?? "");
  const [valueOverride, setValueOverride] = useState(
    settings?.user_value_override_cents ? (settings.user_value_override_cents / 100).toString() : ""
  );
  const [isAutoRepeat, setIsAutoRepeat] = useState(settings?.is_auto_repeat ?? false);
  const [approvalDate, setApprovalDate] = useState(walletCard.approval_date ?? "");
  const [usageBasedDate, setUsageBasedDate] = useState("");
  const [showUsageBasedSetup, setShowUsageBasedSetup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedTransactionModal, setLinkedTransactionModal] = useState<{
    usage: CreditUsage;
    periodLabel: string;
  } | null>(null);

  // Get the most recent usage for usage_based credits
  const lastUsage = useMemo(() => {
    if (credit.reset_cycle !== "usage_based") return null;
    const sorted = [...usage].sort((a, b) => 
      parseLocalDate(b.used_at).getTime() - parseLocalDate(a.used_at).getTime()
    );
    return sorted[0] ?? null;
  }, [credit.reset_cycle, usage]);

  const isUsageBased = credit.reset_cycle === "usage_based";
  const needsApprovalDate = credit.reset_cycle === "cardmember_year" && !walletCard.approval_date;

  // Check if usage-based credit has been set up (either marked as used or "never used")
  const usageBasedIsSetUp = isUsageBased && (lastUsage !== null || settings?.notes === "NEVER_USED");

  // Calculate next reset date for display
  const nextResetDate = useMemo((): { date: Date; label: string } | null => {
    const now = new Date();

    if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
      const approval = parseLocalDate(walletCard.approval_date);
      let nextAnniversary = new Date(now.getFullYear(), approval.getMonth(), approval.getDate());
      if (nextAnniversary <= now) {
        nextAnniversary = new Date(now.getFullYear() + 1, approval.getMonth(), approval.getDate());
      }
      return {
        date: nextAnniversary,
        label: nextAnniversary.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    }

    if (credit.reset_cycle === "usage_based" && lastUsage && credit.renewal_period_months) {
      const lastUsedDate = parseLocalDate(lastUsage.used_at);
      const nextReset = new Date(lastUsedDate);
      nextReset.setMonth(nextReset.getMonth() + credit.renewal_period_months);
      return {
        date: nextReset,
        label: nextReset.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
    }

    return null;
  }, [credit.reset_cycle, credit.renewal_period_months, walletCard.approval_date, lastUsage]);

  // For usage-based credits that haven't reset yet, hide from current view
  const usageBasedNotAvailable = useMemo(() => {
    if (!isUsageBased || !lastUsage || !credit.renewal_period_months) return false;
    if (viewMode === "history") return false;
    
    const lastUsedDate = parseLocalDate(lastUsage.used_at);
    const nextReset = new Date(lastUsedDate);
    nextReset.setMonth(nextReset.getMonth() + credit.renewal_period_months);
    return new Date() < nextReset;
  }, [isUsageBased, lastUsage, credit.renewal_period_months, viewMode]);

  // Generate current period based on reset cycle
  // In history view, use the provided historyPeriodStart/End instead
  const currentPeriod = useMemo((): Period | null => {
    // If history period is provided, use it directly
    if (historyPeriodStart && historyPeriodEnd) {
      const start = new Date(historyPeriodStart + "T00:00:00");
      const end = new Date(historyPeriodEnd + "T00:00:00");
      const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const shortLabel = start.toLocaleDateString("en-US", { month: "short" });
      return { start, end, label, shortLabel };
    }
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (credit.reset_cycle === "monthly") {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start, end, label: start.toLocaleDateString("en-US", { month: "long" }), shortLabel: start.toLocaleDateString("en-US", { month: "short" }) };
    } else if (credit.reset_cycle === "quarterly") {
      const q = Math.floor(month / 3);
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, (q + 1) * 3, 0);
      return { start, end, label: `Q${q + 1} ${year}`, shortLabel: `Q${q + 1}` };
    } else if (credit.reset_cycle === "semiannual") {
      const h = month < 6 ? 0 : 1;
      const start = new Date(year, h * 6, 1);
      const end = new Date(year, (h + 1) * 6, 0);
      return { start, end, label: `H${h + 1} ${year}`, shortLabel: `H${h + 1}` };
    } else if (credit.reset_cycle === "annual") {
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31), label: `${year}`, shortLabel: `${year}` };
    } else if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
      const approval = parseLocalDate(walletCard.approval_date);
      const startYear = approval.getFullYear();
      const yearsElapsed = year - startYear;
      const start = new Date(startYear + yearsElapsed, approval.getMonth(), approval.getDate());
      if (start > now) {
        start.setFullYear(start.getFullYear() - 1);
      }
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return { start, end, label: `Year ${yearsElapsed + 1}`, shortLabel: `Year ${yearsElapsed + 1}` };
    } else if (credit.reset_cycle === "usage_based") {
      if (lastUsage && credit.renewal_period_months) {
        const lastUsedDate = parseLocalDate(lastUsage.used_at);
        const nextReset = new Date(lastUsedDate);
        nextReset.setMonth(nextReset.getMonth() + credit.renewal_period_months);
        return { start: lastUsedDate, end: nextReset, label: "Current", shortLabel: "Current" };
      }
      return { start: new Date(year, 0, 1), end: new Date(year + 10, 11, 31), label: "Available", shortLabel: "Available" };
    }

    return null;
  }, [credit.reset_cycle, credit.renewal_period_months, walletCard.approval_date, lastUsage, historyPeriodStart, historyPeriodEnd]);

  // Check if current period has usage
  const currentPeriodUsage = useMemo(() => {
    if (!currentPeriod) return 0;
    const periodUsage = usage.filter(u => {
      // Compare dates as strings (YYYY-MM-DD) to avoid timezone issues
      const periodStartStr = currentPeriod.start.toISOString().split("T")[0];
      return u.period_start === periodStartStr;
    });
    return periodUsage.reduce((sum, u) => sum + u.amount_used, 0);
  }, [currentPeriod, usage]);

  // Get current period usage records (for detecting linked transactions)
  const currentPeriodUsageRecords = useMemo(() => {
    if (!currentPeriod) return [];
    const periodStartStr = currentPeriod.start.toISOString().split("T")[0];
    return usage.filter(u => u.period_start === periodStartStr);
  }, [currentPeriod, usage]);

  // Check if any current period usage has linked transactions (auto-detected)
  const hasLinkedTransactions = useMemo(() => {
    return currentPeriodUsageRecords.some(u => 
      u.auto_detected && 
      u.user_credit_usage_transactions && 
      u.user_credit_usage_transactions.length > 0
    );
  }, [currentPeriodUsageRecords]);

  const maxAmount = credit.default_quantity ?? 1;
  const isFullyUsed = currentPeriodUsage >= maxAmount;

  // If hideUsed is true and credit is fully used, don't render
  if (hideUsed && isFullyUsed && viewMode === "current") {
    return null;
  }

  // If usage-based credit is not available yet, hide from current view
  if (usageBasedNotAvailable) {
    return null;
  }

  // Format the interval label
  const formatIntervalLabel = () => {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      semiannual: "Semi-Annual",
      annual: "Annual - Calendar Year",
      cardmember_year: "Annual - Cardmember Year",
    };
    if (credit.reset_cycle === "usage_based" && credit.renewal_period_months) {
      const years = credit.renewal_period_months / 12;
      if (years === Math.floor(years)) {
        return `Every ${years} Year${years > 1 ? 's' : ''}`;
      }
      return `Every ${credit.renewal_period_months} Months`;
    }
    return labels[credit.reset_cycle] || credit.reset_cycle;
  };

  // Format expiration date for current period
  const formatExpiration = () => {
    if (!currentPeriod) return null;
    if (credit.reset_cycle === "usage_based") {
      if (lastUsage && nextResetDate) {
        return `Resets ${nextResetDate.label}`;
      }
      return "Available now";
    }
    return `Resets ${currentPeriod.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  // Pluralize unit name with proper rules
  const pluralizeUnit = (count: number, unitName: string) => {
    if (count === 1) return unitName;
    // Already plural (ends with s but not ss/sh/ch/x/z patterns that need es)
    if (unitName.endsWith("s") && !unitName.endsWith("ss") && !unitName.endsWith("Pass")) {
      return unitName;
    }
    // Words ending in s, ss, sh, ch, x, z need "es"
    if (/(?:s|ss|sh|ch|x|z)$/i.test(unitName)) {
      return `${unitName}es`;
    }
    return `${unitName}s`;
  };

  // Format credit value display
  const formatValue = () => {
    const effectiveValue = settings?.user_value_override_cents ?? credit.default_value_cents;
    if (effectiveValue) {
      return `$${(effectiveValue / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (credit.default_quantity && credit.unit_name) {
      return `${credit.default_quantity.toLocaleString()} ${pluralizeUnit(credit.default_quantity, credit.unit_name)}`;
    }
    if (credit.default_quantity) {
      return credit.default_quantity.toLocaleString();
    }
    return "—";
  };

  // Format remaining for current period
  const formatRemaining = () => {
    const defaultAmount = credit.default_quantity ?? 1;
    const remaining = defaultAmount - currentPeriodUsage;
    
    if (credit.default_value_cents) {
      const totalValue = settings?.user_value_override_cents ?? credit.default_value_cents;
      const remainingValue = (remaining / defaultAmount) * totalValue;
      return `$${(remainingValue / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    
    if (credit.unit_name) {
      return `${remaining.toLocaleString()} ${pluralizeUnit(remaining, credit.unit_name)}`;
    }
    
    return remaining.toLocaleString();
  };

  const handleSaveSettings = async () => {
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("is_hidden", settings?.is_hidden ? "true" : "false");
    formData.set("user_value_override", valueOverride);
    formData.set("notes", settingsNotes);
    formData.set("is_auto_repeat", isAutoRepeat ? "true" : "false");
    await onUpdateSettings(formData);
    setShowSettings(false);
  };

  const handleToggleHidden = async () => {
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("is_hidden", settings?.is_hidden ? "false" : "true");
    formData.set("user_value_override", valueOverride);
    formData.set("notes", settingsNotes);
    formData.set("is_auto_repeat", isAutoRepeat ? "true" : "false");
    await onUpdateSettings(formData);
  };

  const handleSaveApprovalDate = () => {
    if (!approvalDate) return;
    startTransition(async () => {
      await onUpdateApprovalDate(walletCard.id, approvalDate || null);
    });
  };

  const handleSetNeverUsed = async () => {
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("is_hidden", "false");
    formData.set("user_value_override", "");
    formData.set("notes", "NEVER_USED");
    formData.set("is_auto_repeat", "false");
    startTransition(async () => {
      await onUpdateSettings(formData);
      setShowUsageBasedSetup(false);
    });
  };

  const handleSetLastUsedDate = async () => {
    if (!usageBasedDate) return;
    // For usage-based credits, use the selected date as the period start
    // and calculate the end based on renewal period
    const selectedDate = new Date(usageBasedDate);
    const periodEnd = new Date(selectedDate);
    if (credit.renewal_period_months) {
      periodEnd.setMonth(periodEnd.getMonth() + credit.renewal_period_months);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 4); // Default to 4 years if not set
    }
    
    // Build FormData and submit directly (no modal needed for initial setup)
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("period_start", usageBasedDate);
    formData.set("period_end", periodEnd.toISOString().split("T")[0]);
    // For initial setup, mark full credit as used
    const maxAmount = credit.default_quantity ?? 1;
    formData.set("amount_used", maxAmount.toString());
    formData.set("used_at", usageBasedDate);
    
    startTransition(async () => {
      await onMarkUsedDirect(formData);
      setShowUsageBasedSetup(false);
    });
  };

  // Usage-based credit setup prompt
  if (isUsageBased && !usageBasedIsSetUp && viewMode === "current") {
    return (
      <div className={`px-4 py-3 flex items-center justify-between ${settings?.is_hidden ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">{credit.displayName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 whitespace-nowrap">
                {formatIntervalLabel()}
              </span>
            </div>
            {showCardName && (
              <div className="text-sm text-zinc-500 mt-0.5">{walletCard.display_name}</div>
            )}
          </div>
        </div>

        {showUsageBasedSetup ? (
          <div className="flex items-center gap-2 ml-4">
            <input
              type="date"
              value={usageBasedDate}
              onChange={(e) => setUsageBasedDate(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleSetLastUsedDate}
              disabled={!usageBasedDate || isPending}
              className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Set"}
            </button>
            <button
              onClick={() => setShowUsageBasedSetup(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setShowUsageBasedSetup(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
            >
              Set last used date
            </button>
            <button
              onClick={handleSetNeverUsed}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Never used
            </button>
          </div>
        )}
      </div>
    );
  }

  // Approval date setup prompt for cardmember_year credits
  if (needsApprovalDate) {
    return (
      <div className={`px-4 py-3 ${settings?.is_hidden ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-medium text-white">{credit.displayName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300">
            {formatIntervalLabel()}
          </span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-900/20 border border-amber-800/50">
          <span className="text-xs text-amber-400">Set approval date for {walletCard.display_name}:</span>
          <input
            type="date"
            value={approvalDate}
            onChange={(e) => setApprovalDate(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleSaveApprovalDate}
            disabled={!approvalDate || isPending}
            className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-3 ${settings?.is_hidden ? "opacity-50" : ""}`}>
      {/* Main Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Credit Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mark Used Button / Status */}
          {isFullyUsed ? (
            <button
              onClick={() => {
                // If has linked transactions, open modal to view them
                // Otherwise, immediately unmark by deleting the usage
                const usageWithTxns = currentPeriodUsageRecords.find(u => 
                  u.auto_detected && 
                  u.user_credit_usage_transactions && 
                  u.user_credit_usage_transactions.length > 0
                );
                if (usageWithTxns && currentPeriod) {
                  setLinkedTransactionModal({
                    usage: usageWithTxns,
                    periodLabel: currentPeriod.label,
                  });
                } else if (currentPeriodUsageRecords.length > 0) {
                  // Manually marked - unmark by deleting the first usage record
                  onDeleteUsage(currentPeriodUsageRecords[0].id);
                }
              }}
              className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 hover:bg-emerald-500 transition-colors cursor-pointer relative group"
              title={hasLinkedTransactions ? "View linked transaction" : "Click to unmark"}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {/* Link icon overlay for auto-detected credits */}
              {hasLinkedTransactions && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              )}
            </button>
          ) : currentPeriodUsage > 0 ? (
            <button
              onClick={() => currentPeriod && onMarkUsed(credit, walletCard, currentPeriod.start.toISOString().split("T")[0], currentPeriod.end.toISOString().split("T")[0])}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center flex-shrink-0 hover:from-emerald-500 hover:to-emerald-700 transition-all"
              title="Partially used - click to add more"
            >
              <span className="text-xs font-bold text-white">+</span>
            </button>
          ) : (
            <button
              onClick={() => currentPeriod && onMarkUsed(credit, walletCard, currentPeriod.start.toISOString().split("T")[0], currentPeriod.end.toISOString().split("T")[0])}
              className="w-8 h-8 rounded-lg border-2 border-zinc-600 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-all group"
              title="Mark as used"
            >
              <svg className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}

          {/* Credit Name & Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${isFullyUsed ? "text-zinc-400 line-through" : "text-white"}`}>
                {credit.displayName}
              </span>
              {credit.notes && (
                <Tooltip text={credit.notes}>
                  <span className="cursor-help text-amber-500 hover:text-amber-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </Tooltip>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 whitespace-nowrap">
                {formatIntervalLabel()}
              </span>
            </div>
            {showCardName && (
              <div className="text-sm text-zinc-500 mt-0.5">{walletCard.display_name}</div>
            )}
            {settings?.notes && settings.notes !== "NEVER_USED" && (
              <div className="text-xs text-sky-400/70 mt-0.5 italic truncate">{settings.notes}</div>
            )}
          </div>
        </div>

        {/* Right: Value & Expiration */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Expiration */}
          {viewMode === "current" && (
            <div className="text-xs text-zinc-500 hidden sm:block">
              {formatExpiration()}
            </div>
          )}

          {/* Value */}
          <div className="text-right">
            {isFullyUsed ? (
              <div className="text-sm text-emerald-400 font-medium">{formatValue()}</div>
            ) : currentPeriodUsage > 0 ? (
              <div className="text-sm">
                <span className="text-zinc-400">{formatRemaining()}</span>
                <span className="text-zinc-600"> / {formatValue()}</span>
              </div>
            ) : (
              <div className="text-sm text-zinc-300">{formatValue()}</div>
            )}
            {settings?.user_value_override_cents && credit.default_value_cents && (
              <div className="text-xs text-amber-500">
                Your value: ${(settings.user_value_override_cents / 100).toFixed(0)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={handleToggleHidden}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title={settings?.is_hidden ? "Unhide" : "Hide"}
            >
              {settings?.is_hidden ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Undo button and linked transactions for used credits */}
      {currentPeriodUsage > 0 && usage.length > 0 && (
        <div className="mt-2 space-y-2">
          {usage
            .filter(u => {
              if (!currentPeriod) return false;
              const periodStartStr = currentPeriod.start.toISOString().split("T")[0];
              return u.period_start === periodStartStr;
            })
            .map((u) => (
              <div key={u.id} className="space-y-1">
                {/* Show linked transactions if auto-detected */}
                {u.auto_detected && u.user_credit_usage_transactions && u.user_credit_usage_transactions.length > 0 && (
                  <LinkedTransactions 
                    transactions={u.user_credit_usage_transactions}
                    isClawback={u.is_clawback || false}
                  />
                )}
                <button
                  onClick={() => onDeleteUsage(u.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {u.auto_detected ? "Unlink" : "Undo"}
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Your Perceived Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={valueOverride}
                onChange={(e) => setValueOverride(e.target.value)}
                placeholder={credit.default_value_cents ? `Default: $${(credit.default_value_cents / 100).toFixed(0)}` : ""}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Notes</label>
              <input
                type="text"
                value={settingsNotes === "NEVER_USED" ? "" : settingsNotes}
                onChange={(e) => setSettingsNotes(e.target.value)}
                placeholder="e.g., Billing card for sister's Clear"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          
          {credit.reset_cycle !== "usage_based" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAutoRepeat}
                onChange={(e) => setIsAutoRepeat(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-zinc-300">Automatically mark used each period</span>
            </label>
          )}

          <button
            onClick={handleSaveSettings}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Save Settings
          </button>
        </div>
      )}

      {/* Linked Transaction Modal */}
      {linkedTransactionModal && (
        <LinkedTransactionModal
          usage={linkedTransactionModal.usage}
          credit={credit}
          walletCard={walletCard}
          periodLabel={linkedTransactionModal.periodLabel}
          onClose={() => setLinkedTransactionModal(null)}
          onUnlink={() => {
            onDeleteUsage(linkedTransactionModal.usage.id);
            setLinkedTransactionModal(null);
          }}
          onUpdatePeriod={onUpdateUsagePeriod ? async (newDate: string) => {
            await onUpdateUsagePeriod(linkedTransactionModal.usage.id, newDate);
            setLinkedTransactionModal(null);
          } : undefined}
        />
      )}
    </div>
  );
}
