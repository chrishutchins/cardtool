"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, AlertTriangle, Check, Info } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface BankAccount {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
  institution_name: string | null;
  current_balance: number | null;
  available_balance: number | null;
  is_primary: boolean | null;
}

export interface PaymentSettingsData {
  wallet_card_id: string;
  pay_from_account_id: string | null;
  is_autopay: boolean;
  autopay_type: 'full_balance' | 'statement_balance' | 'minimum' | 'fixed_amount' | null;
  fixed_autopay_amount: number | null;
  reminder_days_before: number;
}

interface PaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  cardMask: string | null;
  walletCardId: string;
  bankAccounts: BankAccount[];
  currentSettings: PaymentSettingsData | null;
  onSave: (settings: Omit<PaymentSettingsData, 'wallet_card_id'>) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function PaymentSettingsModal({
  isOpen,
  onClose,
  cardName,
  cardMask,
  walletCardId,
  bankAccounts,
  currentSettings,
  onSave,
}: PaymentSettingsModalProps) {
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [payFromAccountId, setPayFromAccountId] = useState<string | null>(null);
  const [isAutopay, setIsAutopay] = useState(false);
  const [autopayType, setAutopayType] = useState<PaymentSettingsData['autopay_type']>(null);
  const [fixedAmount, setFixedAmount] = useState("");
  const [reminderDays, setReminderDays] = useState(3);
  
  // Initialize form from current settings when modal opens
  useEffect(() => {
    if (isOpen && currentSettings) {
      setPayFromAccountId(currentSettings.pay_from_account_id);
      setIsAutopay(currentSettings.is_autopay);
      setAutopayType(currentSettings.autopay_type);
      setFixedAmount(currentSettings.fixed_autopay_amount ? currentSettings.fixed_autopay_amount.toString() : "");
      setReminderDays(currentSettings.reminder_days_before);
    } else if (isOpen && !currentSettings) {
      // Default to primary account if available
      const primaryAccount = bankAccounts.find(a => a.is_primary);
      setPayFromAccountId(primaryAccount?.id || null);
      setIsAutopay(false);
      setAutopayType(null);
      setFixedAmount("");
      setReminderDays(3);
    }
  }, [isOpen, currentSettings, bankAccounts]);

  const handleSave = () => {
    startTransition(async () => {
      await onSave({
        pay_from_account_id: payFromAccountId,
        is_autopay: isAutopay,
        autopay_type: isAutopay ? autopayType : null,
        fixed_autopay_amount: autopayType === 'fixed_amount' ? parseFloat(fixedAmount) || null : null,
        reminder_days_before: reminderDays,
      });
      onClose();
    });
  };

  const selectedAccount = bankAccounts.find(a => a.id === payFromAccountId);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getAccountDisplayName = (account: BankAccount) => {
    return account.display_name || account.name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            Payment Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Card Info */}
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <CreditCard className="h-8 w-8 text-zinc-400" />
            <div>
              <p className="font-medium text-white">{cardName}</p>
              {cardMask && <p className="text-sm text-zinc-500">••••{cardMask}</p>}
            </div>
          </div>

          {/* Pay From Account Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Pay From Account</label>
            {bankAccounts.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-200 font-medium">No Bank Accounts Linked</p>
                    <p className="text-amber-300/80 text-sm">
                      Link a bank account on the Wallet page to track payment capacity.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <select
                  value={payFromAccountId || ""}
                  onChange={(e) => setPayFromAccountId(e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Not specified</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {getAccountDisplayName(account)}
                      {account.mask && ` (••••${account.mask})`}
                      {account.is_primary && " ★"}
                      {account.institution_name && ` - ${account.institution_name}`}
                    </option>
                  ))}
                </select>
                
                {/* Selected Account Balance */}
                {selectedAccount && (
                  <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">Available Balance</span>
                      </div>
                      <span className="text-lg font-semibold text-emerald-400">
                        {formatCurrency(selectedAccount.available_balance)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Auto-pay Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Auto-pay Enabled</label>
              <button
                type="button"
                onClick={() => setIsAutopay(!isAutopay)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAutopay ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAutopay ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isAutopay && (
              <div className="space-y-3 pl-4 border-l-2 border-zinc-700">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Auto-pay Amount</label>
                  <div className="space-y-2">
                    {[
                      { value: 'full_balance', label: 'Full Balance', desc: 'Pay entire balance' },
                      { value: 'statement_balance', label: 'Statement Balance', desc: 'Pay statement balance' },
                      { value: 'minimum', label: 'Minimum Payment', desc: 'Pay minimum due' },
                      { value: 'fixed_amount', label: 'Fixed Amount', desc: 'Pay a specific amount' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          autopayType === option.value
                            ? 'bg-emerald-600/20 border border-emerald-600/50'
                            : 'hover:bg-zinc-800 border border-transparent'
                        }`}
                      >
                        <input
                          type="radio"
                          name="autopayType"
                          value={option.value}
                          checked={autopayType === option.value}
                          onChange={(e) => setAutopayType(e.target.value as PaymentSettingsData['autopay_type'])}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          autopayType === option.value ? 'border-emerald-500' : 'border-zinc-600'
                        }`}>
                          {autopayType === option.value && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{option.label}</p>
                          <p className="text-xs text-zinc-500">{option.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {autopayType === 'fixed_amount' && (
                  <div className="space-y-1">
                    <label className="text-sm text-zinc-400">Fixed Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg pl-7 pr-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reminder Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-300">Payment Reminder</label>
              <div className="group relative">
                <Info className="h-4 w-4 text-zinc-500" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Days before due date to show reminders
                </div>
              </div>
            </div>
            <select
              value={reminderDays}
              onChange={(e) => setReminderDays(parseInt(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={5}>5 days before</option>
              <option value={7}>7 days before</option>
              <option value={14}>14 days before</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
