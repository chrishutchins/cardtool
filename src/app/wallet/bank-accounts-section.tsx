"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Building2, Trash2, Star, StarOff, Pencil, Check, X, Plus, ChevronDown, ChevronRight, Repeat, Calendar, AlertTriangle, ArrowLeftRight, CreditCard, DollarSign, Settings } from "lucide-react";
import { PaymentSettingsModal, PaymentSettingsData, BankAccount as PaymentBankAccount } from "./payment-settings-modal";
import { PlaidBankLinkButton } from "./plaid-bank-link-button";
import { calculateBillingDates } from "@/lib/billing-cycle";
import { parseLocalDate, formatDateToString } from "@/lib/utils";
import type { StatementEstimate } from "@/lib/statement-calculator";
import { AddCashFlowModal } from "../payments/add-cash-flow-modal";

export interface CashFlowItem {
  id: string;
  description: string;
  amount_cents: number;
  expected_date: string;
  is_recurring: boolean;
  recurrence_type: string | null;
  category: string | null;
  is_completed: boolean;
  bank_account_id: string | null;
  wallet_card_id: string | null; // For card payments
  linked_item_id: string | null; // For linked transfer items
}

interface BankAccount {
  id: string;
  name: string;
  official_name: string | null;
  display_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  institution_name: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string | null;
  last_balance_update: string | null;
  is_primary: boolean | null;
  is_manual: boolean;
}

