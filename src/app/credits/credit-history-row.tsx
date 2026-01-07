"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { Credit, CreditWithSlot, CreditUsage, CreditSettings, WalletCard } from "./credits-client";
import { parseLocalDate } from "@/lib/utils";
import { LinkedTransactionModal } from "./linked-transaction-modal";

/**
 * Format dollar amount compactly:
 * - >= $10: no decimals (e.g., $299)
 * - < $10: show decimals unless .00 (e.g., $7.50, but $7 not $7.00)
 */
function formatCompactDollar(amount: number): string {
  if (amount >= 10) {
    return Math.floor(amount).toString();
  }
  if (amount % 1 === 0) {
    return amount.toString();
  }
  return amount.toFixed(2);
}

// Tooltip component for notes
function Tooltip({ children, text }: { children: React.ReactNode; text: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const ref = useRef<HTMLSpanElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
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
    if (!isOpen) justOpenedRef.current = true;
    setIsOpen(!isOpen);
  };

  const positionClasses = position === "above" ? "bottom-full mb-1" : "top-full mt-1";

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

interface CreditHistoryRowProps {
  credit: CreditWithSlot;
  walletCard: WalletCard;
  settings: CreditSettings | null;
  usage: CreditUsage[];
  selectedYear: number;
  onMarkUsed: (formData: FormData) => Promise<void>;
  onDeleteUsage: (usageId: string) => Promise<void>;
  onOpenModal: (credit: CreditWithSlot, walletCard: WalletCard, periodStart: string, periodEnd: string) => void;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
  onUpdateSettings: (formData: FormData) => Promise<void>;
  onUpdateCreditUsagePeriod?: (usageId: string, newDate: string) => Promise<void>;
  onMoveTransaction?: (transactionId: string, newDate: string) => Promise<void>;
  showCardName: boolean;
}

interface Period {
  key: string;
  label: string;
  shortLabel: string;
  start: string;
  end: string;
  colSpan: number; // How many columns this period spans (out of 12)
  colStart: number; // Which column this starts at (1-12)
  resetInfo?: string; // Info about reset date
}

// Generate periods for a credit based on its reset cycle
function getPeriodsForYear(credit: Credit, year: number, walletCard: WalletCard, usage: CreditUsage[]): Period[] {
  const periods: Period[] = [];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  if (credit.reset_cycle === "monthly") {
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 0);
      periods.push({
        key: `${year}-${m}`,
        label: monthLabels[m],
        shortLabel: monthLabels[m],
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        colSpan: 1,
        colStart: m + 1,
      });
    }
  } else if (credit.reset_cycle === "quarterly") {
    for (let q = 0; q < 4; q++) {
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, (q + 1) * 3, 0);
      periods.push({
        key: `${year}-Q${q + 1}`,
        label: `Q${q + 1}`,
        shortLabel: `Q${q + 1}`,
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        colSpan: 3,
        colStart: q * 3 + 1,
      });
    }
  } else if (credit.reset_cycle === "semiannual") {
    for (let h = 0; h < 2; h++) {
      const start = new Date(year, h * 6, 1);
      const end = new Date(year, (h + 1) * 6, 0);
      periods.push({
        key: `${year}-H${h + 1}`,
        label: `H${h + 1}`,
        shortLabel: `H${h + 1}`,
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        colSpan: 6,
        colStart: h * 6 + 1,
      });
    }
  } else if (credit.reset_cycle === "annual") {
    periods.push({
      key: `${year}-annual`,
      label: `${year}`,
      shortLabel: `${year}`,
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      colSpan: 12,
      colStart: 1,
    });
  } else if (credit.reset_cycle === "cardmember_year" && walletCard.approval_date) {
    // Cardmember year splits across calendar years
    const approval = parseLocalDate(walletCard.approval_date);
    const approvalMonth = approval.getMonth(); // 0-11
    
    // Calculate reset info
    const resetMonth = monthLabels[approvalMonth];
    const resetDay = approval.getDate();
    
    // Year abbreviation helper
    const yearShort = (y: number) => `'${String(y).slice(-2)}`;
    
    if (approvalMonth === 0) {
      // Approval in January - just one period for the whole year
      periods.push({
        key: `${year}-cardmember`,
        label: `${year}`,
        shortLabel: `${year}`,
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        colSpan: 12,
        colStart: 1,
        resetInfo: `Resets ${resetMonth} ${resetDay}`,
      });
    } else {
      // Two periods: Jan to approval month, and approval month to Dec
      // Period 1: Jan 1 to approval date - 1 (end of previous cardmember year, which started in previous year)
      const period1End = new Date(year, approvalMonth, approval.getDate() - 1);
      // This period is the end of a cardmember year that started in the previous year
      periods.push({
        key: `${year}-cardmember-1`,
        label: `${monthLabels[approvalMonth]} ${yearShort(year - 1)}-${monthLabels[approvalMonth - 1]} ${yearShort(year)}`,
        shortLabel: `${yearShort(year - 1)}/${yearShort(year)}`,
        start: `${year}-01-01`,
        end: period1End.toISOString().split("T")[0],
        colSpan: approvalMonth, // Spans from Jan to before approval month
        colStart: 1,
        resetInfo: `Resets ${resetMonth} ${resetDay}`,
      });
      
      // Period 2: Approval date to Dec 31 (start of current cardmember year, which ends next year)
      const period2Start = new Date(year, approvalMonth, approval.getDate());
      periods.push({
        key: `${year}-cardmember-2`,
        label: `${monthLabels[approvalMonth]} ${yearShort(year)}-${monthLabels[approvalMonth - 1]} ${yearShort(year + 1)}`,
        shortLabel: `${yearShort(year)}/${yearShort(year + 1)}`,
        start: period2Start.toISOString().split("T")[0],
        end: `${year}-12-31`,
        colSpan: 12 - approvalMonth, // Spans from approval month to Dec
        colStart: approvalMonth + 1,
        resetInfo: `Resets ${resetMonth} ${resetDay}`,
      });
    }
  } else if (credit.reset_cycle === "cardmember_year" && !walletCard.approval_date) {
    // No approval date set - show as full year with warning
    periods.push({
      key: `${year}-cardmember-nodate`,
      label: `${year}`,
      shortLabel: `${year}`,
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      colSpan: 12,
      colStart: 1,
      resetInfo: "Set approval date to track",
    });
  } else if (credit.reset_cycle === "usage_based") {
    // Find last usage to calculate reset date
    const sortedUsage = [...usage].sort((a, b) => 
      parseLocalDate(b.used_at).getTime() - parseLocalDate(a.used_at).getTime()
    );
    const lastUsage = sortedUsage[0];
    
    let resetInfo = "Never used";
    if (lastUsage && credit.renewal_period_months) {
      const lastUsedDate = parseLocalDate(lastUsage.used_at);
      const nextReset = new Date(lastUsedDate);
      nextReset.setMonth(nextReset.getMonth() + credit.renewal_period_months);
      resetInfo = `Resets ${nextReset.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    
    periods.push({
      key: `${year}-usage`,
      label: `${year}`,
      shortLabel: `${year}`,
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      colSpan: 12,
      colStart: 1,
      resetInfo,
    });
  }
  
  return periods;
}

export function CreditHistoryRow({
  credit,
  walletCard,
  settings,
  usage,
  selectedYear,
  onMarkUsed,
  onDeleteUsage,
  onOpenModal,
  onUpdateApprovalDate,
  onUpdateSettings,
  onUpdateCreditUsagePeriod,
  onMoveTransaction,
  showCardName,
}: CreditHistoryRowProps) {
  const [isPending, startTransition] = useTransition();
  const [showApprovalDateInput, setShowApprovalDateInput] = useState(false);
  const [approvalDateValue, setApprovalDateValue] = useState("");
  const [showUsageBasedSetup, setShowUsageBasedSetup] = useState(false);
  const [usageBasedDate, setUsageBasedDate] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isHidden, setIsHidden] = useState(settings?.is_hidden ?? false);
  const [valueOverride, setValueOverride] = useState(
    settings?.user_value_override_cents 
      ? (settings.user_value_override_cents / 100).toString() 
      : ""
  );
  const [userNotes, setUserNotes] = useState(settings?.notes ?? "");
  const [linkedTransactionModal, setLinkedTransactionModal] = useState<{
    usage: CreditUsage;
    periodLabel: string;
  } | null>(null);
  
  const mustBeEarned = credit.must_be_earned;
  const isUsageBased = credit.reset_cycle === "usage_based";
  
  // Check if usage-based credit is set up
  const usageBasedIsSetUp = isUsageBased && (usage.length > 0 || settings?.notes === "NEVER_USED");

  const periods = useMemo(() => getPeriodsForYear(credit, selectedYear, walletCard, usage), [credit, selectedYear, walletCard, usage]);

  // Check if a period has usage - matches by date overlap for cross-year periods
  const getUsageForPeriod = (periodStart: string, periodEnd: string): CreditUsage | undefined => {
    const periodStartDate = parseLocalDate(periodStart);
    const periodEndDate = parseLocalDate(periodEnd);
    
    return usage.find(u => {
      const usageStart = parseLocalDate(u.period_start);
      const usageEnd = parseLocalDate(u.period_end);
      
      // Check if the usage period overlaps with the display period
      // Usage overlaps if: usageStart <= periodEnd AND usageEnd >= periodStart
      return usageStart <= periodEndDate && usageEnd >= periodStartDate;
    });
  };

  // Get the max quantity for this credit (for quantity-based credits)
  const maxAmount = credit.default_quantity ?? 1;

  // Check if a period is fully used
  // For value-based credits, compare usage in cents to default_value_cents
  // For quantity-based credits, compare usage count to default_quantity
  const isFullyUsed = (periodUsage: CreditUsage | undefined): boolean => {
    if (!periodUsage) return false;
    if (credit.default_value_cents) {
      // Value-based: amount_used is in dollars, compare to value in cents
      return periodUsage.amount_used * 100 >= credit.default_value_cents;
    }
    // Quantity-based: compare to quantity (default 1)
    return periodUsage.amount_used >= maxAmount;
  };

  // Helper to check if a usage record has linked transactions
  const hasLinkedTransactions = (usageRecord: CreditUsage): boolean => {
    return !!(
      usageRecord.auto_detected &&
      usageRecord.user_credit_usage_transactions &&
      usageRecord.user_credit_usage_transactions.length > 0
    );
  };

  const handleTogglePeriod = (period: Period) => {
    const existingUsage = getUsageForPeriod(period.start, period.end);
    
    if (existingUsage) {
      if (isFullyUsed(existingUsage)) {
        // Fully used - check if it has linked transactions
        if (hasLinkedTransactions(existingUsage)) {
          // Show modal instead of immediately deleting
          setLinkedTransactionModal({
            usage: existingUsage,
            periodLabel: period.shortLabel,
          });
        } else {
          // No linked transactions - undo by deleting directly
          startTransition(async () => {
            await onDeleteUsage(existingUsage.id);
          });
        }
      } else {
        // Partially used - check if it has linked transactions
        if (hasLinkedTransactions(existingUsage)) {
          // Show linked transactions modal
          setLinkedTransactionModal({
            usage: existingUsage,
            periodLabel: period.shortLabel,
          });
        } else {
          // No linked transactions - open modal to modify
          onOpenModal(credit, walletCard, period.start, period.end);
        }
      }
    } else {
      // No usage - open modal to mark used
      onOpenModal(credit, walletCard, period.start, period.end);
    }
  };

  const handleSaveApprovalDate = () => {
    if (!approvalDateValue) return;
    startTransition(async () => {
      await onUpdateApprovalDate(walletCard.id, approvalDateValue);
      setShowApprovalDateInput(false);
      setApprovalDateValue("");
    });
  };

  const handleSetNeverUsed = async () => {
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("is_hidden", settings?.is_hidden ? "true" : "false");
    formData.set("user_value_override", settings?.user_value_override_cents ? (settings.user_value_override_cents / 100).toString() : "");
    formData.set("notes", "NEVER_USED");
    formData.set("is_auto_repeat", settings?.is_auto_repeat ? "true" : "false");
    startTransition(async () => {
      await onUpdateSettings(formData);
    });
  };

  const handleSetLastUsedDate = async () => {
    if (!usageBasedDate) return;
    // For usage-based credits, use the selected date as the period start
    const periodEnd = new Date(usageBasedDate);
    if (credit.renewal_period_months) {
      periodEnd.setMonth(periodEnd.getMonth() + credit.renewal_period_months);
    }
    
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
      await onMarkUsed(formData);
      setShowUsageBasedSetup(false);
      setUsageBasedDate("");
    });
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

  // Format credit value
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
    return "";
  };
  
  const handleSaveSettings = async () => {
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("is_hidden", isHidden ? "true" : "false");
    formData.set("user_value_override", valueOverride);
    formData.set("notes", userNotes);
    formData.set("is_auto_repeat", settings?.is_auto_repeat ? "true" : "false");
    
    startTransition(async () => {
      await onUpdateSettings(formData);
      setShowSettings(false);
    });
  };

  const handleToggleHide = () => {
    const newHiddenState = !isHidden;
    setIsHidden(newHiddenState);
    
    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("is_hidden", newHiddenState ? "true" : "false");
    formData.set("user_value_override", valueOverride);
    formData.set("notes", userNotes);
    formData.set("is_auto_repeat", settings?.is_auto_repeat ? "true" : "false");
    
    startTransition(async () => {
      await onUpdateSettings(formData);
    });
  };
  
  // Combine notes from credit and user settings
  const allNotes = [credit.notes, settings?.notes].filter(Boolean);

  // Calculate total used for the year - using date overlap matching
  const yearUsage = useMemo(() => {
    return periods.filter(p => getUsageForPeriod(p.start, p.end) !== undefined).length;
  }, [periods, usage]);

  // Get reset info from first period that has it
  const resetInfo = periods.find(p => p.resetInfo)?.resetInfo;

  return (
    <div className={`p-4 ${isPending ? "opacity-50" : ""} ${isHidden ? "opacity-50" : ""}`}>
      {/* Credit Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white">
            {credit.displayName}{formatValue() && ` - ${formatValue()}`}
          </span>
          {/* Notes Tooltip */}
          {allNotes.length > 0 && (
            <Tooltip 
              text={
                <div className="space-y-1">
                  {credit.notes && <p className="text-zinc-300">{credit.notes}</p>}
                  {settings?.notes && <p className="text-amber-400">{settings.notes}</p>}
                </div>
              }
            >
              <span className="text-amber-500 cursor-help">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </Tooltip>
          )}
          {showCardName && (
            <span className="text-sm text-zinc-500">({walletCard.display_name})</span>
          )}
          {resetInfo && resetInfo !== "Set approval date to track" && (
            <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
              {resetInfo}
            </span>
          )}
          {resetInfo === "Set approval date to track" && !showApprovalDateInput && (
            <button
              onClick={() => setShowApprovalDateInput(true)}
              className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors"
            >
              Set approval date to track
            </button>
          )}
          {showApprovalDateInput && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={approvalDateValue}
                onChange={(e) => setApprovalDateValue(e.target.value)}
                className="text-xs rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveApprovalDate}
                disabled={!approvalDateValue || isPending}
                className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowApprovalDateInput(false);
                  setApprovalDateValue("");
                }}
                className="text-xs px-2 py-1 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
          {/* Usage-based credit setup */}
          {isUsageBased && !usageBasedIsSetUp && !showUsageBasedSetup && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUsageBasedSetup(true)}
                className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors"
              >
                Set last used date
              </button>
              <button
                onClick={handleSetNeverUsed}
                disabled={isPending}
                className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Never used
              </button>
            </div>
          )}
          {showUsageBasedSetup && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={usageBasedDate}
                onChange={(e) => setUsageBasedDate(e.target.value)}
                className="text-xs rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSetLastUsedDate}
                disabled={!usageBasedDate || isPending}
                className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowUsageBasedSetup(false);
                  setUsageBasedDate("");
                }}
                className="text-xs px-2 py-1 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {yearUsage}/{periods.length} {mustBeEarned ? "earned" : "used"}
          </span>
          {/* Hide Button */}
          <button
            onClick={handleToggleHide}
            disabled={isPending}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title={isHidden ? "Unhide" : "Hide"}
          >
            {isHidden ? (
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
          {/* Settings Gear */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Credit settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Your value ($)</label>
            <input
              type="number"
              step="0.01"
              value={valueOverride}
              onChange={(e) => setValueOverride(e.target.value)}
              placeholder={credit.default_value_cents ? (credit.default_value_cents / 100).toString() : ""}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes</label>
            <input
              type="text"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Add a note..."
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSettings}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs px-3 py-1.5 text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Period Grid - 12 column layout */}
      <div className="grid grid-cols-12 gap-1">
        {periods.map((period) => {
          const periodUsage = getUsageForPeriod(period.start, period.end);
          const hasUsage = !!periodUsage;
          const fullyUsed = isFullyUsed(periodUsage);
          const partiallyUsed = hasUsage && !fullyUsed;
          const isLinked = periodUsage ? hasLinkedTransactions(periodUsage) : false;
          
          // Determine button state and styling
          let bgClass = "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white";
          let title = `Click to mark ${mustBeEarned ? "earned" : "used"}`;
          
          if (fullyUsed) {
            bgClass = "bg-emerald-600 text-white hover:bg-emerald-500";
            title = isLinked 
              ? `Auto-detected from Plaid - click to view details` 
              : `Fully ${mustBeEarned ? "earned" : "used"} - click to undo`;
          } else if (partiallyUsed) {
            bgClass = "bg-amber-500/60 text-white hover:bg-amber-500/80";
            const usedAmount = periodUsage!.amount_used;
            if (credit.default_value_cents) {
              const usedValue = (usedAmount / maxAmount) * credit.default_value_cents / 100;
              title = `Partially ${mustBeEarned ? "earned" : "used"} ($${usedValue.toLocaleString()}/$${(credit.default_value_cents / 100).toLocaleString()}) - click to modify`;
            } else {
              title = `Partially ${mustBeEarned ? "earned" : "used"} (${usedAmount.toLocaleString()}/${maxAmount.toLocaleString()}) - click to modify`;
            }
          }
          
          return (
            <button
              key={period.key}
              onClick={() => handleTogglePeriod(period)}
              disabled={isPending}
              style={{ 
                gridColumn: `${period.colStart} / span ${period.colSpan}`,
              }}
              className={`
                flex flex-col items-center justify-center py-2 rounded-lg transition-all relative
                ${bgClass}
              `}
              title={title}
            >
              <span className="text-xs font-medium">{period.shortLabel}</span>
              {fullyUsed ? (
                isLinked ? (
                  /* Chain link icon for auto-detected/synced credits */
                  <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ) : (
                  /* Checkmark for manually marked credits */
                  <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )
              ) : partiallyUsed ? (
                /* Show amount used for partially used credits */
                <span className="text-[9px] font-bold mt-0.5">
                  {credit.default_value_cents 
                    ? `$${formatCompactDollar(periodUsage!.amount_used)}`
                    : periodUsage!.amount_used
                  }
                </span>
              ) : (
                <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-current" />
              )}
            </button>
          );
        })}
      </div>

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
          onUpdatePeriod={onUpdateCreditUsagePeriod ? async (newDate: string) => {
            await onUpdateCreditUsagePeriod(linkedTransactionModal.usage.id, newDate);
            setLinkedTransactionModal(null);
          } : undefined}
          onMoveTransaction={onMoveTransaction ? async (txnId: string, newDate: string) => {
            await onMoveTransaction(txnId, newDate);
            // Modal will stay open to show remaining transactions
          } : undefined}
        />
      )}
    </div>
  );
}
