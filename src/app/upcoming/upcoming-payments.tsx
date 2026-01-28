"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Building2, AlertTriangle, Calendar, ChevronDown, ChevronUp, DollarSign, Repeat, Check, Settings, RefreshCw } from "lucide-react";
import { PaymentSettingsModal, PaymentSettingsData, BankAccount as PaymentBankAccount } from "../wallet/payment-settings-modal";

// ============================================================================
// Types
// ============================================================================

export interface UpcomingPayment {
  id: string;
  walletCardId: string | null;
  cardName: string;
  cardMask: string | null;
  issuerName: string | null;
  playerNumber: number | null;
  
  // From Plaid Liabilities (if available)
  statementBalance: number | null;
  dueDate: Date | null;
  minimumPayment: number | null;
  isOverdue: boolean;
  statementDate: string | null; // For marking as paid
  
  // Partial payment info (when payment made but < statement balance)
  partialPaymentAmount: number | null;
  partialPaymentDate: string | null;
  remainingBalance: number | null; // statementBalance - partialPaymentAmount
  
  // From calculated billing dates (fallback)
  calculatedDueDate: Date | null;
  currentBalance: number | null;
  
  // Payment settings
  payFromAccountId: string | null;
  payFromAccountName: string | null;
  payFromInstitution: string | null;
  payFromBalance: number | null;
  isAutopay: boolean;
  autopayType: string | null;
}

export interface BankAccount {
  id: string;
  name: string;
  displayName: string | null;
  institution: string | null;
  availableBalance: number | null;
  isPrimary: boolean;
}

