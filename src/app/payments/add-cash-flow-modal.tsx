"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateToString } from "@/lib/utils";

interface CashFlowItem {
  id: string;
  description: string;
  amount_cents: number;
  expected_date: string;
  is_recurring: boolean;
  recurrence_type: string | null;
  category: string | null;
  is_completed: boolean;
  bank_account_id: string | null;
  wallet_card_id: string | null;
  linked_item_id: string | null;
}

interface BankAccount {
  id: string;
  name: string;
  display_name: string | null;
  institution_name: string | null;
  mask: string | null;
  subtype: string | null;
}

interface WalletCard {
  id: string;
  card_name: string;
  custom_name: string | null;
  issuer_name: string;
}

interface AddCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: {
    description: string;
    amount_cents: number;
    expected_date: string;
    is_recurring: boolean;
    recurrence_type: string | null;
    category: string | null;
    bank_account_id: string | null;
    wallet_card_id: string | null;
  }, transferToAccountId?: string | null) => Promise<void>;
  bankAccounts: BankAccount[];
  walletCards?: WalletCard[];
  editItem?: CashFlowItem | null;
  preSelectedAccountId?: string | null; // For pre-selecting account on new items
  linkedAccountName?: string | null; // Name of the linked account for transfers
}

export function AddCashFlowModal({
  isOpen,
  onClose,
  onSave,
  bankAccounts,
  walletCards = [],
  editItem,
  preSelectedAccountId,
  linkedAccountName,
}: AddCashFlowModalProps) {
  // Determine if we're truly editing (has an existing ID) vs just pre-selecting account
  const isEditing = editItem && editItem.id !== '';
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [isInflow, setIsInflow] = useState(true);
  // Note: formatDateToString is imported from @/lib/utils

  const [expectedDate, setExpectedDate] = useState(formatDateToString(new Date()));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string | null>("monthly");
  const [category, setCategory] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferToAccountId, setTransferToAccountId] = useState<string | null>(null);
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or editItem changes
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        // Editing existing item
        setDescription(editItem?.description ?? "");
        setAmountStr(Math.abs(editItem!.amount_cents / 100).toString());
        setIsInflow(editItem!.amount_cents > 0);
        setExpectedDate(editItem?.expected_date ?? formatDateToString(new Date()));
        setIsRecurring(editItem?.is_recurring ?? false);
        setRecurrenceType(editItem?.recurrence_type ?? "monthly");
        setCategory(editItem?.category ?? "");
        setBankAccountId(editItem?.bank_account_id ?? null);
        // Handle card payment editing
        setIsCardPayment(editItem?.category === "Card Payment");
        setSelectedCardId(editItem?.wallet_card_id ?? null);
      } else {
        // New item - reset to defaults
        setDescription("");
        setAmountStr("");
        setIsInflow(true);
        setExpectedDate(formatDateToString(new Date()));
        setIsRecurring(false);
        setRecurrenceType("monthly");
        setCategory("");
        setBankAccountId(preSelectedAccountId ?? null);
        setIsCardPayment(false);
        setSelectedCardId(null);
      }
      // Always reset transfer state
      setIsTransfer(false);
      setTransferToAccountId(null);
      setError(null);
    }
  }, [isOpen, isEditing, editItem, preSelectedAccountId]);

  if (!isOpen) return null;

  // Helper to generate transfer description
  const generateTransferDescription = () => {
    if (!transferToAccountId) return "";
    const otherAccount = bankAccounts.find(ba => ba.id === transferToAccountId);
    if (!otherAccount) return "";
    const bankName = otherAccount.institution_name || "";
    const accountName = otherAccount.display_name || otherAccount.name || "";
    const mask = otherAccount.mask ? `•••${otherAccount.mask}` : "";
    const direction = isInflow ? "From" : "To";
    return `Transfer ${direction} ${[bankName, accountName, mask].filter(Boolean).join(" ")}`;
  };

  // Helper to generate card payment description
  const generateCardPaymentDescription = () => {
    if (!selectedCardId) return "";
    const card = walletCards.find(c => c.id === selectedCardId);
    if (!card) return "";
    return `Payment: ${card.custom_name || card.card_name}`;
  };

  const handleSave = async () => {
    // For transfers and card payments, description is optional - we'll auto-generate if empty
    if (!isTransfer && !isCardPayment && !description.trim()) {
      setError("Description is required");
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!bankAccountId) {
      setError("Please select a bank account");
      return;
    }
    if (isTransfer && !transferToAccountId) {
      setError("Please select a destination account for the transfer");
      return;
    }
    if (isTransfer && transferToAccountId === bankAccountId) {
      setError("Source and destination accounts must be different");
      return;
    }
    if (isCardPayment && !selectedCardId) {
      setError("Please select a card to pay");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Calculate amount in cents based on direction (card payments are always negative/outflows)
      const amountCents = isCardPayment 
        ? -Math.abs(Math.round(amount * 100))
        : Math.round(amount * 100) * (isInflow ? 1 : -1);
      
      // Use provided description or auto-generate for transfers/card payments
      const finalDescription = description.trim() 
        || (isTransfer ? generateTransferDescription() : "")
        || (isCardPayment ? generateCardPaymentDescription() : "");
      
      // Determine category
      const finalCategory = isTransfer ? "Transfer" 
        : isCardPayment ? "Card Payment" 
        : (category.trim() || null);
      
      await onSave({
        description: finalDescription,
        amount_cents: amountCents,
        expected_date: expectedDate,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null,
        category: finalCategory,
        bank_account_id: bankAccountId,
        wallet_card_id: isCardPayment ? selectedCardId : null,
      }, isTransfer ? transferToAccountId : null);
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Don't trigger save if focus is on a select element
      const target = e.target as HTMLElement;
      if (target.tagName === 'SELECT') return;
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div 
        className="relative z-50 w-full max-w-md bg-zinc-900 rounded-lg border border-zinc-700 p-6"
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">
          {isEditing ? "Edit Cash Flow Item" : "Add Cash Flow Item"}
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description" className="text-zinc-300">
              Description {isTransfer && <span className="text-zinc-500">(optional - auto-generated if empty)</span>}
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isTransfer ? "Leave empty to auto-generate" : "e.g., Invoices Jan, Payroll, CC Payment"}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="amount" className="text-zinc-300">
                Amount
              </Label>
              <div className="mt-1 flex">
                <button
                  type="button"
                  onClick={() => setIsInflow(!isInflow)}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                    isInflow
                      ? "bg-green-900/50 border-green-700 text-green-400"
                      : "bg-red-900/50 border-red-700 text-red-400"
                  }`}
                >
                  {isInflow ? "+" : "-"}
                </button>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white rounded-l-none"
                />
              </div>
              {!isTransfer && (
                <p className="mt-1 text-xs text-zinc-500">
                  {isInflow ? "Money coming in" : "Money going out"}
                </p>
              )}
              {isTransfer && (
                <p className="mt-1 text-xs text-zinc-500">
                  {isInflow ? "Transfer into this account" : "Transfer out of this account"}
                </p>
              )}
            </div>

            <div className="flex-1">
              <Label htmlFor="date" className="text-zinc-300">
                Expected Date
              </Label>
              <Input
                id="date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bank" className="text-zinc-300">
              {isTransfer ? (isInflow ? "To Account" : "From Account") : "Bank Account"}
            </Label>
            <select
              id="bank"
              value={bankAccountId ?? ""}
              onChange={(e) => setBankAccountId(e.target.value || null)}
              className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            >
              <option value="">Select an account</option>
              {bankAccounts.map((ba) => {
                const accountName = ba.display_name || ba.name;
                const bankName = ba.institution_name || "";
                const accountNum = ba.mask ? `•••${ba.mask}` : "";
                const label = [bankName, accountName, accountNum].filter(Boolean).join(" - ");
                return (
                  <option key={ba.id} value={ba.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Transfer toggle - only show when adding new (editing transfers edits individual items) */}
          {!isEditing && (
            <div className="flex items-center gap-3">
              <input
                id="isTransfer"
                type="checkbox"
                checked={isTransfer}
                onChange={(e) => {
                  setIsTransfer(e.target.checked);
                  if (!e.target.checked) {
                    setTransferToAccountId(null);
                  }
                }}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
              />
              <Label htmlFor="isTransfer" className="text-zinc-300">
                This is a transfer between accounts
              </Label>
            </div>
          )}
          {/* Show transfer indicator when editing a transfer */}
          {isEditing && editItem?.category === "Transfer" && (
            <div className="text-sm text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded">
              {editItem.linked_item_id 
                ? <>
                    Linked transfer{linkedAccountName ? <> with <span className="font-medium text-blue-300">{linkedAccountName}</span></> : null}. 
                    Changes will sync to both accounts.
                  </>
                : "This is a transfer item (not linked)."}
            </div>
          )}

          {/* Card Payment toggle - only show when not transfer and has wallet cards */}
          {!isTransfer && !isEditing && walletCards.length > 0 && (
            <div className="flex items-center gap-3">
              <input
                id="isCardPayment"
                type="checkbox"
                checked={isCardPayment}
                onChange={(e) => {
                  setIsCardPayment(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedCardId(null);
                  } else {
                    // Card payments are always outflows
                    setIsInflow(false);
                  }
                }}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
              />
              <Label htmlFor="isCardPayment" className="text-zinc-300">
                This is a credit card payment
              </Label>
            </div>
          )}

          {/* Card Payment selector */}
          {isCardPayment && (
            <div>
              <Label htmlFor="cardPayment" className="text-zinc-300">
                Card to Pay
              </Label>
              <select
                id="cardPayment"
                value={selectedCardId ?? ""}
                onChange={(e) => setSelectedCardId(e.target.value || null)}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">Select a card</option>
                {[...walletCards]
                  .sort((a, b) => {
                    const nameA = (a.custom_name || a.card_name).toLowerCase();
                    const nameB = (b.custom_name || b.card_name).toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.custom_name || card.card_name} - {card.issuer_name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                This payment will reduce the upcoming balance for this card
              </p>
            </div>
          )}

          {/* Show card payment indicator when editing */}
          {isEditing && editItem?.category === "Card Payment" && (
            <div className="text-sm text-zinc-400 bg-zinc-800 px-3 py-2 rounded">
              This is a card payment item.
            </div>
          )}

          {/* Transfer other account */}
          {isTransfer && (
            <div>
              <Label htmlFor="transferTo" className="text-zinc-300">
                {isInflow ? "From Account" : "To Account"}
              </Label>
              <select
                id="transferTo"
                value={transferToAccountId ?? ""}
                onChange={(e) => setTransferToAccountId(e.target.value || null)}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">Select {isInflow ? "source" : "destination"} account</option>
                {bankAccounts
                  .filter(ba => ba.id !== bankAccountId)
                  .map((ba) => {
                    const accountName = ba.display_name || ba.name;
                    const bankName = ba.institution_name || "";
                    const accountNum = ba.mask ? `•••${ba.mask}` : "";
                    const label = [bankName, accountName, accountNum].filter(Boolean).join(" - ");
                    return { ...ba, label };
                  })
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.label}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Creates matching {isInflow ? "outflow" : "inflow"} on {isInflow ? "source" : "destination"} account
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <input
              id="recurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
            />
            <Label htmlFor="recurring" className="text-zinc-300">
              {(() => {
                if (!isRecurring) return "Repeat";
                const day = parseInt(expectedDate.split('-')[2], 10);
                const suffix = day === 1 || day === 21 || day === 31 ? 'st' 
                  : day === 2 || day === 22 ? 'nd' 
                  : day === 3 || day === 23 ? 'rd' 
                  : 'th';
                const dayStr = `${day}${suffix}`;
                const period = recurrenceType === 'quarterly' ? 'quarter' 
                  : recurrenceType === 'annual' ? 'year' 
                  : 'month';
                const monthNote = day >= 29 ? ' (or last day)' : '';
                return `Repeat ${recurrenceType === 'monthly' ? 'monthly' : recurrenceType === 'quarterly' ? 'quarterly' : 'annually'} on the ${dayStr}${monthNote}`;
              })()}
            </Label>
            {isRecurring && (
              <select
                value={recurrenceType ?? "monthly"}
                onChange={(e) => setRecurrenceType(e.target.value)}
                className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annually</option>
              </select>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
