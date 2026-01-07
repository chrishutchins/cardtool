"use client";

import { useState, useTransition } from "react";
import { Credit, CreditWithSlot, CreditSettings, WalletCard } from "./credits-client";

interface MarkUsedModalProps {
  credit: Credit | CreditWithSlot;
  walletCard: WalletCard;
  periodStart: string;
  periodEnd: string;
  currentSettings: CreditSettings | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  onUpdateSettings: (formData: FormData) => Promise<void>;
}

export function MarkUsedModal({
  credit,
  walletCard,
  periodStart,
  periodEnd,
  currentSettings,
  onClose,
  onSubmit,
  onUpdateSettings,
}: MarkUsedModalProps) {
  const [isPending, startTransition] = useTransition();
  const [usedAt, setUsedAt] = useState(new Date().toISOString().split("T")[0]);
  const [isAutoRepeat, setIsAutoRepeat] = useState(currentSettings?.is_auto_repeat ?? false);
  
  const isDollarCredit = credit.default_value_cents !== null;
  const maxAmount = credit.default_quantity ?? 1;
  const isUsageBased = credit.reset_cycle === "usage_based";
  const mustBeEarned = credit.must_be_earned;
  // Auto-repeat is available for all recurring credits (not usage-based)
  const canAutoRepeat = !isUsageBased;
  
  // Combine notes from credit and settings
  const allNotes = [credit.notes, currentSettings?.notes].filter(Boolean).join(" • ");
  
  // Default amount: full value for $ credits, 1 for quantity credits
  const [amountUsed, setAmountUsed] = useState(
    isDollarCredit 
      ? (credit.default_value_cents! / 100).toString()
      : "1"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.set("user_wallet_id", walletCard.id);
    formData.set("credit_id", credit.id);
    formData.set("period_start", periodStart);
    formData.set("period_end", periodEnd);
    
    // Include slot_number for multi-slot credits
    const slotNumber = 'slotNumber' in credit ? credit.slotNumber : 1;
    formData.set("slot_number", slotNumber.toString());
    
    // For dollar credits, store the dollar amount directly
    // For quantity credits, store the quantity
    if (isDollarCredit) {
      const usedValue = parseFloat(amountUsed) || 0;
      formData.set("amount_used", usedValue.toString());
    } else {
      formData.set("amount_used", amountUsed);
    }

    // Only set date for usage-based credits, use current date for others
    formData.set("used_at", isUsageBased ? usedAt : new Date().toISOString().split("T")[0]);

    startTransition(async () => {
      await onSubmit(formData);
      
      // If auto-repeat changed, update settings
      if (canAutoRepeat && isAutoRepeat !== (currentSettings?.is_auto_repeat ?? false)) {
        const settingsData = new FormData();
        settingsData.set("user_wallet_id", walletCard.id);
        settingsData.set("credit_id", credit.id);
        settingsData.set("is_hidden", currentSettings?.is_hidden ? "true" : "false");
        settingsData.set("user_value_override", currentSettings?.user_value_override_cents 
          ? (currentSettings.user_value_override_cents / 100).toString() 
          : "");
        settingsData.set("notes", currentSettings?.notes ?? "");
        settingsData.set("is_auto_repeat", isAutoRepeat ? "true" : "false");
        await onUpdateSettings(settingsData);
      }
      
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mustBeEarned ? "Mark Credit Earned" : "Mark Credit Used"}
            </h2>
            <p className="text-sm text-zinc-400">{credit.name}</p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Notes */}
          {allNotes && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2">
              <p className="text-sm text-amber-400/90">{allNotes}</p>
            </div>
          )}

          {/* Amount Used */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {isDollarCredit 
                ? (mustBeEarned ? "Amount Earned" : "Amount Used")
                : `Quantity (max ${maxAmount.toLocaleString()})`
              }
            </label>
            <div className="relative">
              {isDollarCredit && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
              )}
              <input
                type="number"
                step={isDollarCredit ? "0.01" : "1"}
                min={isDollarCredit ? "0.01" : "1"}
                max={isDollarCredit ? (credit.default_value_cents! / 100) : maxAmount}
                value={amountUsed}
                onChange={(e) => setAmountUsed(e.target.value)}
                className={`w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-white focus:border-emerald-500 focus:outline-none ${isDollarCredit ? "pl-7 pr-3" : "px-3"}`}
                autoFocus
              />
            </div>
            {isDollarCredit && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Max: ${(credit.default_value_cents! / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Date Used - Only for usage-based credits */}
          {isUsageBased && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Date Used
                <span className="ml-1 text-amber-400 text-xs">(required for renewal)</span>
              </label>
              <input
                type="date"
                value={usedAt}
                onChange={(e) => setUsedAt(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
              {credit.renewal_period_months && (
                <p className="mt-1.5 text-xs text-amber-400">
                  Credit resets {credit.renewal_period_months / 12 >= 1 
                    ? `${Math.floor(credit.renewal_period_months / 12)} year${credit.renewal_period_months >= 24 ? 's' : ''}` 
                    : `${credit.renewal_period_months} months`
                  } from this date
                </p>
              )}
            </div>
          )}

          {/* Auto-repeat checkbox - available for all recurring credits */}
          {canAutoRepeat && (
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={isAutoRepeat}
                onChange={(e) => setIsAutoRepeat(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-300">Automatically mark used each period</span>
            </label>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : (mustBeEarned ? "Mark Earned" : "Mark Used")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
