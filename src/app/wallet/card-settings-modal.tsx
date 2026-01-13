"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateBillingDates,
  getFormulaInfo,
  formatBillingDate,
  type BillingCycleFormula,
} from "@/lib/billing-cycle";

// ============================================================================
// Types
// ============================================================================

export interface WalletCardForSettings {
  id: string;
  card_id: string;
  custom_name: string | null;
  approval_date: string | null;
  player_number: number | null;
  // Statement date fields
  statement_close_day?: number | null;
  payment_due_day?: number | null;
  manual_balance_cents?: number | null;
  manual_credit_limit_cents?: number | null;
  cards: {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    card_charge_type?: "credit" | "charge" | null;
    issuers: { 
      name: string;
      billing_cycle_formula?: string | null;
    } | null;
    primary_currency: { name: string; code: string } | null;
  } | null;
}

export interface LinkedAccountInfo {
  current_balance: number | null;
  credit_limit: number | null;
  manual_credit_limit: number | null;
  available_balance: number | null;
  last_balance_update: string | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

interface CardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletCard: WalletCardForSettings;
  linkedAccount: LinkedAccountInfo | null;
  perksValue: number;
  debitPayPercent: number;
  debitPayEnabled: boolean;
  players: Player[];
  playerCount: number;
  onUpdateCustomName: (walletId: string, customName: string | null) => Promise<void>;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
  onUpdatePlayerNumber: (walletId: string, playerNumber: number) => Promise<void>;
  onUpdatePerks: (walletCardId: string, perksValue: number) => Promise<void>;
  onUpdateDebitPay: (walletCardId: string, percent: number) => Promise<void>;
  onUpdateStatementFields?: (walletId: string, fields: {
    statement_close_day: number | null;
    payment_due_day: number | null;
    manual_balance_cents: number | null;
    manual_credit_limit_cents: number | null;
  }) => Promise<void>;
  onRemove: (walletId: string) => Promise<void>;
  onProductChange?: () => void;
  onCloseCard?: () => void;
  onViewPerks?: () => void;
  focusField?: "customName" | "approvalDate" | "playerNumber" | "perks" | "debitPay" | "statementCloseDay" | "paymentDueDay" | "manualBalance" | "manualCreditLimit";
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

function parseCurrency(value: string): number | null {
  if (!value.trim()) return null;
  const num = parseFloat(value.replace(/,/g, ""));
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

// ============================================================================
// Component
// ============================================================================

export function CardSettingsModal({
  isOpen,
  onClose,
  walletCard,
  linkedAccount,
  perksValue,
  debitPayPercent,
  debitPayEnabled,
  players,
  playerCount,
  onUpdateCustomName,
  onUpdateApprovalDate,
  onUpdatePlayerNumber,
  onUpdatePerks,
  onUpdateDebitPay,
  onUpdateStatementFields,
  onRemove: _onRemove, // Keep for API compatibility but unused in UI
  onProductChange,
  onCloseCard,
  onViewPerks,
  focusField,
}: CardSettingsModalProps) {
  const [isPending, startTransition] = useTransition();
  
  // Refs for auto-focus
  const customNameRef = useRef<HTMLInputElement>(null);
  const approvalDateRef = useRef<HTMLInputElement>(null);
  const playerNumberRef = useRef<HTMLSelectElement>(null);
  const perksRef = useRef<HTMLInputElement>(null);
  const debitPayRef = useRef<HTMLInputElement>(null);
  const statementCloseDayRef = useRef<HTMLInputElement>(null);
  const paymentDueDayRef = useRef<HTMLInputElement>(null);
  const manualBalanceRef = useRef<HTMLInputElement>(null);
  const manualCreditLimitRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [customName, setCustomName] = useState(walletCard.custom_name ?? "");
  const [approvalDate, setApprovalDate] = useState(walletCard.approval_date ?? "");
  const [playerNumber, setPlayerNumber] = useState(walletCard.player_number ?? 1);
  const [perks, setPerks] = useState(perksValue.toString());
  const [debitPay, setDebitPay] = useState(debitPayPercent.toString());
  const [statementCloseDay, setStatementCloseDay] = useState(walletCard.statement_close_day?.toString() ?? "");
  const [paymentDueDay, setPaymentDueDay] = useState(walletCard.payment_due_day?.toString() ?? "");
  const [manualBalance, setManualBalance] = useState(formatCurrency(walletCard.manual_balance_cents));
  const [manualCreditLimit, setManualCreditLimit] = useState(formatCurrency(walletCard.manual_credit_limit_cents));

  // Focus on the specified field when modal opens
  useEffect(() => {
    if (!isOpen || !focusField) return;
    
    // Small delay to ensure the dialog has rendered
    const timer = setTimeout(() => {
      let element: HTMLInputElement | HTMLSelectElement | null = null;
      
      switch (focusField) {
        case "customName": element = customNameRef.current; break;
        case "approvalDate": element = approvalDateRef.current; break;
        case "playerNumber": element = playerNumberRef.current; break;
        case "perks": element = perksRef.current; break;
        case "debitPay": element = debitPayRef.current; break;
        case "statementCloseDay": element = statementCloseDayRef.current; break;
        case "paymentDueDay": element = paymentDueDayRef.current; break;
        case "manualBalance": element = manualBalanceRef.current; break;
        case "manualCreditLimit": element = manualCreditLimitRef.current; break;
      }
      
      if (element) {
        element.focus();
        // For input elements, select all text
        if (element instanceof HTMLInputElement) {
          element.select();
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isOpen, focusField]);

  const card = walletCard.cards;
  if (!card) return null;

  const isChargeCard = card.card_charge_type === "charge";
  const hasPlaidData = linkedAccount !== null;

  // Billing cycle formula from issuer
  // For Chase, use different formula for business vs personal cards
  const baseBillingFormula = card.issuers?.billing_cycle_formula as BillingCycleFormula | null | undefined;
  const billingFormula = useMemo(() => {
    // For Chase: cobrand cards (airline/hotel) use +3, regular Chase cards use +6
    if (baseBillingFormula === 'due_plus_3') {
      const currencyType = card.primary_currency?.currency_type;
      const isCobrand = currencyType === 'airline_miles' || currencyType === 'hotel_points';
      if (!isCobrand) {
        return 'due_plus_6' as BillingCycleFormula;
      }
    }
    return baseBillingFormula ?? null;
  }, [baseBillingFormula, card.primary_currency?.currency_type]);
  
  const formulaInfo = getFormulaInfo(billingFormula);
  const primaryInput = formulaInfo?.primaryInput ?? 'due';
  const hasFormula = !!formulaInfo;
  
  // Calculate billing dates based on current inputs
  const billingDates = useMemo(() => {
    const closeDay = statementCloseDay ? parseInt(statementCloseDay) : null;
    const dueDay = paymentDueDay ? parseInt(paymentDueDay) : null;
    return calculateBillingDates(billingFormula, closeDay, dueDay);
  }, [billingFormula, statementCloseDay, paymentDueDay]);

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      // Save all fields
      const promises: Promise<void>[] = [];
      
      // Custom name
      const trimmedName = customName.trim() || null;
      if (trimmedName !== walletCard.custom_name) {
        promises.push(onUpdateCustomName(walletCard.id, trimmedName));
      }
      
      // Approval date
      const dateValue = approvalDate || null;
      if (dateValue !== walletCard.approval_date) {
        promises.push(onUpdateApprovalDate(walletCard.id, dateValue));
      }
      
      // Player number
      if (playerCount > 1 && playerNumber !== walletCard.player_number) {
        promises.push(onUpdatePlayerNumber(walletCard.id, playerNumber));
      }
      
      // Perks
      const perksNum = parseInt(perks) || 0;
      if (perksNum !== perksValue) {
        promises.push(onUpdatePerks(walletCard.id, perksNum));
      }
      
      // Debit pay
      if (debitPayEnabled) {
        const debitNum = parseFloat(debitPay) || 0;
        if (debitNum !== debitPayPercent) {
          promises.push(onUpdateDebitPay(walletCard.id, debitNum));
        }
      }
      
      // Statement fields (only if the update function is provided)
      if (onUpdateStatementFields) {
        const statementDay = statementCloseDay ? parseInt(statementCloseDay) : null;
        const dueDay = paymentDueDay ? parseInt(paymentDueDay) : null;
        const balanceCents = parseCurrency(manualBalance);
        const limitCents = parseCurrency(manualCreditLimit);
        
        const hasChanges = 
          statementDay !== walletCard.statement_close_day ||
          dueDay !== walletCard.payment_due_day ||
          balanceCents !== walletCard.manual_balance_cents ||
          limitCents !== walletCard.manual_credit_limit_cents;
        
        if (hasChanges) {
          promises.push(onUpdateStatementFields(walletCard.id, {
            statement_close_day: statementDay,
            payment_due_day: dueDay,
            manual_balance_cents: balanceCents,
            manual_credit_limit_cents: limitCents,
          }));
        }
      }
      
      await Promise.all(promises);
      onClose();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            {walletCard.custom_name || card.name}
            {walletCard.custom_name && (
              <span className="ml-2 text-sm font-normal text-zinc-500">({card.name})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">

          {/* Basic Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300">Basic Settings</h3>
            
            {/* Custom Name + Approval Date - side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Custom Name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
                <input
                  ref={customNameRef}
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={card.name}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Approval Date */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Card Opened</label>
                <input
                  ref={approvalDateRef}
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Opened date is used for cardmember year credits and application rules
            </p>

            {/* Card Holder + Credit Line - side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Player Number (if multi-player) */}
              {playerCount > 1 ? (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Card Holder</label>
                  <select
                    ref={playerNumberRef}
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: playerCount }, (_, i) => i + 1).map(num => {
                      const player = players.find(p => p.player_number === num);
                      const label = player?.description || `Player ${num}`;
                      return (
                        <option key={num} value={num}>
                          P{num}: {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div /> // Empty placeholder to keep Credit Line on the right
              )}

              {/* Credit Line - always editable */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {isChargeCard ? "Spending Power" : "Credit Line"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    ref={manualCreditLimitRef}
                    type="text"
                    value={manualCreditLimit}
                    onChange={(e) => setManualCreditLimit(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Fee & Value</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Annual Fee (read-only) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Annual Fee</label>
                <div className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400">
                  ${card.annual_fee}
                </div>
              </div>
              
              {/* Net Fee (calculated, read-only) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Net Fee</label>
                <div className={`w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-sm ${
                  card.annual_fee - (parseInt(perks) || 0) < 0 ? "text-emerald-400" : "text-zinc-400"
                }`}>
                  ${card.annual_fee - (parseInt(perks) || 0)}
                </div>
              </div>
            </div>

            {/* Perks Value + Debit Pay side by side */}
            <div className={`grid gap-3 ${debitPayEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
              {/* Perks Value */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Perks Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    ref={perksRef}
                    type="number"
                    value={perks}
                    onChange={(e) => setPerks(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Value from benefits.{" "}
                  {onViewPerks && (
                    <button
                      type="button"
                      onClick={onViewPerks}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      View Perks
                    </button>
                  )}
                </p>
              </div>

              {/* Debit Pay (if enabled) */}
              {debitPayEnabled && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Debit Pay Bonus</label>
                  <div className="relative">
                    <input
                      ref={debitPayRef}
                      type="number"
                      step="0.1"
                      value={debitPay}
                      onChange={(e) => setDebitPay(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-lg border border-pink-500/30 bg-zinc-800 px-3 py-2 pr-8 text-sm text-white focus:border-pink-500 focus:outline-none"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400/70">%</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Extra earning bonus</p>
                </div>
              )}
            </div>
          </div>

          {/* Statement Settings */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Statement Dates</h3>
              {hasFormula && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  {card.issuers?.name} formula
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Statement Close Day */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Closes{hasFormula && primaryInput === 'close' && <span className="ml-1 text-blue-400">(primary)</span>}
                </label>
                <div className="relative">
                  <input
                    ref={statementCloseDayRef}
                    type="number"
                    value={statementCloseDay}
                    onChange={(e) => setStatementCloseDay(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasFormula && primaryInput === 'due' ? "Auto" : "Day"}
                    className={`w-full rounded-lg border bg-zinc-800 px-3 py-2 pr-16 text-sm text-white placeholder-zinc-500 focus:outline-none ${
                      hasFormula && primaryInput === 'close' 
                        ? "border-blue-500/50 focus:border-blue-500" 
                        : "border-zinc-700 focus:border-zinc-500"
                    }`}
                    min="1"
                    max="31"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">of month</span>
                </div>
              </div>
              
              {/* Payment Due Day */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Due{hasFormula && primaryInput === 'due' && <span className="ml-1 text-blue-400">(primary)</span>}
                </label>
                <div className="relative">
                  <input
                    ref={paymentDueDayRef}
                    type="number"
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasFormula && primaryInput === 'close' ? "Auto" : "Day"}
                    className={`w-full rounded-lg border bg-zinc-800 px-3 py-2 pr-16 text-sm text-white placeholder-zinc-500 focus:outline-none ${
                      hasFormula && primaryInput === 'due' 
                        ? "border-blue-500/50 focus:border-blue-500" 
                        : "border-zinc-700 focus:border-zinc-500"
                    }`}
                    min="1"
                    max="31"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">of month</span>
                </div>
              </div>
            </div>
            
            {/* Formula description and override warning */}
            <p className="text-xs text-zinc-500">
              {hasFormula ? (
                <>
                  {formulaInfo?.description}
                  {primaryInput === 'due' && !statementCloseDay && " Enter due day to auto-calculate close."}
                  {primaryInput === 'close' && !paymentDueDay && " Enter close day to auto-calculate due."}
                </>
              ) : (
                <>Enter both dates (no auto-calculation for {card.issuers?.name || "this issuer"}).</>
              )}
            </p>
            
            {/* Override warning - shows when user enters a value in the auto-calculated field */}
            {hasFormula && (
              (primaryInput === 'due' && statementCloseDay) || 
              (primaryInput === 'close' && paymentDueDay)
            ) && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1">
                <span>⚠</span>
                <span>Manual override — clearing this value will restore auto-calculation</span>
              </p>
            )}

            {/* Calculated Dates Display - more compact */}
            {(billingDates.lastCloseDate || billingDates.nextCloseDate || billingDates.nextDueDate) && (
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-zinc-800/50 text-center text-xs">
                <div>
                  <div className="text-zinc-500">← Last Close</div>
                  <div className={billingDates.isAutoCalculated.close ? "text-zinc-400" : "text-white"}>
                    {billingDates.lastCloseDate ? formatBillingDate(billingDates.lastCloseDate) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">→ Next Close</div>
                  <div className={billingDates.isAutoCalculated.close ? "text-zinc-400" : "text-white"}>
                    {billingDates.nextCloseDate ? formatBillingDate(billingDates.nextCloseDate) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Due Date</div>
                  <div className={billingDates.isAutoCalculated.due ? "text-zinc-400" : "text-white"}>
                    {billingDates.nextDueDate ? formatBillingDate(billingDates.nextDueDate) : "—"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Balance Info (Plaid-linked or manual entry) */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Balance</h3>
                {hasPlaidData && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Plaid Linked
                  </span>
                )}
              </div>
              
              {hasPlaidData ? (
                <>
                  <p className="text-xs text-zinc-500">
                    Balance synced from linked account.
                  </p>
                  {/* Show balance for Plaid-linked (values are in dollars) */}
                  <div className="flex gap-6 text-sm">
                    {linkedAccount.current_balance != null && (
                      <div>
                        <span className="text-zinc-500">Current Balance: </span>
                        <span className="text-zinc-300">${linkedAccount.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {linkedAccount.available_balance != null && (
                      <div>
                        <span className="text-zinc-500">Available: </span>
                        <span className="text-zinc-300">${linkedAccount.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Current Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      ref={manualBalanceRef}
                      type="text"
                      value={manualBalance}
                      onChange={(e) => setManualBalance(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Connect via Plaid in Settings for automatic sync
                  </p>
                </div>
              )}
            </div>

          {/* Actions - all buttons equally spaced */}
          <div className="flex gap-2 pt-4 border-t border-zinc-800">
            {onProductChange && (
              <button
                onClick={onProductChange}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Product Change
              </button>
            )}
            {onCloseCard && (
              <button
                onClick={onCloseCard}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Close / Remove
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

