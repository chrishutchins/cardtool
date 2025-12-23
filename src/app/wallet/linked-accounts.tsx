"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CreditCard, Building2, Link2, Unlink } from "lucide-react";
import { PlaidLinkButton } from "./plaid-link-button";

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
  iso_currency_code: string | null;
  last_balance_update: string | null;
  user_plaid_items: { institution_name: string | null } | null;
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
}

export function LinkedAccounts({ initialAccounts, walletCards = [], onPairCard, onUnlinkCard }: LinkedAccountsProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

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
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-700 p-2 rounded-lg">
                    <CreditCard className="h-5 w-5 text-zinc-300" />
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
                        {walletCards.map((card, index) => (
                          <option key={`${card.id}-${index}`} value={card.id}>
                            {card.issuer_name ? `${card.issuer_name} ` : ""}{card.name}
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
                  <p className="text-xs text-zinc-500 uppercase">Credit Limit</p>
                  <p className="text-lg font-semibold text-zinc-300">
                    {formatCurrency(account.credit_limit, account.iso_currency_code)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Available Credit</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {account.credit_limit != null && account.current_balance != null
                      ? formatCurrency(
                          account.credit_limit - account.current_balance,
                          account.iso_currency_code
                        )
                      : formatCurrency(account.available_balance, account.iso_currency_code)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 mt-3">
                Last updated: {formatDate(account.last_balance_update)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