interface WalletCardForBank {
  id: string;
  card_id: string;
  custom_name: string | null;
  card_name: string;
  issuer_name: string;
  statement_close_day: number | null;
  payment_due_day: number | null;
  billing_formula: string | null;
  player_number: number | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

interface LinkedAccountInfo {
  id: string;
  wallet_card_id: string | null;
  current_balance: number | null;
  credit_limit: number | null;
  manual_credit_limit: number | null;
  available_balance: number | null;
  last_balance_update: string | null;
  // Liabilities data (may not be present)
  last_statement_balance?: number | null;
  last_statement_issue_date?: string | null;
  next_payment_due_date?: string | null;
  last_payment_amount?: number | null;
  last_payment_date?: string | null;
  is_overdue?: boolean;
}

interface PaymentSettings {
  pay_from_account_id: string | null;
  is_autopay: boolean;
  autopay_type: string | null;
}

interface BankAccountsSectionProps {
  initialAccounts: BankAccount[];
  accountLinkingEnabled: boolean;
  onDeleteAccount?: (accountId: string) => Promise<void>;
  onSetPrimary?: (accountId: string) => Promise<void>;
  onUpdateDisplayName?: (accountId: string, displayName: string | null) => Promise<void>;
  paymentSettingsMap?: Map<string, PaymentSettings>;
  walletCards?: WalletCardForBank[];
  linkedAccountsMap?: Map<string, LinkedAccountInfo>;
  statementEstimatesMap?: Map<string, StatementEstimate>;
  // Real-time balance refresh (for users with Full Plaid access)
  onDemandRefreshEnabled?: boolean;
  // Cash flow props
  cashFlowItems?: CashFlowItem[];
  onAddCashFlowItem?: (item: {
    description: string;
    amount_cents: number;
    expected_date: string;
    is_recurring: boolean;
    recurrence_type: string | null;
    category: string | null;
    bank_account_id: string | null;
    wallet_card_id: string | null;
  }) => Promise<string | null>;
  onLinkCashFlowItems?: (id1: string, id2: string) => Promise<void>;
  onUpdateCashFlowItem?: (id: string, item: {
    description: string;
    amount_cents: number;
    expected_date: string;
    is_recurring: boolean;
    recurrence_type: string | null;
    category: string | null;
    bank_account_id: string | null;
    wallet_card_id: string | null;
  }) => Promise<void>;
  onDeleteCashFlowItem?: (id: string) => Promise<void>;
  onToggleCashFlowCompleted?: (id: string, completed: boolean) => Promise<void>;
  // Payment date override props
  paymentDateOverridesMap?: Map<string, { id: string; wallet_card_id: string; override_date: string; original_due_date: string }>;
  onSetPaymentDateOverride?: (walletCardId: string, overrideDate: string, originalDueDate: string) => Promise<void>;
  onClearPaymentDateOverride?: (walletCardId: string, originalDueDate: string) => Promise<void>;
  // Payment settings modal props
  isAdmin?: boolean;
  bankAccountsForSettings?: PaymentBankAccount[];
  onUpdatePaymentSettings?: (walletCardId: string, settings: Omit<PaymentSettingsData, 'wallet_card_id'>) => Promise<void>;
  // Player info
  players?: Player[];
}

export function BankAccountsSection({ 
  initialAccounts, 
  accountLinkingEnabled,
  onDeleteAccount,
  onSetPrimary,
  onUpdateDisplayName,
  paymentSettingsMap,
  walletCards = [],
  linkedAccountsMap,
  statementEstimatesMap,
  onDemandRefreshEnabled = false,
  cashFlowItems = [],
  onAddCashFlowItem,
  onLinkCashFlowItems,
  onUpdateCashFlowItem,
  onDeleteCashFlowItem,
  onToggleCashFlowCompleted,
  paymentDateOverridesMap,
  onSetPaymentDateOverride,
  onClearPaymentDateOverride,
  isAdmin = false,
  bankAccountsForSettings = [],
  onUpdatePaymentSettings,
  players = [],
}: BankAccountsSectionProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [refreshingAccountId, setRefreshingAccountId] = useState<string | null>(null);
  
  // Payment date editing state
  const [editingPaymentDate, setEditingPaymentDate] = useState<{
    walletCardId: string;
    originalDueDate: string;
    currentDate: string;
  } | null>(null);
  const [savingPaymentDate, setSavingPaymentDate] = useState(false);
  
  // Manual account form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountInstitution, setNewAccountInstitution] = useState("");
  const [newAccountSubtype, setNewAccountSubtype] = useState<"checking" | "savings">("checking");
  const [newAccountMask, setNewAccountMask] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Editing balance for manual accounts
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>("");
  
  // Include unbilled balances toggle (default to checked)
  const [includeUnbilled, setIncludeUnbilled] = useState(true);
  
  // Cash flow modal state
  const [showCashFlowModal, setShowCashFlowModal] = useState(false);
  const [editingCashFlowItem, setEditingCashFlowItem] = useState<CashFlowItem | null>(null);
  const [selectedAccountForCashFlow, setSelectedAccountForCashFlow] = useState<string | null>(null);
  const [deletingCashFlowId, setDeletingCashFlowId] = useState<string | null>(null);
  
  // Payment settings modal state
  const [editingPaymentSettingsCard, setEditingPaymentSettingsCard] = useState<{
    walletCardId: string;
    cardName: string;
    cardMask: string | null;
  } | null>(null);
  
  // Refreshing individual card balance
  const [refreshingCardId, setRefreshingCardId] = useState<string | null>(null);

  // Build cards per bank account
  const cardsPerAccount = useMemo(() => {
    const map = new Map<string, Array<{
      walletId: string;
      cardName: string;
      issuerName: string;
      playerNumber: number | null;
      isAutopay: boolean;
      statementBalance: number | null;
      unbilledBalance: number | null;
      creditLimit: number | null; // For calculating % of CL
      dueDate: Date | null;
      originalDueDate: Date | null; // Original due date (before any override)
      hasDateOverride: boolean; // Whether the date has been overridden
      unbilledDueDate: Date | null; // Projected due date for unbilled balance
    }>>();

    if (!paymentSettingsMap) return map;

    walletCards.forEach(wc => {
      const settings = paymentSettingsMap.get(wc.id);
      if (!settings?.pay_from_account_id) return;

      const linked = linkedAccountsMap?.get(wc.id);
      const estimate = statementEstimatesMap?.get(wc.id);
      
      
      // Calculate billing dates
      const billingDates = (wc.statement_close_day || wc.payment_due_day)
        ? calculateBillingDates(wc.billing_formula, wc.statement_close_day, wc.payment_due_day)
        : null;
      
      // Calculate due date
      let originalDueDate: Date | null = null;
      if (linked?.next_payment_due_date) {
        originalDueDate = new Date(linked.next_payment_due_date);
      } else if (billingDates?.nextDueDate) {
        originalDueDate = billingDates.nextDueDate;
      }
      
      // Check for payment date override
      let dueDate = originalDueDate;
      let hasDateOverride = false;
      if (originalDueDate && paymentDateOverridesMap) {
        // Use local date string to avoid timezone issues
        const year = originalDueDate.getFullYear();
        const month = String(originalDueDate.getMonth() + 1).padStart(2, '0');
        const day = String(originalDueDate.getDate()).padStart(2, '0');
        const originalDateStr = `${year}-${month}-${day}`;
        const overrideKey = `${wc.id}_${originalDateStr}`;
        const override = paymentDateOverridesMap.get(overrideKey);
        if (override) {
          // Parse as local date to avoid timezone issues
          const [year, month, day] = override.override_date.split('-').map(Number);
          dueDate = new Date(year, month - 1, day);
          hasDateOverride = true;
        }
      }
      
      // Calculate projected due date for unbilled (when it will actually be due)
      // We need to calculate the due date for the NEXT billing cycle (after nextCloseDate)
      // The proper way is to call calculateBillingDates with a reference date after nextCloseDate
      let projectedDueDate: Date | null = null;
      if (billingDates?.nextCloseDate) {
        // Use a date 1 day after nextCloseDate as reference to get the due date for that cycle
        const futureRefDate = new Date(billingDates.nextCloseDate);
        futureRefDate.setDate(futureRefDate.getDate() + 1);
        const futureBillingDates = calculateBillingDates(
          wc.billing_formula,
          wc.statement_close_day,
          wc.payment_due_day,
          futureRefDate
        );
        projectedDueDate = futureBillingDates.nextDueDate;
      }

      // Get statement balance (prefer Plaid, fallback to estimate, then current balance)
      // Note: estimate.statementBalanceCents is in cents, need to convert to dollars
      const estimatedDollars = estimate?.statementBalanceCents ? estimate.statementBalanceCents / 100 : null;
      const statementBalance = linked?.last_statement_balance ?? estimatedDollars ?? linked?.current_balance ?? null;
      
      // Check if statement has already been paid (same logic as payments/page.tsx)
      // Option 1: Plaid says is_overdue=false AND a payment was made after statement date
      // Option 2: Payment amount covers the full statement balance
      const hasPlaidLiabilitiesData = linked?.last_statement_balance !== null && linked?.last_statement_balance !== undefined;
      let statementAlreadyPaid = false;
      
      // Check if current_balance is 0 or negative and is_overdue is false - statement is paid
      // This handles cases where Plaid's last_payment_date hasn't been updated yet
      if (hasPlaidLiabilitiesData && linked?.is_overdue === false && 
          linked?.current_balance !== null && linked?.current_balance !== undefined && 
          linked.current_balance <= 0) {
        statementAlreadyPaid = true;
      }
      // Otherwise check using payment date logic
      else if (hasPlaidLiabilitiesData && linked?.last_payment_date && linked?.last_statement_issue_date) {
        const paymentDate = new Date(linked.last_payment_date);
        const statementDate = new Date(linked.last_statement_issue_date);
        const paymentAmount = linked.last_payment_amount ?? 0;
        
        // If Plaid explicitly says not overdue and a payment was made since statement, trust it
        if (linked.is_overdue === false && paymentDate >= statementDate) {
          statementAlreadyPaid = true;
        }
        // Also consider paid if payment covers the full statement balance
        else if (statementBalance && paymentDate >= statementDate && paymentAmount >= statementBalance) {
          statementAlreadyPaid = true;
        }
      }
      
      // Calculate unbilled balance (current spending not yet on a statement)
      // Must be done AFTER checking if statement was paid
      let unbilledBalance: number | null = null;
      if (linked?.current_balance !== null && linked?.current_balance !== undefined && linked?.current_balance > 0) {
        if (statementAlreadyPaid) {
          // Statement was paid - all current balance is new unbilled spending
          unbilledBalance = linked.current_balance;
        } else {
          // Statement not paid - unbilled is current minus statement
          const stmtBal = linked?.last_statement_balance ?? 0;
          unbilledBalance = linked.current_balance - (stmtBal > 0 ? stmtBal : 0);
        }
        if (unbilledBalance <= 0) unbilledBalance = null;
      }
      
      // Skip if statement is already paid or balance is 0
      if (hasPlaidLiabilitiesData && (statementBalance === 0 || statementBalance === null || statementAlreadyPaid)) {
        // Even if statement is paid, include card if there's unbilled balance and we want those
        if (!unbilledBalance) {
          return; // Skip this card - no payment due and no unbilled balance
        }
      }
      
      // Also skip if no Plaid data AND no statement balance AND no unbilled balance
      // (handles demo accounts and cards without linked account data)
      if (!hasPlaidLiabilitiesData && statementBalance === null && !unbilledBalance) {
        return; // Skip - nothing to show
      }

      const accountId = settings.pay_from_account_id;
      if (!map.has(accountId)) {
        map.set(accountId, []);
      }
      
      // Cap statement balance at $0 (negative balances = credits, not payments)
      const cappedStatementBalance = statementBalance !== null ? Math.max(0, statementBalance) : null;
      // Also set to null if statement already paid
      const effectiveStatementBalance = statementAlreadyPaid ? null : cappedStatementBalance;
      
      // Get credit limit (prefer manual override, then Plaid value)
      const creditLimit = linked?.manual_credit_limit ?? linked?.credit_limit ?? null;
      
      map.get(accountId)!.push({
        walletId: wc.id,
        cardName: wc.custom_name ?? wc.card_name,
        issuerName: wc.issuer_name,
        playerNumber: wc.player_number,
        isAutopay: settings.is_autopay,
        statementBalance: effectiveStatementBalance,
        unbilledBalance,
        creditLimit,
        dueDate,
        originalDueDate,
        hasDateOverride,
        unbilledDueDate: projectedDueDate,
      });
    });

    // Sort each account's cards by due date
    map.forEach((cards) => {
      cards.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    });

    return map;
  }, [paymentSettingsMap, walletCards, linkedAccountsMap, statementEstimatesMap, paymentDateOverridesMap]);

  // Helper to get player display name
  const getPlayerLabel = (playerNumber: number | null | undefined): string | null => {
    if (playerNumber === null || playerNumber === undefined) return null;
    const player = players.find(p => p.player_number === playerNumber);
    return player?.description || `P${playerNumber}`;
  };

  // Combine CC payments with cash flow items into a unified timeline per account
  const timelinePerAccount = useMemo(() => {
    const result = new Map<string, Array<{
      id: string;
      type: 'payment' | 'unbilled' | 'cash_flow';
      description: string;
      amount: number; // positive = inflow, negative = outflow
      date: Date;
      isAutopay?: boolean;
      isRecurring?: boolean;
      isCompleted?: boolean;
      // For payments/unbilled
      walletId?: string;
      cardName?: string;
      issuerName?: string;
      playerNumber?: number | null;
      originalDueDate?: Date | null;
      hasDateOverride?: boolean;
      creditLimit?: number | null; // For % of CL calculation
      // For cash flow
      cashFlowItem?: CashFlowItem;
    }>>();

    // Initialize with empty arrays for all accounts
    accounts.forEach(acc => {
      result.set(acc.id, []);
    });

    // Calculate card payment adjustments from cash flow items
    // These reduce the statement/unbilled balances
    const cardPaymentsByCard = new Map<string, number>();
    cashFlowItems.forEach(item => {
      if (item.is_completed) return;
      if (item.category === "Card Payment" && item.wallet_card_id) {
        // Card payments are negative amounts (outflows), so we track the absolute value
        const paymentAmount = Math.abs(item.amount_cents / 100);
        const existing = cardPaymentsByCard.get(item.wallet_card_id) ?? 0;
        cardPaymentsByCard.set(item.wallet_card_id, existing + paymentAmount);
      }
    });

    // Add CC payments (adjusted for card payment cash flow items)
    cardsPerAccount.forEach((cards, accountId) => {
      const timeline = result.get(accountId) ?? [];
      cards.forEach(card => {
        // Get any card payments that reduce this card's balance
        let remainingCardPayments = cardPaymentsByCard.get(card.walletId) ?? 0;
        
        // First, apply card payments to statement balance
        let adjustedStatementBalance = card.statementBalance ?? 0;
        if (remainingCardPayments > 0 && adjustedStatementBalance > 0) {
          const reduction = Math.min(remainingCardPayments, adjustedStatementBalance);
          adjustedStatementBalance -= reduction;
          remainingCardPayments -= reduction;
        }
        
        // Then, apply remaining card payments to unbilled balance
        let adjustedUnbilledBalance = card.unbilledBalance ?? 0;
        if (remainingCardPayments > 0 && adjustedUnbilledBalance > 0) {
          const reduction = Math.min(remainingCardPayments, adjustedUnbilledBalance);
          adjustedUnbilledBalance -= reduction;
          remainingCardPayments -= reduction;
        }
        
        // Add statement balance payment (if there's a due amount after adjustments)
        if (card.dueDate && adjustedStatementBalance > 0) {
          timeline.push({
            id: `payment-${card.walletId}`,
            type: 'payment',
            description: card.cardName,
            amount: -adjustedStatementBalance, // Negative = outflow
            date: card.dueDate,
            isAutopay: card.isAutopay,
            walletId: card.walletId,
            cardName: card.cardName,
            issuerName: card.issuerName,
            playerNumber: card.playerNumber,
            originalDueDate: card.originalDueDate,
            hasDateOverride: card.hasDateOverride,
          });
        }
        
        // Add unbilled balance as separate line item (if enabled and has unbilled after adjustments)
        if (includeUnbilled && adjustedUnbilledBalance > 0 && card.unbilledDueDate) {
          // Check for override on unbilled (uses unbilledDueDate as the original)
          const unbilledOriginalDate = card.unbilledDueDate;
          let unbilledDate = unbilledOriginalDate;
          let unbilledHasOverride = false;
          if (paymentDateOverridesMap) {
            // Use local date string to avoid timezone issues
            const year = unbilledOriginalDate.getFullYear();
            const month = String(unbilledOriginalDate.getMonth() + 1).padStart(2, '0');
            const day = String(unbilledOriginalDate.getDate()).padStart(2, '0');
            const unbilledDateStr = `${year}-${month}-${day}`;
            const overrideKey = `${card.walletId}_${unbilledDateStr}`;
            const override = paymentDateOverridesMap.get(overrideKey);
            if (override) {
              // Parse as local date to avoid timezone issues
              const [y, m, d] = override.override_date.split('-').map(Number);
              unbilledDate = new Date(y, m - 1, d);
              unbilledHasOverride = true;
            }
          }
          
          // Calculate % of CL based on adjusted balance
          const clPercent = card.creditLimit && card.creditLimit > 0 
            ? adjustedUnbilledBalance / card.creditLimit 
            : null;
          
          timeline.push({
            id: `unbilled-${card.walletId}`,
            type: 'unbilled',
            description: card.cardName,
            amount: -adjustedUnbilledBalance, // Negative = outflow
            date: unbilledDate,
            walletId: card.walletId,
            cardName: card.cardName,
            issuerName: card.issuerName,
            playerNumber: card.playerNumber,
            originalDueDate: unbilledOriginalDate,
            hasDateOverride: unbilledHasOverride,
            creditLimit: card.creditLimit,
          });
        }
      });
      result.set(accountId, timeline);
    });

    // Add cash flow items
    cashFlowItems.forEach(item => {
      if (item.is_completed) return; // Skip completed items
      
      // If item has a specific account, add to that account
      // Otherwise add to all accounts (will be handled in display)
      const targetAccountId = item.bank_account_id;
      if (targetAccountId && result.has(targetAccountId)) {
        const timeline = result.get(targetAccountId)!;
        timeline.push({
          id: item.id,
          type: 'cash_flow',
          description: item.description,
          amount: item.amount_cents / 100, // Convert to dollars
          date: new Date(item.expected_date),
          isRecurring: item.is_recurring,
          isCompleted: item.is_completed,
          cashFlowItem: item,
        });
      }
    });

    // Sort each timeline by date
    result.forEach((timeline, accountId) => {
      timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
      result.set(accountId, timeline);
    });

    return result;
  }, [accounts, cardsPerAccount, cashFlowItems, includeUnbilled, paymentDateOverridesMap]);

  // Build timeline for cards with no Pay From account specified
  const unassignedItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'payment' | 'unbilled';
      description: string;
      amount: number;
      date: Date;
      isAutopay?: boolean;
      walletId: string;
      cardName: string;
      issuerName: string;
      playerNumber?: number | null;
      originalDueDate?: Date | null;
      hasDateOverride?: boolean;
      creditLimit?: number | null;
    }> = [];

