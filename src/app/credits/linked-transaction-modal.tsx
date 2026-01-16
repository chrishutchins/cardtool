"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { CreditUsage, CreditWithSlot, WalletCard, UsageTransaction } from "./credits-client";
import { parseLocalDate } from "@/lib/utils";

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

interface LinkedTransactionModalProps {
  usage: CreditUsage;
  credit: CreditWithSlot;
  walletCard: WalletCard;
  periodLabel: string;
  onClose: () => void;
  onUnlink: () => void;
  onUpdatePeriod?: (newDate: string) => Promise<void>;
  onMoveTransaction?: (transactionId: string, newDate: string) => Promise<void>;
}

export function LinkedTransactionModal({
  usage,
  credit,
  walletCard,
  periodLabel,
  onClose,
  onUnlink,
  onUpdatePeriod,
  onMoveTransaction,
}: LinkedTransactionModalProps) {
  const [isPending, startTransition] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const transactions = usage.user_credit_usage_transactions || [];
  const isClawback = usage.is_clawback;
  const hasMultipleTransactions = transactions.length > 1;
  
  // Track which transaction is being edited (for per-transaction override)
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [txnOverrideDate, setTxnOverrideDate] = useState<string>("");
  
  // For single transaction, use the legacy date picker
  const firstTxn = transactions[0]?.user_plaid_transactions;
  // Use transaction date if available, otherwise fall back to usage.used_at
  const initialDate = firstTxn?.authorized_date || firstTxn?.date || usage.used_at.split("T")[0];
  const [overrideDate, setOverrideDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Close modal on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent immediate close on open
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "long", 
      day: "numeric",
      year: "numeric"
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric"
    });
  };

  const formatAmount = (cents: number) => {
    const dollars = Math.abs(cents) / 100;
    return `$${dollars.toFixed(2)}`;
  };

  // Handle save for single-transaction credits (changes the usage period)
  const handleSaveDate = () => {
    if (!onUpdatePeriod || !overrideDate) return;
    startTransition(async () => {
      await onUpdatePeriod(overrideDate);
    });
  };

  // Handle moving a single transaction to a different period
  const handleMoveTransaction = (txnId: string) => {
    if (!onMoveTransaction || !txnOverrideDate) return;
    startTransition(async () => {
      await onMoveTransaction(txnId, txnOverrideDate);
      setEditingTxnId(null);
      setTxnOverrideDate("");
    });
  };

  const handleUnlink = () => {
    startTransition(() => {
      onUnlink();
    });
  };

  const startEditingTransaction = (utxn: UsageTransaction) => {
    const txn = utxn.user_plaid_transactions;
    if (!txn) return;
    setEditingTxnId(utxn.id);
    // Use authorized_date when available as it reflects when the transaction actually occurred
    setTxnOverrideDate(txn.authorized_date || txn.date);
  };

  const cancelEditingTransaction = () => {
    setEditingTxnId(null);
    setTxnOverrideDate("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">
            {isClawback ? "Clawback Detected" : hasMultipleTransactions ? "Linked Transactions" : "Linked Transaction"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Credit Info */}
          <div className="space-y-1">
            <div className="text-sm text-zinc-400">Credit</div>
            <div className="font-medium text-white">{credit.displayName}</div>
            <div className="text-sm text-zinc-500">{walletCard.display_name}</div>
          </div>

          {/* Current Period & Amount Used */}
          <div className="flex gap-6">
            <div className="space-y-1">
              <div className="text-sm text-zinc-400">Applied to Period</div>
              <div className="text-white">{periodLabel}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-zinc-400">Total Applied</div>
              <div className={`text-lg font-semibold ${isClawback ? 'text-amber-400' : 'text-emerald-400'}`}>
                {/* For usage_based credits: amount_used is a count, multiply by credit value */}
                {/* For regular dollar credits: amount_used is already in dollars */}
                {credit.reset_cycle === "usage_based" && credit.default_value_cents
                  ? `$${formatCompactDollar(usage.amount_used * (credit.default_value_cents / (credit.credit_count || 1)) / 100)}`
                  : credit.default_value_cents
                    ? `$${formatCompactDollar(usage.amount_used)}`
                    : usage.amount_used
                }
                {credit.default_value_cents && (
                  <span className="text-sm font-normal text-zinc-500 ml-1">
                    / ${formatCompactDollar(credit.default_value_cents / 100)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="space-y-2">
            <div className="text-sm text-zinc-400">
              {transactions.length === 0 
                ? "Manually Marked" 
                : isClawback 
                  ? "Clawback Transaction" 
                  : `Detected Transaction${hasMultipleTransactions ? 's' : ''}`
              }
            </div>
            {transactions.length === 0 ? (
              <div className="p-3 rounded-lg border border-zinc-700 bg-zinc-800/50">
                <p className="text-sm text-zinc-400">
                  This credit was manually marked as used. No linked transactions.
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              {transactions.map((utxn) => {
                const txn = utxn.user_plaid_transactions;
                if (!txn) return null;
                
                const isEditing = editingTxnId === utxn.id;
                
                return (
                  <div 
                    key={utxn.id}
                    className={`p-3 rounded-lg border ${isClawback ? 'bg-amber-950/30 border-amber-800/50' : 'bg-zinc-800/50 border-zinc-700'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isClawback ? 'text-amber-300' : 'text-emerald-400'}`}>
                          {formatAmount(txn.amount_cents)}
                        </div>
                        <div className="text-sm text-white mt-1 truncate" title={txn.original_description || txn.name}>
                          {txn.original_description || txn.name}
                        </div>
                        {!txn.original_description && txn.merchant_name && txn.merchant_name !== txn.name && (
                          <div className="text-xs text-zinc-500 mt-0.5">{txn.merchant_name}</div>
                        )}
                        <div className="text-xs text-zinc-500 mt-1">
                          {formatShortDate(txn.authorized_date || txn.date)}
                        </div>
                      </div>
                      
                      {/* Per-transaction move button */}
                      {onMoveTransaction && !isEditing && (
                        <button
                          onClick={() => startEditingTransaction(utxn)}
                          disabled={isPending}
                          className="text-xs text-sky-400 hover:text-sky-300 transition-colors shrink-0"
                        >
                          Move
                        </button>
                      )}
                    </div>
                    
                    {/* Per-transaction date override */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2">
                        <div className="text-xs text-zinc-400">Move to different period:</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={txnOverrideDate}
                            onChange={(e) => setTxnOverrideDate(e.target.value)}
                            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleMoveTransaction(txn.id)}
                            disabled={isPending || !txnOverrideDate || txnOverrideDate === (txn.authorized_date || txn.date)}
                            className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isPending ? "..." : "Apply"}
                          </button>
                          <button
                            onClick={cancelEditingTransaction}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                          This will move just this transaction to a different credit period.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Date Override fallback - only show if onMoveTransaction is not available */}
          {onUpdatePeriod && !onMoveTransaction && transactions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">Override Effective Date</div>
                {!showDatePicker && (
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Change period
                  </button>
                )}
              </div>
              
              {showDatePicker && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveDate}
                    disabled={isPending || !overrideDate || overrideDate === firstTxn?.date}
                    className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending ? "Saving..." : "Apply"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDatePicker(false);
                      setOverrideDate(firstTxn?.date || "");
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {showDatePicker && (
                <p className="text-xs text-zinc-500">
                  Change the date to move this credit to a different period. 
                  For example, change 12/2/25 to 11/30/25 to apply to November instead of December.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={handleUnlink}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-red-800 text-red-400 text-sm font-medium hover:bg-red-950/50 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Removing..." : transactions.length === 0 ? "Remove Usage" : "Unlink All"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
