"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CreditCard, Building2, Link2, Unlink, Pencil, Check, X, AlertTriangle } from "lucide-react";
import { PlaidLinkButton } from "./plaid-link-button";
import { PlaidReauthButton } from "./plaid-reauth-button";

interface LinkedAccount {
  id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  credit_limit: number | null;
  manual_credit_limit: number | null;
  iso_currency_code: string | null;
  last_balance_update: string | null;
  plaid_item_id: string;
  user_plaid_items: { 
    id: string;
    institution_name: string | null;
    requires_reauth: boolean;
    error_code: string | null;
  } | null;
  wallet_card_id: string | null;
}

interface WalletCard {
  id: string;
  name: string;
  issuer_name: string | null;
}

interface LinkedAccountsProps {
  initialAccounts: LinkedAccount[];
  walletCards?: WalletCard[];
  onPairCard?: (linkedAccountId: string, walletCardId: string | null) => Promise<void>;
  onUnlinkCard?: (linkedAccountId: string) => Promise<void>;
  onUpdateCreditLimit?: (linkedAccountId: string, creditLimit: number | null) => Promise<void>;
}

export function LinkedAccounts({ initialAccounts, walletCards = [], onPairCard, onUnlinkCard, onUpdateCreditLimit }: LinkedAccountsProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<string>("");

  const handlePairCard = (linkedAccountId: string, walletCardId: string) => {
    if (!onPairCard) return;
    
    // Optimistic update
    setAccounts(prev => prev.map(acc => 
      acc.id === linkedAccountId 
        ? { ...acc, wallet_card_id: walletCardId || null }
        : acc
    ));
    
    startTransition(() => {
      onPairCard(linkedAccountId, walletCardId || null);
    });
  };

  const handleUnlinkCard = async (linkedAccountId: string) => {
    if (!onUnlinkCard) return;
    if (!confirm("Are you sure you want to unlink this card? This will remove the connection to your bank.")) {
      return;
    }
    
    setUnlinkingId(linkedAccountId);
    
    // Optimistic update
    setAccounts(prev => prev.filter(acc => acc.id !== linkedAccountId));
    
    startTransition(async () => {
      await onUnlinkCard(linkedAccountId);
      setUnlinkingId(null);
    });
  };

  const startEditingLimit = (account: LinkedAccount) => {
    setEditingLimitId(account.id);
    // Pre-fill with existing manual limit, or Plaid limit, or empty
    const existingLimit = account.manual_credit_limit ?? account.credit_limit;
    setEditLimitValue(existingLimit != null ? existingLimit.toString() : "");
  };

  const cancelEditingLimit = () => {
    setEditingLimitId(null);
    setEditLimitValue("");
  };

  const saveEditingLimit = (linkedAccountId: string) => {
    if (!onUpdateCreditLimit) return;
    
    const numValue = editLimitValue ? parseFloat(editLimitValue.replace(/,/g, "")) : null;
    
    // Optimistic update
    setAccounts(prev => prev.map(acc => 
      acc.id === linkedAccountId 
        ? { ...acc, manual_credit_limit: numValue }
        : acc
    ));
    
    setEditingLimitId(null);
    setEditLimitValue("");
    
    startTransition(() => {
      onUpdateCreditLimit(linkedAccountId, numValue);
    });
  };

  // Get effective credit limit (manual override takes precedence)
  // Returns null if no valid limit exists (treats 0 as no limit - common for charge cards)
  const getEffectiveCreditLimit = (account: LinkedAccount): number | null => {
    if (account.manual_credit_limit != null && account.manual_credit_limit > 0) {
      return account.manual_credit_limit;
    }
    if (account.credit_limit != null && account.credit_limit > 0) {
      return account.credit_limit;
    }
    return null;
  };

  const refreshAccounts = async () => {
    setIsRefreshing(true);
    try {
      // First refresh balances from Plaid
      await fetch("/api/plaid/refresh-balances", { method: "POST" });
      
      // Then fetch updated accounts from our database
      const response = await fetch("/api/plaid/accounts");
      const data = await response.json();
      if (data.accounts) {
        setAccounts(data.accounts.map((account: LinkedAccount) => ({
          ...account,
          current_balance: account.current_balance != null ? Number(account.current_balance) : null,
          available_balance: account.available_balance != null ? Number(account.available_balance) : null,
          credit_limit: account.credit_limit != null ? Number(account.credit_limit) : null,
        })));
      }
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

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount == null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Linked Credit Cards</h2>
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
              {isRefreshing ? "Refreshing..." : "Refresh Balances"}
            </Button>
          )}
          <PlaidLinkButton onSuccess={handleLinkSuccess} />
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No credit cards linked yet.</p>
          <p className="text-zinc-500 text-sm mt-1">
            Link your bank account to see your credit card balances.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const needsReauth = account.user_plaid_items?.requires_reauth ?? false;
            
            return (
            <div
              key={account.id}
              className={`bg-zinc-800/50 rounded-lg p-4 border ${needsReauth ? 'border-amber-500/50' : 'border-zinc-700'}`}
            >
              {/* Reauth Warning Banner */}
              {needsReauth && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-200 font-medium">Reconnection Required</p>
                        <p className="text-amber-300/80 text-sm">
                          Your bank connection needs to be refreshed. Click Reconnect to update your credentials.
                        </p>
                      </div>
                    </div>
                    <PlaidReauthButton
                      plaidItemId={account.user_plaid_items?.id || account.plaid_item_id}
                      institutionName={account.user_plaid_items?.institution_name ?? null}
                      onSuccess={() => window.location.reload()}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${needsReauth ? 'bg-amber-700/50' : 'bg-zinc-700'}`}>
                    <CreditCard className={`h-5 w-5 ${needsReauth ? 'text-amber-300' : 'text-zinc-300'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {account.official_name || account.name}
                      {account.mask && (
                        <span className="text-zinc-500 ml-2">••••{account.mask}</span>
                      )}
                    </h3>
                    {account.user_plaid_items?.institution_name && (
                      <div className="flex items-center gap-1 text-sm text-zinc-400">
                        <Building2 className="h-3 w-3" />
                        {account.user_plaid_items.institution_name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Wallet Card Pairing Dropdown */}
                  {walletCards.length > 0 && onPairCard && (
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-zinc-500" />
                      <select
                        value={account.wallet_card_id || ""}
                        onChange={(e) => handlePairCard(account.id, e.target.value)}
                        disabled={isPending || unlinkingId === account.id}
                        className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                      >
                        <option value="">Not paired</option>
                        {walletCards
                          .filter(card => {
                            // Include this card if:
                            // 1. It's the currently paired card for this account, OR
                            // 2. It's not paired to any other account
                            if (card.id === account.wallet_card_id) return true;
                            const pairedToOther = accounts.some(
                              acc => acc.id !== account.id && acc.wallet_card_id === card.id
                            );
                            return !pairedToOther;
                          })
                          .map((card, index) => (
                          <option key={`${card.id}-${index}`} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Unlink Button */}
                  {onUnlinkCard && (
                    <button
                      onClick={() => handleUnlinkCard(account.id)}
                      disabled={isPending || unlinkingId === account.id}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Unlink this card"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Current Balance</p>
                  <p className="text-lg font-semibold text-red-400">
                    {formatCurrency(account.current_balance, account.iso_currency_code)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                    Credit Limit
                    {account.manual_credit_limit != null && account.manual_credit_limit > 0 && (
                      <span className="text-amber-500 text-[10px]">(manual)</span>
                    )}
                  </p>
                  {editingLimitId === account.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">$</span>
                      <input
                        type="text"
                        value={editLimitValue}
                        onChange={(e) => setEditLimitValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditingLimit(account.id);
                          if (e.key === "Escape") cancelEditingLimit();
                        }}
                        className="w-24 bg-zinc-700 border border-zinc-600 text-zinc-200 text-lg font-semibold rounded px-2 py-0.5 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="0"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEditingLimit(account.id)}
                        className="p-1 text-emerald-400 hover:bg-zinc-700 rounded"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditingLimit}
                        className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {getEffectiveCreditLimit(account) != null ? (
                        <p className="text-lg font-semibold text-zinc-300">
                          {formatCurrency(getEffectiveCreditLimit(account), account.iso_currency_code)}
                        </p>
                      ) : (
                        <p className="text-lg font-semibold text-zinc-500">—</p>
                      )}
                      {onUpdateCreditLimit && (
                        <button
                          onClick={() => startEditingLimit(account)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded"
                          title={getEffectiveCreditLimit(account) != null ? "Edit credit limit" : "Set credit limit"}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Available Credit</p>
                  {(() => {
                    const effectiveLimit = getEffectiveCreditLimit(account);
                    if (effectiveLimit != null && account.current_balance != null) {
                      const available = effectiveLimit - account.current_balance;
                      const isNegative = available < 0;
                      return (
                        <p className={`text-lg font-semibold ${isNegative ? "text-red-400" : "text-emerald-400"}`}>
                          {formatCurrency(available, account.iso_currency_code)}
                        </p>
                      );
                    }
                    // No credit limit set - show dash
                    return <p className="text-lg font-semibold text-zinc-500">—</p>;
                  })()}
                </div>
              </div>

              <p className="text-xs text-zinc-600 mt-3">
                Last updated: {formatDate(account.last_balance_update)}
              </p>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
