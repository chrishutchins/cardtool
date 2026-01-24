"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Building2, Trash2, Star, StarOff, Pencil, Check, X, Plus, ChevronDown, ChevronRight, Repeat } from "lucide-react";
import { PlaidBankLinkButton } from "./plaid-bank-link-button";
import { calculateBillingDates } from "@/lib/billing-cycle";
import type { StatementEstimate } from "@/lib/statement-calculator";

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
}: BankAccountsSectionProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  
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
  
  // Include unbilled balances toggle
  const [includeUnbilled, setIncludeUnbilled] = useState(false);

  // Build cards per bank account
  const cardsPerAccount = useMemo(() => {
    const map = new Map<string, Array<{
      walletId: string;
      cardName: string;
      issuerName: string;
      isAutopay: boolean;
      statementBalance: number | null;
      unbilledBalance: number | null;
      dueDate: Date | null;
    }>>();

    if (!paymentSettingsMap) return map;

    walletCards.forEach(wc => {
      const settings = paymentSettingsMap.get(wc.id);
      if (!settings?.pay_from_account_id) return;

      const linked = linkedAccountsMap?.get(wc.id);
      const estimate = statementEstimatesMap?.get(wc.id);
      
      // Calculate due date
      let dueDate: Date | null = null;
      if (linked?.next_payment_due_date) {
        dueDate = new Date(linked.next_payment_due_date);
      } else if (wc.statement_close_day || wc.payment_due_day) {
        const billingDates = calculateBillingDates(
          wc.billing_formula,
          wc.statement_close_day,
          wc.payment_due_day
        );
        dueDate = billingDates.nextDueDate;
      }

      // Get statement balance (prefer Plaid, fallback to estimate, then current balance)
      // Note: estimate.statementBalanceCents is in cents, need to convert to dollars
      const estimatedDollars = estimate?.statementBalanceCents ? estimate.statementBalanceCents / 100 : null;
      const statementBalance = linked?.last_statement_balance ?? estimatedDollars ?? linked?.current_balance ?? null;
      
      // Calculate unbilled balance (current spending not yet on a statement)
      let unbilledBalance: number | null = null;
      if (linked?.current_balance !== null && linked?.current_balance !== undefined && linked?.current_balance > 0) {
        const stmtBal = linked?.last_statement_balance ?? 0;
        unbilledBalance = linked.current_balance - (stmtBal > 0 ? stmtBal : 0);
        if (unbilledBalance <= 0) unbilledBalance = null;
      }

      // Check if statement has already been paid (same logic as payments/page.tsx)
      // Option 1: Plaid says is_overdue=false AND a payment was made after statement date
      // Option 2: Payment amount covers the full statement balance
      const hasPlaidLiabilitiesData = linked?.last_statement_balance !== null && linked?.last_statement_balance !== undefined;
      let statementAlreadyPaid = false;
      if (hasPlaidLiabilitiesData && linked?.last_payment_date && linked?.last_statement_issue_date) {
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
      
      // Skip if statement is already paid or balance is 0
      if (hasPlaidLiabilitiesData && (statementBalance === 0 || statementBalance === null || statementAlreadyPaid)) {
        // Even if statement is paid, include card if there's unbilled balance and we want those
        if (!unbilledBalance) {
          return; // Skip this card - no payment due and no unbilled balance
        }
      }

      const accountId = settings.pay_from_account_id;
      if (!map.has(accountId)) {
        map.set(accountId, []);
      }
      
      // Cap statement balance at $0 (negative balances = credits, not payments)
      const cappedStatementBalance = statementBalance !== null ? Math.max(0, statementBalance) : null;
      // Also set to null if statement already paid
      const effectiveStatementBalance = statementAlreadyPaid ? null : cappedStatementBalance;
      
      map.get(accountId)!.push({
        walletId: wc.id,
        cardName: wc.custom_name ?? wc.card_name,
        issuerName: wc.issuer_name,
        isAutopay: settings.is_autopay,
        statementBalance: effectiveStatementBalance,
        unbilledBalance,
        dueDate,
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
  }, [paymentSettingsMap, walletCards, linkedAccountsMap, statementEstimatesMap]);

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

  const getDisplayName = (account: BankAccount) => {
    return account.display_name || account.official_name || account.name;
  };

  const getAccountTypeLabel = (subtype: string | null) => {
    if (!subtype) return "Account";
    return subtype.charAt(0).toUpperCase() + subtype.slice(1);
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
          {accountLinkingEnabled && (
            <PlaidBankLinkButton onSuccess={handleLinkSuccess} />
          )}
          </div>
        </div>
      </div>

      {/* Manual Account Form */}
      {showAddForm && (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4">
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
            const isExpanded = expandedAccounts.has(account.id);
            const hasCards = cards.length > 0;
            
            // Calculate totals (include unbilled if toggle is on)
            const totalPayments = cards.reduce((sum, c) => {
              const stmtBal = c.statementBalance ?? 0;
              const unbilled = includeUnbilled ? (c.unbilledBalance ?? 0) : 0;
              return sum + stmtBal + unbilled;
            }, 0);
            
            return (
              <div
                key={account.id}
                className={`bg-zinc-800/50 rounded-lg border ${
                  account.is_primary ? 'border-blue-500/50' : 'border-zinc-700'
                }`}
              >
                {/* Account Header Row - Always visible */}
                <div 
                  className={`flex items-center justify-between p-3 ${hasCards ? 'cursor-pointer hover:bg-zinc-800/70' : ''}`}
                  onClick={() => hasCards && toggleExpanded(account.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Expand/Collapse Icon */}
                    {hasCards ? (
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
                            (account.available_balance ?? 0) < totalPayments ? 'text-amber-400' : 'text-emerald-400'
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
                    
                    {/* Upcoming column */}
                    <div className="w-44 text-left flex-shrink-0 text-sm">
                      {hasCards ? (
                        <span className="text-zinc-400">
                          Payments:{' '}
                          <span className={`font-semibold ${
                            totalPayments > (account.available_balance ?? 0) ? 'text-red-400' : 'text-zinc-300'
                          }`}>
                            {totalPayments > 0 ? '-' : ''}{formatCurrency(totalPayments)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </div>
                    
                    {/* Cards count column */}
                    <div className="w-20 text-center flex-shrink-0">
                      {hasCards ? (
                        <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {cards.length} card{cards.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
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

                {/* Expanded Cards List */}
                {isExpanded && hasCards && (
                  <div className="border-t border-zinc-700">
                    {/* Header row */}
                    <div className="flex items-center gap-4 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wide bg-zinc-800/30">
                      <div className="flex-1 pl-8">Card</div>
                      <div className="w-20 text-right">Payment</div>
                      {includeUnbilled && <div className="w-20 text-right">Unbilled</div>}
                      <div className="w-16 text-center">Due</div>
                      <div className="w-16 text-center">Autopay</div>
                      <div className="w-28 text-right">Est. Balance</div>
                    </div>
                    {/* Card rows */}
                    {cards.map((card, idx) => {
                      const paymentsUpToNow = cards.slice(0, idx + 1).reduce((sum, c) => {
                        const stmtBal = c.statementBalance ?? 0;
                        const unbilled = includeUnbilled ? (c.unbilledBalance ?? 0) : 0;
                        return sum + stmtBal + unbilled;
                      }, 0);
                      const estBalance = (account.available_balance ?? 0) - paymentsUpToNow;
                      const isOverdraft = estBalance < 0;
                      const cardPayment = card.statementBalance ?? 0;
                      const cardUnbilled = card.unbilledBalance ?? 0;
                      
                      return (
                        <div 
                          key={card.walletId} 
                          className={`flex items-center gap-4 px-4 py-2 text-sm border-t border-zinc-700/50 ${
                            isOverdraft ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <div className="flex-1 pl-8 truncate">
                            <span className="text-white">{card.cardName}</span>
                            <span className="text-zinc-500 ml-2">{card.issuerName}</span>
                          </div>
                          <div className="w-20 text-right text-zinc-300">
                            {cardPayment > 0 ? `-${formatCurrency(cardPayment)}` : '—'}
                          </div>
                          {includeUnbilled && (
                            <div className="w-20 text-right text-blue-400">
                              {cardUnbilled > 0 ? `-${formatCurrency(cardUnbilled)}` : '—'}
                            </div>
                          )}
                          <div className="w-16 text-center text-zinc-400">
                            {formatDate(card.dueDate)}
                          </div>
                          <div className="w-16 text-center" title={card.isAutopay ? "Auto-pay enabled" : undefined}>
                            {card.isAutopay ? (
                              <Repeat className="h-4 w-4 text-emerald-400 mx-auto" />
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </div>
                          <div className={`w-28 text-right font-medium ${isOverdraft ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(estBalance)}
                          </div>
                        </div>
                      );
                    })}
                    {/* Total row */}
                    <div className="flex items-center gap-4 px-4 py-2 text-sm border-t border-zinc-600 bg-zinc-800/50">
                      <div className="flex-1 pl-8 text-zinc-400 font-medium">Total</div>
                      <div className="w-20 text-right font-semibold text-white">
                        {totalPayments > 0 ? '-' : ''}{formatCurrency(totalPayments)}
                      </div>
                      {includeUnbilled && <div className="w-20" />}
                      <div className="w-16" />
                      <div className="w-16" />
                      <div className={`w-28 text-right font-semibold ${
                        totalPayments > (account.available_balance ?? 0) ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {formatCurrency((account.available_balance ?? 0) - totalPayments)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