    if (!paymentSettingsMap || !walletCards) return items;

    walletCards.forEach(wc => {
      const settings = paymentSettingsMap.get(wc.id);
      // Only include cards WITHOUT a pay_from_account_id
      if (settings?.pay_from_account_id) return;

      const linked = linkedAccountsMap?.get(wc.id);
      const estimate = statementEstimatesMap?.get(wc.id);
      
      // Calculate billing dates
      const billingDates = (wc.statement_close_day || wc.payment_due_day)
        ? calculateBillingDates(wc.billing_formula, wc.statement_close_day, wc.payment_due_day)
        : null;
      
      // Get card name
      const cardName = wc.custom_name || wc.card_name || 'Unknown Card';
      
      const issuerName = wc.issuer_name || '';
      
      // Calculate due date
      let originalDueDate: Date | null = null;
      if (linked?.next_payment_due_date) {
        originalDueDate = new Date(linked.next_payment_due_date);
      } else if (billingDates?.nextDueDate) {
        originalDueDate = billingDates.nextDueDate;
      }
      
      // Check for payment date override
      let dueDate = originalDueDate;
      let hasDateOverride = false;
      if (originalDueDate && paymentDateOverridesMap) {
        const year = originalDueDate.getFullYear();
        const month = String(originalDueDate.getMonth() + 1).padStart(2, '0');
        const day = String(originalDueDate.getDate()).padStart(2, '0');
        const originalDateStr = `${year}-${month}-${day}`;
        const overrideKey = `${wc.id}_${originalDateStr}`;
        const override = paymentDateOverridesMap.get(overrideKey);
        if (override) {
          const [y, m, d] = override.override_date.split('-').map(Number);
          dueDate = new Date(y, m - 1, d);
          hasDateOverride = true;
        }
      }
      
      // Get balances (estimate is in cents, convert to dollars)
      const estimatedDollars = estimate?.statementBalanceCents ? estimate.statementBalanceCents / 100 : null;
      const statementBalance = linked?.last_statement_balance ?? estimatedDollars ?? null;
      const creditLimit = linked?.manual_credit_limit ?? linked?.credit_limit ?? null;
      
      // unbilledBalance will be calculated after we determine if statement is paid
      
      // Get unbilled due date
      let unbilledDueDate: Date | null = null;
      if (billingDates?.nextDueDate && billingDates?.nextCloseDate) {
        const projectedCloseDate = billingDates.nextCloseDate;
        const daysToAdd = billingDates.nextDueDate.getTime() - projectedCloseDate.getTime();
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysBetween = Math.round(daysToAdd / msPerDay);
        
        const nextCloseDate = new Date(projectedCloseDate);
        nextCloseDate.setMonth(nextCloseDate.getMonth() + 1);
        unbilledDueDate = new Date(nextCloseDate);
        unbilledDueDate.setDate(unbilledDueDate.getDate() + daysBetween);
      }
      
      const isAutopay = settings?.is_autopay ?? false;
      
      // Check if statement is already paid
      const hasPlaidLiabilitiesData = linked?.last_statement_balance !== null && linked?.last_statement_balance !== undefined;
      let statementAlreadyPaid = false;
      
      // Check if current_balance is 0 or negative and is_overdue is false - statement is paid
      if (hasPlaidLiabilitiesData && linked?.is_overdue === false && 
          linked?.current_balance !== null && linked?.current_balance !== undefined && 
          linked.current_balance <= 0) {
        statementAlreadyPaid = true;
      }
      // Otherwise check using payment date logic
      else if (hasPlaidLiabilitiesData && linked?.last_payment_date && linked?.last_statement_issue_date) {
        const paymentDate = new Date(linked.last_payment_date);
        const statementDate = new Date(linked.last_statement_issue_date);
        const paymentAmount = linked.last_payment_amount ?? 0;
        
        if (linked.is_overdue === false && paymentDate >= statementDate) {
          statementAlreadyPaid = true;
        } else if (statementBalance && paymentDate >= statementDate && paymentAmount >= statementBalance) {
          statementAlreadyPaid = true;
        }
      }
      
      // Calculate unbilled balance (current spending not yet on a statement)
      let unbilledBalance: number | null = null;
      if (linked?.current_balance !== null && linked?.current_balance !== undefined && linked?.current_balance > 0) {
        if (statementAlreadyPaid) {
          // Statement was paid - all current balance is new unbilled spending
          unbilledBalance = linked.current_balance;
        } else {
          // Statement not paid - unbilled is current minus statement
          const stmtBal = linked?.last_statement_balance ?? 0;
          unbilledBalance = linked.current_balance - (stmtBal > 0 ? stmtBal : 0);
        }
        if (unbilledBalance <= 0) unbilledBalance = null;
      }
      
      // Add statement balance payment (only if not already paid)
      if (dueDate && statementBalance && statementBalance > 0 && !statementAlreadyPaid) {
        items.push({
          id: `payment-${wc.id}`,
          type: 'payment',
          description: cardName,
          amount: -statementBalance,
          date: dueDate,
          isAutopay,
          walletId: wc.id,
          cardName,
          issuerName,
          playerNumber: wc.player_number,
          originalDueDate,
          hasDateOverride,
        });
      }
      
      // Add unbilled balance
      if (includeUnbilled && unbilledBalance && unbilledBalance > 0 && unbilledDueDate) {
        let unbilledDate = unbilledDueDate;
        let unbilledHasOverride = false;
        if (paymentDateOverridesMap) {
          const year = unbilledDueDate.getFullYear();
          const month = String(unbilledDueDate.getMonth() + 1).padStart(2, '0');
          const day = String(unbilledDueDate.getDate()).padStart(2, '0');
          const unbilledDateStr = `${year}-${month}-${day}`;
          const overrideKey = `${wc.id}_${unbilledDateStr}`;
          const override = paymentDateOverridesMap.get(overrideKey);
          if (override) {
            const [y, m, d] = override.override_date.split('-').map(Number);
            unbilledDate = new Date(y, m - 1, d);
            unbilledHasOverride = true;
          }
        }
        
        items.push({
          id: `unbilled-${wc.id}`,
          type: 'unbilled',
          description: cardName,
          amount: -unbilledBalance,
          date: unbilledDate,
          walletId: wc.id,
          cardName,
          issuerName,
          playerNumber: wc.player_number,
          originalDueDate: unbilledDueDate,
          hasDateOverride: unbilledHasOverride,
          creditLimit,
        });
      }
    });
    
    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items;
  }, [walletCards, paymentSettingsMap, linkedAccountsMap, statementEstimatesMap, paymentDateOverridesMap, includeUnbilled]);

  const toggleExpanded = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleSetPrimary = (accountId: string) => {
    if (!onSetPrimary) return;
    
    // Optimistic update
    setAccounts(prev => prev.map(acc => ({
      ...acc,
      is_primary: acc.id === accountId,
    })));
    
    startTransition(() => {
      onSetPrimary(accountId);
    });
  };

  const handleDelete = async (accountId: string) => {
    if (!onDeleteAccount) return;
    if (!confirm("Are you sure you want to remove this bank account? This will affect any cards using it as a Pay From account.")) {
      return;
    }
    
    setDeletingId(accountId);
    
    // Optimistic update
    setAccounts(prev => prev.filter(acc => acc.id !== accountId));
    
    startTransition(async () => {
      await onDeleteAccount(accountId);
      setDeletingId(null);
    });
  };

  const startEditingName = (account: BankAccount) => {
    setEditingNameId(account.id);
    setEditNameValue(account.display_name || "");
  };

  const cancelEditingName = () => {
    setEditingNameId(null);
    setEditNameValue("");
  };

  const saveEditingName = (accountId: string) => {
    if (!onUpdateDisplayName) return;
    
    const trimmedValue = editNameValue.trim() || null;
    
    // Optimistic update
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId 
        ? { ...acc, display_name: trimmedValue }
        : acc
    ));
    
    setEditingNameId(null);
    setEditNameValue("");
    
    startTransition(() => {
      onUpdateDisplayName(accountId, trimmedValue);
    });
  };

  const startEditingBalance = (account: BankAccount) => {
    setEditingBalanceId(account.id);
    setEditBalanceValue(account.available_balance?.toString() ?? "");
  };

  const cancelEditingBalance = () => {
    setEditingBalanceId(null);
    setEditBalanceValue("");
  };

  const saveEditingBalance = async (accountId: string) => {
    const numValue = parseFloat(editBalanceValue);
    if (isNaN(numValue)) {
      cancelEditingBalance();
      return;
    }

    // Optimistic update
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId 
        ? { ...acc, available_balance: numValue, current_balance: numValue, last_balance_update: new Date().toISOString() }
        : acc
    ));

    setEditingBalanceId(null);
    setEditBalanceValue("");

    try {
      await fetch("/api/bank-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, availableBalance: numValue }),
      });
    } catch (error) {
      console.error("Failed to update balance:", error);
    }
  };

  const refreshAccounts = async () => {
    setIsRefreshing(true);
    try {
      // First refresh liabilities data (statement balances, payment info)
      // This gracefully skips users without liabilities consent
      await fetch("/api/plaid/refresh-liabilities", { method: "POST" });
      
      // Then refresh bank account data
      const response = await fetch("/api/bank-accounts");
      const data = await response.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
      
      // Reload the page to refresh all payment data
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh a single account's balance in real-time (requires Full Plaid access)
  const refreshSingleAccount = async (accountId: string) => {
    if (!onDemandRefreshEnabled) return;
    
    setRefreshingAccountId(accountId);
    try {
      const response = await fetch("/api/plaid/refresh-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, accountType: "bank" }),
      });

      const data = await response.json();
      
      if (response.ok && data.balance) {
        // Update the account in state with the new balance
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { 
                ...acc, 
                current_balance: data.balance.current_balance,
                available_balance: data.balance.available_balance,
                last_balance_update: data.balance.last_balance_update,
              }
            : acc
        ));
      } else {
        console.error("Error refreshing account balance:", data.error);
      }
    } catch (error) {
      console.error("Error refreshing account balance:", error);
    } finally {
      setRefreshingAccountId(null);
    }
  };

  const handleLinkSuccess = () => {
    // Refresh the page to show new accounts
    window.location.reload();
  };

  const handleCreateManualAccount = async () => {
    if (!newAccountName.trim()) {
      setCreateError("Account name is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccountName.trim(),
          institutionName: newAccountInstitution.trim() || null,
          subtype: newAccountSubtype,
          mask: newAccountMask.trim() || null,
          availableBalance: newAccountBalance ? parseFloat(newAccountBalance) : null,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setCreateError(data.error || "Failed to create account");
        return;
      }

      // Add new account to state
      if (data.account) {
        setAccounts(prev => [...prev, data.account]);
      }

      // Reset form
      setShowAddForm(false);
      setNewAccountName("");
      setNewAccountInstitution("");
      setNewAccountSubtype("checking");
      setNewAccountMask("");
      setNewAccountBalance("");
    } catch (error) {
      console.error("Error creating manual account:", error);
      setCreateError("Failed to create account");
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: number | null, currency?: string | null) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Note: parseLocalDate and formatDateToString are imported from @/lib/utils

  const getDisplayName = (account: BankAccount) => {
    return account.display_name || account.official_name || account.name;
  };

  const getAccountTypeLabel = (subtype: string | null) => {
    if (!subtype) return "Account";
    return subtype.charAt(0).toUpperCase() + subtype.slice(1);
  };

  // Cash flow handlers
  const handleAddCashFlowItem = (accountId: string | null) => {
    setSelectedAccountForCashFlow(accountId);
    setEditingCashFlowItem(null);
    setShowCashFlowModal(true);
  };

  const handleEditCashFlowItem = (item: CashFlowItem) => {
    setEditingCashFlowItem(item);
    setSelectedAccountForCashFlow(item.bank_account_id);
    setShowCashFlowModal(true);
  };

  // Helper to generate transfer description
  const generateTransferDescription = (accountId: string, direction: "From" | "To") => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return `Transfer ${direction} Account`;
    const bankName = account.institution_name || "";
    const accountName = account.display_name || account.name || "";
    const mask = account.mask ? `•••${account.mask}` : "";
    return `Transfer ${direction} ${[bankName, accountName, mask].filter(Boolean).join(" ")}`;
  };

  const handleSaveCashFlowItem = async (data: {
    description: string;
    amount_cents: number;
    expected_date: string;
    is_recurring: boolean;
    recurrence_type: string | null;
    category: string | null;
    bank_account_id: string | null;
    wallet_card_id: string | null;
  }, transferToAccountId?: string | null) => {
    if (editingCashFlowItem && onUpdateCashFlowItem) {
      await onUpdateCashFlowItem(editingCashFlowItem.id, data);
    } else if (onAddCashFlowItem) {
      // If it's a transfer, generate proper descriptions for each side and link them
      if (transferToAccountId && data.bank_account_id && data.category === "Transfer") {
        const isOutflow = data.amount_cents < 0;
        
        // Source account description: "Transfer To [Destination]" for outflow, "Transfer From [Destination]" for inflow
        const sourceDescription = data.description.trim() || generateTransferDescription(
          transferToAccountId, 
          isOutflow ? "To" : "From"
        );
        
        // Destination account description: opposite direction, references source account
        const destDescription = generateTransferDescription(
          data.bank_account_id,
          isOutflow ? "From" : "To"
        );
        
        // Create source item and get its ID
        const sourceId = await onAddCashFlowItem({
          ...data,
          description: sourceDescription,
        });
        
        // Create destination item and get its ID
        const destId = await onAddCashFlowItem({
          description: destDescription,
          amount_cents: -data.amount_cents, // Opposite sign
          expected_date: data.expected_date,
          is_recurring: data.is_recurring,
          recurrence_type: data.recurrence_type,
          category: "Transfer",
          bank_account_id: transferToAccountId,
          wallet_card_id: null,
        });
        
        // Link the two items together
        if (sourceId && destId && onLinkCashFlowItems) {
          await onLinkCashFlowItems(sourceId, destId);
        }
      } else {
        // Not a transfer, just create the single item
        await onAddCashFlowItem(data);
      }
    }
    setShowCashFlowModal(false);
    setEditingCashFlowItem(null);
    setSelectedAccountForCashFlow(null);
  };

  const handleDeleteCashFlowItem = (id: string) => {
    if (!onDeleteCashFlowItem) return;
    setDeletingCashFlowId(id);
    startTransition(async () => {
      await onDeleteCashFlowItem(id);
      setDeletingCashFlowId(null);
    });
  };

  const handleToggleCashFlowCompleted = (id: string, completed: boolean) => {
    if (!onToggleCashFlowCompleted) return;
    startTransition(async () => {
      await onToggleCashFlowCompleted(id, completed);
    });
  };

  // Payment date override handlers
  const handleEditPaymentDate = (walletCardId: string, originalDueDate: Date, currentDate: Date) => {
    setEditingPaymentDate({
      walletCardId,
      originalDueDate: formatDateToString(originalDueDate),
      currentDate: formatDateToString(currentDate),
    });
  };

  const handleSavePaymentDate = async (newDate: string) => {
    if (!editingPaymentDate || !onSetPaymentDateOverride) return;
    setSavingPaymentDate(true);
    try {
      await onSetPaymentDateOverride(
        editingPaymentDate.walletCardId,
        newDate,
        editingPaymentDate.originalDueDate
      );
    } finally {
      setSavingPaymentDate(false);
      setEditingPaymentDate(null);
    }
  };

  const handleResetPaymentDate = async (walletCardId: string, originalDueDate: Date) => {
    if (!onClearPaymentDateOverride) return;
    const originalDateStr = formatDateToString(originalDueDate);
    startTransition(async () => {
      await onClearPaymentDateOverride(walletCardId, originalDateStr);
    });
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

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Pay From Accounts</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Bank accounts used to pay your credit card bills
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Include Unbilled Balances Toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeUnbilled}
              onChange={(e) => setIncludeUnbilled(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
            <span className="text-zinc-400">Include unbilled</span>
          </label>
          <div className="flex gap-2">
          {accounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAccounts}
              disabled={isRefreshing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          )}
          {onAddCashFlowItem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCashFlowItem(null)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Add Cash Flow
            </Button>
          )}
          {accountLinkingEnabled && (
            <PlaidBankLinkButton onSuccess={handleLinkSuccess} />
          )}
          </div>
        </div>
      </div>

      {/* Manual Account Form */}
      {showAddForm && (
        <div 
          className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isCreating) {
              e.preventDefault();
              handleCreateManualAccount();
            }
          }}
        >
          <h3 className="font-medium text-white mb-3">Add Account Manually</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Account Name *</label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g., Primary Checking"
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Bank/Institution</label>
              <input
                type="text"
                value={newAccountInstitution}
                onChange={(e) => setNewAccountInstitution(e.target.value)}
                placeholder="e.g., Chase, Bank of America"
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Account Type</label>
              <select
                value={newAccountSubtype}
                onChange={(e) => setNewAccountSubtype(e.target.value as "checking" | "savings")}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Last 4 Digits</label>
              <input
                type="text"
                value={newAccountMask}
                onChange={(e) => setNewAccountMask(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                maxLength={4}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-zinc-400 mb-1">Available Balance (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-lg pl-7 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">You can update this anytime</p>
            </div>
          </div>
          {createError && (
            <p className="text-red-400 text-sm mt-2">{createError}</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setCreateError(null);
              }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateManualAccount}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? "Creating..." : "Add Account"}
            </Button>
          </div>
        </div>
      )}

      {accounts.length === 0 && !showAddForm ? (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No bank accounts added yet.</p>
          <p className="text-zinc-500 text-sm mt-1">
            Add a checking or savings account to track your payment capacity.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...accounts]
            .sort((a, b) => {
              // Primary first
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              // Then by number of cards (most first)
              const aCards = cardsPerAccount.get(a.id)?.length ?? 0;
              const bCards = cardsPerAccount.get(b.id)?.length ?? 0;
              return bCards - aCards;
            })
            .map((account) => {
            const cards = cardsPerAccount.get(account.id) || [];
            const timeline = timelinePerAccount.get(account.id) || [];
            const isExpanded = expandedAccounts.has(account.id);
            const hasItems = timeline.length > 0;
            
            // Calculate totals from timeline (negative amounts are outflows)
            const totalOutflows = timeline.reduce((sum, item) => {
              return sum + (item.amount < 0 ? Math.abs(item.amount) : 0);
            }, 0);
            const totalInflows = timeline.reduce((sum, item) => {
              return sum + (item.amount > 0 ? item.amount : 0);
            }, 0);
            const netChange = totalInflows - totalOutflows;
            const projectedBalance = (account.available_balance ?? 0) + netChange;
            
            // Calculate overdraft risk - find first date when balance goes negative
            let runningBalanceCalc = account.available_balance ?? 0;
            let firstOverdraftDate: Date | null = null;
            for (const item of timeline) {
              runningBalanceCalc += item.amount;
              if (runningBalanceCalc < 0 && !firstOverdraftDate) {
                firstOverdraftDate = item.date;
                break;
              }
            }
            
            return (
              <div
                key={account.id}
                className={`bg-zinc-800/50 rounded-lg border ${
                  account.is_primary ? 'border-blue-500/50' : 'border-zinc-700'
                }`}
              >
                {/* Account Header Row - Always visible */}
                <div 
                  className={`flex items-center justify-between p-3 ${
                    isExpanded ? 'rounded-t-lg' : 'rounded-lg'
                  } ${hasItems ? 'cursor-pointer hover:bg-zinc-800/70' : ''}`}
                  onClick={() => hasItems && toggleExpanded(account.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Expand/Collapse Icon */}
                    {hasItems ? (
                      <button className="p-1 text-zinc-400 hover:text-zinc-200">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    ) : (
                      <div className="w-6" /> // Spacer
                    )}
                    
                    {/* Bank Icon */}
                    <div className={`p-1.5 rounded ${account.is_primary ? 'bg-blue-700/50' : 'bg-zinc-700'}`}>
                      <Building2 className={`h-4 w-4 ${account.is_primary ? 'text-blue-300' : 'text-zinc-300'}`} />
                    </div>
                    
                    {/* Account Name & Info */}
                    <div className="flex-1 min-w-0">
                      {editingNameId === account.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditingName(account.id);
                              if (e.key === "Escape") cancelEditingName();
                            }}
                            className="bg-zinc-700 border border-zinc-600 text-zinc-200 rounded px-2 py-0.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder={account.official_name || account.name}
                            autoFocus
                          />
                          <button onClick={() => saveEditingName(account.id)} className="p-1 text-blue-400 hover:bg-zinc-700 rounded">
                            <Check className="h-3 w-3" />
                          </button>
                          <button onClick={cancelEditingName} className="p-1 text-zinc-400 hover:bg-zinc-700 rounded">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {account.institution_name && (
                            <>
                              <span className="font-medium text-white">{account.institution_name}</span>
                              <span className="text-zinc-600">•</span>
                            </>
                          )}
                          <span className="font-medium text-white truncate">
                            {getDisplayName(account)}
                          </span>
                          {account.mask && (
                            <span className="text-zinc-500 text-sm">••••{account.mask}</span>
                          )}
                          {onUpdateDisplayName && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditingName(account); }}
                              className="p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded"
                              title="Edit nickname"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                          {!account.institution_name && account.subtype && (
                            <>
                              <span className="text-zinc-500">•</span>
                              <span className="text-zinc-400 text-sm">{getAccountTypeLabel(account.subtype)}</span>
                            </>
                          )}
                          {account.is_primary && (
                            <>
                              <span className="text-zinc-500">•</span>
                              <span className="text-blue-400 text-sm font-medium">Primary</span>
                            </>
                          )}
                          {account.is_manual && (
                            <>
                              <span className="text-zinc-500">•</span>
                              <span className="text-amber-400/80 text-sm">Manual</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Balance column */}
                    <div className="w-44 text-left flex-shrink-0 text-sm" onClick={e => e.stopPropagation()}>
                      {editingBalanceId === account.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-400">Balance:</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                            <input
                              type="number"
                              value={editBalanceValue}
                              onChange={(e) => setEditBalanceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditingBalance(account.id);
                                if (e.key === "Escape") cancelEditingBalance();
                              }}
                              className="w-24 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded pl-5 pr-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                              step="0.01"
                              autoFocus
                            />
                          </div>
                          <button onClick={() => saveEditingBalance(account.id)} className="p-1 text-blue-400 hover:bg-zinc-700 rounded">
                            <Check className="h-3 w-3" />
                          </button>
                          <button onClick={cancelEditingBalance} className="p-1 text-zinc-400 hover:bg-zinc-700 rounded">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400">
                          Balance:{' '}
                          <span className={`font-semibold ${
                            projectedBalance < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {formatCurrency(account.available_balance, account.iso_currency_code)}
                          </span>
                          {account.is_manual && (
                            <button
                              onClick={() => startEditingBalance(account)}
                              className="ml-1 p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded inline-flex"
                              title="Edit balance"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    
                    {/* Overdraft risk column */}
                    <div className="w-44 text-left flex-shrink-0 text-sm">
                      {hasItems ? (
                        firstOverdraftDate ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Overdraft in {Math.ceil((firstOverdraftDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
                          </span>
                        ) : (
                          <span className="text-white">No Overdraft Risk</span>
                        )
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </div>
                    
                    {/* Items count column */}
                    <div className="w-20 text-center flex-shrink-0">
                      {hasItems ? (
                        <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {timeline.length} item{timeline.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    {/* Per-account real-time refresh (only for Plaid-linked accounts) */}
                    {onDemandRefreshEnabled && !account.is_manual && (
                      <button
                        onClick={() => refreshSingleAccount(account.id)}
                        disabled={refreshingAccountId === account.id}
                        className="p-1 text-amber-500/70 hover:text-amber-400 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                        title="Refresh balance (real-time)"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshingAccountId === account.id ? "animate-spin" : ""}`} />
                      </button>
                    )}
                    {/* Spacer for manual accounts to keep alignment */}
                    {onDemandRefreshEnabled && account.is_manual && (
                      <div className="w-6" />
                    )}
                    {onSetPrimary && !account.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(account.id)}
                        disabled={isPending}
                        className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                        title="Set as primary"
                      >
                        <StarOff className="h-4 w-4" />
                      </button>
                    )}
                    {account.is_primary && (
                      <div className="p-1 text-blue-400" title="Primary account">
                        <Star className="h-4 w-4 fill-current" />
                      </div>
                    )}
                    {onDeleteAccount && (
                      <button
                        onClick={() => handleDelete(account.id)}
                        disabled={isPending || deletingId === account.id}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                        title="Remove account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Timeline */}
                {isExpanded && hasItems && (
                  <div className="border-t border-zinc-700">
                    {/* Header row */}
                    <div className="flex items-center gap-4 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wide bg-zinc-800/30">
                      <div className="w-20">Date</div>
                      <div className="flex-1">Description</div>
                      <div className="w-24 text-right">Amount</div>
                      <div className="w-28 text-right">Balance</div>
                      <div className="w-20"></div>
                    </div>
                    {/* Timeline rows */}
                    {(() => {
                      let runningBalance = account.available_balance ?? 0;
                      return timeline.map((item) => {
                        runningBalance += item.amount;
                        // Treat tiny negative values (< 1 cent) as $0, not overdraft
                        const isOverdraft = runningBalance < -0.005;
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`flex items-center gap-4 px-4 py-2 text-sm border-t border-zinc-700/50 ${
                              isOverdraft ? 'bg-red-500/5' : ''
                            }`}
                          >
                            <div className="w-20">
                              {(item.type === 'payment' || item.type === 'unbilled') && item.walletId && onSetPaymentDateOverride ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Use originalDueDate if available, otherwise use current date
                                    const origDate = item.originalDueDate ?? item.date;
                                    handleEditPaymentDate(item.walletId!, origDate, item.date);
                                  }}
                                  className={`text-left hover:text-white transition-colors ${
                                    item.hasDateOverride ? 'text-amber-400' : 'text-zinc-400'
                                  }`}
                                  title={item.hasDateOverride 
                                    ? `Scheduled early (original: ${formatDate(item.originalDueDate ?? item.date)})`
                                    : "Click to change payment date"
                                  }
                                >
                                  {formatDate(item.date)}
                                  {item.hasDateOverride && <span className="ml-0.5">*</span>}
                                </button>
                              ) : (
                                <span className="text-zinc-400">{formatDate(item.date)}</span>
                              )}
                            </div>
                            <div className="flex-1 truncate">
                              <div className="flex items-center gap-2">
                                {item.type === 'payment' ? (
                                  <>
                                    <CreditCard className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                                    <span className="text-white">{item.cardName}</span>
                                    <span className="text-zinc-500">{item.issuerName}</span>
                                    {item.playerNumber && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                                        {getPlayerLabel(item.playerNumber)}
                                      </span>
                                    )}
                                    {item.isAutopay && (
                                      <Repeat className="h-3 w-3 text-emerald-400" />
                                    )}
                                    {item.hasDateOverride && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Rescheduled</span>
                                    )}
                                  </>
                                ) : item.type === 'unbilled' ? (
                                  <>
                                    <CreditCard className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                    <span className="text-white">{item.cardName}</span>
                                    <span className="text-zinc-500">{item.issuerName}</span>
                                    {item.playerNumber && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                                        {getPlayerLabel(item.playerNumber)}
                                      </span>
                                    )}
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Unbilled</span>
                                    {item.creditLimit && item.creditLimit > 0 && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        Math.abs(item.amount) / item.creditLimit > 0.3 
                                          ? 'bg-amber-500/20 text-amber-400' 
                                          : 'bg-zinc-700 text-zinc-400'
                                      }`}>
                                        {Math.round(Math.abs(item.amount) / item.creditLimit * 100)}% of CL
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {/* Icon based on category */}
                                    {item.cashFlowItem?.category === "Transfer" ? (
                                      <ArrowLeftRight className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                    ) : item.cashFlowItem?.category === "Card Payment" ? (
                                      <CreditCard className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                    ) : (
                                      <DollarSign className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                    )}
                                    {item.isRecurring && (
                                      <Repeat className="h-3 w-3 text-zinc-500" />
                                    )}
                                    <span className="text-white">{item.description}</span>
                                    {item.cashFlowItem?.category === "Card Payment" && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Card Payment</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className={`w-24 text-right font-medium ${
                              item.amount >= 0 ? 'text-emerald-400' : 'text-white'
                            }`}>
                              {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                            </div>
                            <div className={`w-28 text-right font-medium ${
                              isOverdraft ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {formatCurrency(Math.abs(runningBalance) < 0.005 ? 0 : runningBalance)}
                            </div>
                            <div className="w-20 flex items-center justify-end gap-1">
                              {/* Payment/Unbilled item actions */}
                              {(item.type === 'payment' || item.type === 'unbilled') && item.walletId && (
                                <>
                                  {/* Admin refresh button */}
                                  {isAdmin && linkedAccountsMap?.get(item.walletId) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        refreshCardBalance(item.walletId!);
                                      }}
                                      disabled={refreshingCardId === item.walletId}
                                      className="p-1 rounded text-amber-500/70 hover:text-amber-400 hover:bg-zinc-700 disabled:opacity-50"
                                      title="Refresh balance"
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingCardId === item.walletId ? 'animate-spin' : ''}`} />
                                    </button>
                                  )}
                                  {/* Edit payment settings button */}
                                  {onUpdatePaymentSettings && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPaymentSettings(item.walletId!, item.cardName || item.description, null);
                                      }}
                                      className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                                      title="Edit payment settings"
                                    >
                                      <Settings className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                              {item.type === 'payment' && item.hasDateOverride && item.walletId && item.originalDueDate && onClearPaymentDateOverride && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetPaymentDate(item.walletId!, item.originalDueDate!);
                                  }}
                                  className="text-xs px-1.5 py-0.5 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                                  title={`Reset to original due date: ${formatDate(item.originalDueDate)}`}
                                >
                                  Reset
                                </button>
                              )}
                              {item.type === 'cash_flow' && item.cashFlowItem && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditCashFlowItem(item.cashFlowItem!);
                                    }}
                                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCashFlowItem(item.cashFlowItem!.id);
                                    }}
                                    disabled={deletingCashFlowId === item.cashFlowItem!.id}
                                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {/* Add item button */}
                    {onAddCashFlowItem && (
                      <div className="flex justify-center py-2 border-t border-zinc-700/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCashFlowItem(account.id);
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add cash flow item
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* No Pay From Account Specified Section */}
          {unassignedItems.length > 0 && (
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
              {/* Header Row */}
              <div 
                className={`flex items-center justify-between p-3 ${
                  expandedAccounts.has('__unassigned__') ? 'rounded-t-lg' : 'rounded-lg'
                } cursor-pointer hover:bg-zinc-800/70`}
                onClick={() => toggleExpanded('__unassigned__')}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Expand/Collapse Icon */}
                  <button className="p-1 text-zinc-400 hover:text-zinc-200">
                    {expandedAccounts.has('__unassigned__') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  
                  {/* Warning Icon */}
                  <div className="p-1.5 rounded bg-amber-700/30">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  
                  {/* Section Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-400 truncate">No Pay From Account Specified</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{unassignedItems.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Timeline */}
              {expandedAccounts.has('__unassigned__') && (
                <div className="border-t border-zinc-700">
                  {/* Header Row */}
                  <div className="flex items-center text-xs text-zinc-500 px-3 py-2 border-b border-zinc-700/50">
                    <div className="flex-1">Payment</div>
                    <div className="w-24 text-right">Amount</div>
                    <div className="w-16"></div>
                  </div>
                  
                  {/* Timeline Items */}
                  {unassignedItems.map((item) => {
                    // Calculate % of CL for unbilled items
                    const clPercent = item.type === 'unbilled' && item.creditLimit && item.creditLimit > 0
                      ? Math.abs(item.amount) / item.creditLimit
                      : null;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center px-3 py-2 hover:bg-zinc-700/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.type === 'payment' ? (
                              <CreditCard className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.walletId && onSetPaymentDateOverride) {
                                  handleEditPaymentDate(item.walletId, item.originalDueDate ?? item.date, item.date);
                                }
                              }}
                              className={`text-sm hover:underline ${
                                item.hasDateOverride ? 'text-amber-400' : 'text-zinc-400'
                              }`}
                              title={item.hasDateOverride ? `Original: ${formatDate(item.originalDueDate ?? item.date)}` : undefined}
                            >
                              {formatDate(item.date)}
                            </button>
                            {item.isAutopay && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Autopay</span>
                            )}
                            {item.playerNumber && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                                {getPlayerLabel(item.playerNumber)}
                              </span>
                            )}
                            {item.type === 'unbilled' && (
                              <>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Unbilled</span>
                                {clPercent !== null && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    clPercent > 0.3 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'
                                  }`}>
                                    {Math.round(clPercent * 100)}% of CL
                                  </span>
                                )}
                              </>
                            )}
                            <span className="text-white truncate">{item.description}</span>
                          </div>
                        </div>
                        <div className="w-24 text-right font-medium text-white">
                          {formatCurrency(item.amount)}
                        </div>
                        <div className="w-16 flex items-center justify-end gap-1">
                          {/* Admin refresh button */}
                          {isAdmin && linkedAccountsMap?.get(item.walletId) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshCardBalance(item.walletId);
                              }}
                              disabled={refreshingCardId === item.walletId}
                              className="p-1 rounded text-amber-500/70 hover:text-amber-400 hover:bg-zinc-700 disabled:opacity-50"
                              title="Refresh balance"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${refreshingCardId === item.walletId ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          {/* Edit payment settings button */}
                          {onUpdatePaymentSettings && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPaymentSettings(item.walletId, item.cardName || item.description, null);
                              }}
                              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                              title="Edit payment settings"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Cash Flow Modal */}
      {onAddCashFlowItem && (
        <AddCashFlowModal
          isOpen={showCashFlowModal}
          onClose={() => {
            setShowCashFlowModal(false);
            setEditingCashFlowItem(null);
            setSelectedAccountForCashFlow(null);
          }}
          onSave={handleSaveCashFlowItem}
          bankAccounts={accounts.map(a => ({
            id: a.id,
            name: a.name,
            display_name: a.display_name,
            institution_name: a.institution_name,
            mask: a.mask,
            subtype: a.subtype,
          }))}
          walletCards={walletCards.map(wc => ({
            id: wc.id,
            card_name: wc.card_name,
            custom_name: wc.custom_name,
            issuer_name: wc.issuer_name,
          }))}
          editItem={editingCashFlowItem ?? null}
          preSelectedAccountId={selectedAccountForCashFlow}
          linkedAccountName={(() => {
            // Find the linked item and get its bank account name
            if (!editingCashFlowItem?.linked_item_id) return null;
            const linkedItem = cashFlowItems.find(i => i.id === editingCashFlowItem.linked_item_id);
            if (!linkedItem?.bank_account_id) return null;
            const linkedAccount = accounts.find(a => a.id === linkedItem.bank_account_id);
            if (!linkedAccount) return null;
            const bankName = linkedAccount.institution_name || "";
            const accountName = linkedAccount.display_name || linkedAccount.name || "";
            const mask = linkedAccount.mask ? `•••${linkedAccount.mask}` : "";
            return [bankName, accountName, mask].filter(Boolean).join(" ");
          })()}
        />
      )}

      {/* Payment Date Override Modal */}
      {editingPaymentDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingPaymentDate(null)}>
          <div 
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-80" 
            onClick={e => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !savingPaymentDate && editingPaymentDate.currentDate !== editingPaymentDate.originalDueDate) {
                e.preventDefault();
                handleSavePaymentDate(editingPaymentDate.currentDate);
              }
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Change Payment Date</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Calculated due date: {formatDate(parseLocalDate(editingPaymentDate.originalDueDate))}
            </p>
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">New payment date</label>
              <input
                type="date"
                value={editingPaymentDate.currentDate}
                onChange={(e) => setEditingPaymentDate({
                  ...editingPaymentDate,
                  currentDate: e.target.value
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="flex justify-between">
              {/* Reset button - clears the override from database */}
              {onClearPaymentDateOverride && (
                <button
                  onClick={async () => {
                    setSavingPaymentDate(true);
                    try {
                      await onClearPaymentDateOverride(
                        editingPaymentDate.walletCardId,
                        editingPaymentDate.originalDueDate
                      );
                    } finally {
                      setSavingPaymentDate(false);
                      setEditingPaymentDate(null);
                    }
                  }}
                  disabled={savingPaymentDate}
                  className="px-3 py-2 text-sm text-amber-400 hover:text-amber-300 disabled:opacity-50"
                >
                  Reset to calculated
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingPaymentDate(null)}
                  className="px-3 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSavePaymentDate(editingPaymentDate.currentDate)}
                  disabled={savingPaymentDate || editingPaymentDate.currentDate === editingPaymentDate.originalDueDate}
                  className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50"
                >
                  {savingPaymentDate ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settings Modal */}
      {editingPaymentSettingsCard && onUpdatePaymentSettings && (
        <PaymentSettingsModal
          isOpen={true}
          onClose={() => setEditingPaymentSettingsCard(null)}
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
          onSave={handleSavePaymentSettings}
        />
      )}
    </div>
  );
}
