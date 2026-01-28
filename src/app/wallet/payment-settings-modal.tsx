"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, AlertTriangle, Check } from "lucide-react";

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
  
  // Form state - simplified to just pay_from_account and is_autopay
  const [payFromAccountId, setPayFromAccountId] = useState<string | null>(null);
  const [isAutopay, setIsAutopay] = useState(false);
  
  // Initialize form from current settings when modal opens
  useEffect(() => {
    if (isOpen && currentSettings) {
      setPayFromAccountId(currentSettings.pay_from_account_id);
      setIsAutopay(currentSettings.is_autopay);
    } else if (isOpen && !currentSettings) {
      // Default to primary account if available
      const primaryAccount = bankAccounts.find(a => a.is_primary);
      setPayFromAccountId(primaryAccount?.id || null);
      setIsAutopay(false);
    }
  }, [isOpen, currentSettings, bankAccounts]);

  const handleSave = () => {
    startTransition(async () => {
      await onSave({
        pay_from_account_id: payFromAccountId,
        is_autopay: isAutopay,
        autopay_type: null, // Always null - we assume statement balance
        fixed_autopay_amount: null,
        reminder_days_before: 3, // Default
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
                  autoFocus
                >
                  <option value="">Not specified</option>
                  {bankAccounts
                    .sort((a, b) => {
                      const aFull = `${a.institution_name || ''} ${getAccountDisplayName(a)}`;
                      const bFull = `${b.institution_name || ''} ${getAccountDisplayName(b)}`;
                      return aFull.localeCompare(bFull);
                    })
                    .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.institution_name && `${account.institution_name} - `}
                      {getAccountDisplayName(account)}
                      {account.mask && ` (••••${account.mask})`}
                      {account.is_primary && " ★"}
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

          {/* Auto-pay Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-zinc-300">Auto-pay</label>
                <p className="text-xs text-zinc-500">Statement balance will be paid automatically on the due date</p>
              </div>
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