export interface UnbilledBalance {
  walletCardId: string;
  cardName: string;
  cardMask: string | null;
  issuerName: string | null;
  playerNumber: number | null;
  unbilledAmount: number; // currentBalance - statementBalance
  statementCloseDate: Date | null;
  projectedDueDate: Date | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

interface PaymentDateOverride {
  id: string;
  wallet_card_id: string;
  override_date: string;
  original_due_date: string;
}

interface LinkedAccountInfo {
  id: string;
  wallet_card_id: string | null;
}

interface PaymentSettings {
  pay_from_account_id: string | null;
  is_autopay: boolean;
}

interface UpcomingPaymentsProps {
  payments: UpcomingPayment[];
  unbilledBalances: UnbilledBalance[];
  bankAccounts: BankAccount[];
  players: Player[];
  paymentDateOverridesMap?: Map<string, PaymentDateOverride>;
  // Settings/refresh props
  isAdmin?: boolean;
  bankAccountsForSettings?: PaymentBankAccount[];
  paymentSettingsMap?: Map<string, PaymentSettings>;
  linkedAccountsMap?: Map<string, LinkedAccountInfo>;
  onUpdatePaymentSettings?: (walletCardId: string, settings: Omit<PaymentSettingsData, 'wallet_card_id'>) => Promise<void>;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDaysUntil(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDueDateLabel(date: Date | null): { label: string; urgent: boolean; overdue: boolean } {
  const days = getDaysUntil(date);
  if (days === null) return { label: "No due date", urgent: false, overdue: false };
  if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`, urgent: true, overdue: true };
  if (days === 0) return { label: "Due today", urgent: true, overdue: false };
  if (days === 1) return { label: "Due tomorrow", urgent: true, overdue: false };
  if (days <= 7) return { label: `Due in ${days} days`, urgent: true, overdue: false };
  return { label: `Due ${formatDate(date)}`, urgent: false, overdue: false };
}

// ============================================================================
// Component
// ============================================================================

export function UpcomingPayments({
  payments,
  unbilledBalances,
  bankAccounts,
  players,
  paymentDateOverridesMap,
  isAdmin = false,
  bankAccountsForSettings = [],
  paymentSettingsMap,
  linkedAccountsMap,
  onUpdatePaymentSettings,
}: UpcomingPaymentsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed
  const [isUnbilledExpanded, setIsUnbilledExpanded] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  
  // Payment settings modal state
  const [editingPaymentSettingsCard, setEditingPaymentSettingsCard] = useState<{
    walletCardId: string;
    cardName: string;
    cardMask: string | null;
  } | null>(null);
  
  // Refreshing card balance
  const [refreshingCardId, setRefreshingCardId] = useState<string | null>(null);

  const handleMarkAsPaid = async (walletCardId: string, statementDate: string) => {
    setMarkingPaidId(walletCardId);
    try {
      const response = await fetch("/api/payments/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletCardId, statementDate }),
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Open payment settings modal for a card
  const handleEditPaymentSettings = (walletCardId: string, cardName: string, cardMask: string | null) => {
    setEditingPaymentSettingsCard({ walletCardId, cardName, cardMask });
  };

  // Save payment settings
  const handleSavePaymentSettings = async (settings: Omit<PaymentSettingsData, 'wallet_card_id'>) => {
    if (!editingPaymentSettingsCard || !onUpdatePaymentSettings) return;
    await onUpdatePaymentSettings(editingPaymentSettingsCard.walletCardId, settings);
  };

  // Refresh balance for a specific card (admin only)
  const refreshCardBalance = async (walletCardId: string) => {
    if (!isAdmin) return;
    
    // Get the linked account for this wallet card
    const linkedAccount = linkedAccountsMap?.get(walletCardId);
    if (!linkedAccount) return;
    
    setRefreshingCardId(walletCardId);
    try {
      const response = await fetch("/api/plaid/refresh-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: linkedAccount.id }),
      });
      
      if (response.ok) {
        // Trigger a page refresh to get updated data
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to refresh card balance:", error);
    } finally {
      setRefreshingCardId(null);
    }
  };

  // Helper to get player display name
  const getPlayerLabel = (playerNumber: number | null | undefined): string | null => {
    if (playerNumber === null || playerNumber === undefined) return null;
    const player = players.find(p => p.player_number === playerNumber);
    return player?.description || `P${playerNumber}`;
  };

  // Filter to only payments with a due date (either from Plaid or calculated)
  const paymentsWithDates = payments.filter(p => p.dueDate || p.calculatedDueDate);
  
  // Sort by due date (soonest first)
  const sortedPayments = [...paymentsWithDates].sort((a, b) => {
    const dateA = a.dueDate || a.calculatedDueDate;
    const dateB = b.dueDate || b.calculatedDueDate;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate total due and overdraft warnings (use remaining balance if partial payment)
  const totalDue = sortedPayments.reduce((sum, p) => sum + (p.remainingBalance ?? p.statementBalance ?? p.currentBalance ?? 0), 0);
  
  // Check for overdraft risks: group payments by pay-from account and calculate running balance
  const paymentsByAccount = new Map<string | null, UpcomingPayment[]>();
  sortedPayments.forEach(p => {
    const accountId = p.payFromAccountId;
    if (!paymentsByAccount.has(accountId)) {
      paymentsByAccount.set(accountId, []);
    }
    paymentsByAccount.get(accountId)!.push(p);
  });

  // Calculate which specific payments would cause overdraft (running balance calculation)
  const overdraftPaymentIds = new Set<string>();
  const overdraftWarnings: { 
    accountName: string; 
    institution: string | null;
    totalDue: number; 
    balance: number;
    earliestDueDate: Date | null;
    daysUntil: number | null;
  }[] = [];
  
  paymentsByAccount.forEach((accountPayments, accountId) => {
    if (!accountId) return;
    const account = bankAccounts.find(a => a.id === accountId);
    if (!account || account.availableBalance === null) return;
    
    const totalFromAccount = accountPayments.reduce((sum, p) => sum + (p.remainingBalance ?? p.statementBalance ?? p.currentBalance ?? 0), 0);
    
    // Calculate running balance to find which payments actually overdraft
    let runningBalance = account.availableBalance;
    let overdraftStarted = false;
    let earliestOverdraftDate: Date | null = null;
    
    accountPayments.forEach(p => {
      const paymentAmount = p.remainingBalance ?? p.statementBalance ?? p.currentBalance ?? 0;
      runningBalance -= paymentAmount;
      
      if (runningBalance < 0) {
        overdraftPaymentIds.add(p.id);
        if (!overdraftStarted) {
          overdraftStarted = true;
          earliestOverdraftDate = p.dueDate || p.calculatedDueDate;
        }
      }
    });
    
    // Only add warning if there's an actual overdraft risk
    if (totalFromAccount > account.availableBalance) {
      overdraftWarnings.push({
        accountName: account.displayName || account.name,
        institution: account.institution,
        totalDue: totalFromAccount,
        balance: account.availableBalance,
        earliestDueDate: earliestOverdraftDate,
        daysUntil: getDaysUntil(earliestOverdraftDate),
      });
    }
  });
  
  // Sort overdraft warnings by days until (soonest first)
  overdraftWarnings.sort((a, b) => {
    if (a.daysUntil === null) return 1;
    if (b.daysUntil === null) return -1;
    return a.daysUntil - b.daysUntil;
  });

  const hasMultiplePlayers = players.length > 1;

  if (sortedPayments.length === 0) {
    return null; // Don't show section if no payments
  }

  return (
    <>
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-zinc-800/50 px-4 py-3 border-b border-zinc-700 hover:bg-zinc-800/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <div className="text-left">
            <h2 className="font-semibold text-white">Upcoming Payments</h2>
            <p className="text-xs text-zinc-400">
              {sortedPayments.length} payment{sortedPayments.length !== 1 ? 's' : ''} due
              {totalDue > 0 && ` • ${formatCurrency(totalDue)} total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overdraftWarnings.length > 0 && (
            <div className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">{overdraftWarnings.length} overdraft risk{overdraftWarnings.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <>
          {/* Overdraft Warnings */}
          {overdraftWarnings.length > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-200 font-medium text-sm">Overdraft Risk</p>
                  <div className="mt-1 space-y-1">
                    {overdraftWarnings.map((warning, idx) => {
                      const daysLabel = warning.daysUntil === null ? '' :
                        warning.daysUntil < 0 ? ' (overdue!)' :
                        warning.daysUntil === 0 ? ' (today!)' :
                        warning.daysUntil === 1 ? ' (tomorrow)' :
                        ` (in ${warning.daysUntil} days)`;
                      
                      return (
                        <p key={idx} className="text-amber-300/80 text-xs">
                          <span className="font-medium">
                            {warning.accountName}
                            {warning.institution && ` (${warning.institution})`}
                          </span>
                          : {formatCurrency(warning.totalDue)} due, only {formatCurrency(warning.balance)} available
                          <span className="text-amber-400">{daysLabel}</span>
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Column Headers */}
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
            <div className="w-6" /> {/* Icon spacer */}
            <div className="flex-1">Card</div>
            <div className="w-24 text-right">Amount</div>
            <div className="w-16 text-right">Due</div>
            <div className="w-12 text-right">Days</div>
            {onUpdatePaymentSettings && <div className="w-14" />} {/* Actions spacer */}
          </div>

          {/* Payments List */}
          <div className="divide-y divide-zinc-800">
            {sortedPayments.map((payment) => {
              const originalDueDate = payment.dueDate || payment.calculatedDueDate;
              
              // Check for date override
              let effectiveDueDate = originalDueDate;
              let hasDateOverride = false;
              if (paymentDateOverridesMap && originalDueDate && payment.walletCardId) {
                // Use local date string to match the key format
                const year = originalDueDate.getFullYear();
                const month = String(originalDueDate.getMonth() + 1).padStart(2, '0');
                const day = String(originalDueDate.getDate()).padStart(2, '0');
                const originalDateStr = `${year}-${month}-${day}`;
                const overrideKey = `${payment.walletCardId}_${originalDateStr}`;
                const override = paymentDateOverridesMap.get(overrideKey);
                if (override) {
                  // Parse as local date to avoid timezone issues
                  const [y, m, d] = override.override_date.split('-').map(Number);
                  effectiveDueDate = new Date(y, m - 1, d);
                  hasDateOverride = true;
                }
              }
              
              // Show remaining balance if partial payment, otherwise show full statement balance
              const displayBalance = payment.remainingBalance ?? payment.statementBalance ?? payment.currentBalance;
              const effectiveBalance = payment.statementBalance ?? payment.currentBalance;
              const daysUntil = getDaysUntil(effectiveDueDate);
              const overdue = daysUntil !== null && daysUntil < 0;

              // Check if this specific payment would cause or be affected by an overdraft
              const isOverdraftContributor = overdraftPaymentIds.has(payment.id);

              // Build pay from display name with institution
              const payFromDisplay = payment.payFromInstitution && payment.payFromAccountName
                ? `${payment.payFromInstitution} ${payment.payFromAccountName}`
                : payment.payFromAccountName;

              return (
                <div
                  key={payment.id}
                  className={`px-4 py-3 ${overdue ? 'bg-red-500/5' : isOverdraftContributor ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Card Icon */}
                    <div className={`p-2 rounded ${overdue ? 'bg-red-700/50' : isOverdraftContributor ? 'bg-amber-700/50' : 'bg-zinc-700'}`}>
                      <CreditCard className={`h-4 w-4 ${overdue ? 'text-red-300' : isOverdraftContributor ? 'text-amber-300' : 'text-zinc-300'}`} />
                    </div>

                    {/* Card Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm text-white truncate">{payment.cardName}</h3>
                        {payment.cardMask && (
                          <span className="text-zinc-500 text-sm">••{payment.cardMask}</span>
                        )}
                        {hasMultiplePlayers && payment.playerNumber && (
                          <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-px rounded">
                            {getPlayerLabel(payment.playerNumber)}
                          </span>
                        )}
                        {payment.issuerName && (
                          <span className="text-sm text-zinc-500">• {payment.issuerName}</span>
                        )}
                        {hasDateOverride && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Rescheduled</span>
                        )}
                      </div>
                      {/* Payment Source */}
                      {payment.payFromAccountId && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="flex items-center gap-1">
                            Pay from: {payFromDisplay}
                            {payment.isAutopay && (
                              <span title="Auto-pay enabled">
                                <Repeat className="h-3.5 w-3.5 text-emerald-400" />
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {/* Partial Payment Notice */}
                      {payment.partialPaymentAmount && payment.partialPaymentDate && payment.statementDate && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 mt-1">
                          <span>
                            Partial payment of {formatCurrency(payment.partialPaymentAmount)} made on {new Date(payment.partialPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
                          </span>
                          <button
                            onClick={() => handleMarkAsPaid(payment.walletCardId!, payment.statementDate!)}
                            disabled={markingPaidId === payment.walletCardId}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            {markingPaidId === payment.walletCardId ? 'Marking...' : 'Mark as Paid'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="w-24 text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${
                        isOverdraftContributor ? 'text-red-400' : 
                        displayBalance && displayBalance > 0 ? 'text-emerald-400' : 'text-zinc-400'
                      }`}>
                        {formatCurrency(displayBalance)}
                      </p>
                      {payment.partialPaymentAmount && (
                        <p className="text-xs text-zinc-500">
                          of {formatCurrency(payment.statementBalance)}
                        </p>
                      )}
                    </div>

                    {/* Due Date */}
                    <div className="w-16 text-right flex-shrink-0">
                      <p className={`text-sm ${overdue ? 'text-red-400' : hasDateOverride ? 'text-amber-400' : 'text-zinc-400'}`}>
                        {formatDate(effectiveDueDate)}
                        {hasDateOverride && '*'}
                      </p>
                    </div>

                    {/* Days Until */}
                    <div className="w-12 text-right flex-shrink-0">
                      <p className={`text-sm ${
                        overdue ? 'text-red-400' : 
                        daysUntil !== null && daysUntil <= 7 ? 'text-amber-400' : 
                        'text-zinc-400'
                      }`}>
                        {daysUntil !== null ? (daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : `${daysUntil}d`) : '—'}
                      </p>
                    </div>

                    {/* Actions */}
                    {onUpdatePaymentSettings && payment.walletCardId && (
                      <div className="w-14 flex items-center justify-end gap-1 flex-shrink-0">
                        {/* Admin refresh button */}
                        {isAdmin && linkedAccountsMap?.get(payment.walletCardId) && (
                          <button
                            onClick={() => refreshCardBalance(payment.walletCardId!)}
                            disabled={refreshingCardId === payment.walletCardId}
                            className="p-1 rounded text-amber-500/70 hover:text-amber-400 hover:bg-zinc-700 disabled:opacity-50"
                            title="Refresh balance"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshingCardId === payment.walletCardId ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {/* Edit payment settings button */}
                        <button
                          onClick={() => handleEditPaymentSettings(payment.walletCardId!, payment.cardName, payment.cardMask)}
                          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                          title="Edit payment settings"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>

    {/* Unbilled Balances Section */}
    {unbilledBalances.length > 0 && (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <button
          onClick={() => setIsUnbilledExpanded(!isUnbilledExpanded)}
          className="w-full flex items-center justify-between bg-zinc-800/50 px-4 py-3 border-b border-zinc-700 hover:bg-zinc-800/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/50 rounded">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-left">
              <h2 className="text-white font-medium text-sm">Unbilled Balances</h2>
              <p className="text-zinc-400 text-xs">
                {unbilledBalances.length} card{unbilledBalances.length !== 1 ? 's' : ''}: {formatCurrency(unbilledBalances.reduce((sum, u) => sum + u.unbilledAmount, 0))}
              </p>
            </div>
          </div>
          {isUnbilledExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          )}
        </button>

        {isUnbilledExpanded && (
          <>
            {/* Column Headers */}
            <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500 bg-zinc-800/30">
              <div className="flex-1">Card</div>
              <div className="w-20 text-right">Unbilled</div>
              <div className="w-20 text-right">Closes</div>
              <div className="w-20 text-right">Due</div>
              {onUpdatePaymentSettings && <div className="w-14" />} {/* Actions spacer */}
            </div>

            {/* Unbilled Balances List */}
            <div className="divide-y divide-zinc-800">
              {unbilledBalances.map((balance) => {
                const daysUntilClose = getDaysUntil(balance.statementCloseDate);
                
                // Check for date override
                let displayDueDate = balance.projectedDueDate;
                let hasDateOverride = false;
                if (paymentDateOverridesMap && balance.projectedDueDate) {
                  // Use local date string to match the key format
                  const year = balance.projectedDueDate.getFullYear();
                  const month = String(balance.projectedDueDate.getMonth() + 1).padStart(2, '0');
                  const day = String(balance.projectedDueDate.getDate()).padStart(2, '0');
                  const originalDateStr = `${year}-${month}-${day}`;
                  const overrideKey = `${balance.walletCardId}_${originalDateStr}`;
                  const override = paymentDateOverridesMap.get(overrideKey);
                  if (override) {
                    // Parse as local date to avoid timezone issues
                    const [y, m, d] = override.override_date.split('-').map(Number);
                    displayDueDate = new Date(y, m - 1, d);
                    hasDateOverride = true;
                  }
                }
                
                return (
                  <div key={balance.walletCardId} className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {/* Card Icon */}
                      <div className="p-2 rounded bg-zinc-700">
                        <CreditCard className="h-4 w-4 text-zinc-300" />
                      </div>

                      {/* Card Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm text-white truncate">{balance.cardName}</h3>
                          {balance.cardMask && (
                            <span className="text-zinc-500 text-sm">••{balance.cardMask}</span>
                          )}
                          {hasMultiplePlayers && balance.playerNumber && (
                            <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                              {getPlayerLabel(balance.playerNumber)}
                            </span>
                          )}
                          {balance.issuerName && (
                            <span className="text-sm text-zinc-500">• {balance.issuerName}</span>
                          )}
                          {hasDateOverride && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Rescheduled</span>
                          )}
                        </div>
                      </div>

                      {/* Unbilled Amount */}
                      <div className="w-20 text-right flex-shrink-0">
                        <p className="text-sm text-white">
                          {formatCurrency(balance.unbilledAmount)}
                        </p>
                      </div>

                      {/* Statement Close Date */}
                      <div className="w-20 text-right flex-shrink-0">
                        <p className="text-sm text-zinc-400">
                          {formatDate(balance.statementCloseDate)}
                        </p>
                      </div>

                      {/* Projected Due Date */}
                      <div className="w-20 text-right flex-shrink-0">
                        <p className={`text-sm ${hasDateOverride ? 'text-amber-400' : 'text-zinc-400'}`}>
                          {formatDate(displayDueDate)}
                          {hasDateOverride && '*'}
                        </p>
                      </div>

                      {/* Actions */}
                      {onUpdatePaymentSettings && balance.walletCardId && (
                        <div className="w-14 flex items-center justify-end gap-1 flex-shrink-0">
                          {/* Admin refresh button */}
                          {isAdmin && linkedAccountsMap?.get(balance.walletCardId) && (
                            <button
                              onClick={() => refreshCardBalance(balance.walletCardId)}
                              disabled={refreshingCardId === balance.walletCardId}
                              className="p-1 rounded text-amber-500/70 hover:text-amber-400 hover:bg-zinc-700 disabled:opacity-50"
                              title="Refresh balance"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${refreshingCardId === balance.walletCardId ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          {/* Edit payment settings button */}
                          <button
                            onClick={() => handleEditPaymentSettings(balance.walletCardId, balance.cardName, balance.cardMask)}
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                            title="Edit payment settings"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    )}

    {/* Payment Settings Modal */}
    {editingPaymentSettingsCard && onUpdatePaymentSettings && (
      <PaymentSettingsModal
        isOpen={!!editingPaymentSettingsCard}
        onClose={() => setEditingPaymentSettingsCard(null)}
        onSave={handleSavePaymentSettings}
        cardName={editingPaymentSettingsCard.cardName}
        cardMask={editingPaymentSettingsCard.cardMask}
        walletCardId={editingPaymentSettingsCard.walletCardId}
        bankAccounts={bankAccountsForSettings}
        currentSettings={paymentSettingsMap?.get(editingPaymentSettingsCard.walletCardId) ? {
          wallet_card_id: editingPaymentSettingsCard.walletCardId,
          pay_from_account_id: paymentSettingsMap.get(editingPaymentSettingsCard.walletCardId)!.pay_from_account_id,
          is_autopay: paymentSettingsMap.get(editingPaymentSettingsCard.walletCardId)!.is_autopay,
          autopay_type: null,
          fixed_autopay_amount: null,
          reminder_days_before: 3,
        } : null}
      />
    )}
    </>
  );
}
