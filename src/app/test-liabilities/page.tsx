"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";

interface AccountPreview {
  name: string;
  mask: string | null;
  balance: number | null;
  limit: number | null;
  type: "personal" | "business";
}

interface ItemStatus {
  id: string;
  institution: string;
  hasLiabilitiesAvailable?: boolean;
  hasLiabilitiesConsent?: boolean;
  accounts?: AccountPreview[];
  error?: string;
}

interface LiabilityData {
  lastStatementBalance: number | null;
  lastStatementIssueDate: string | null;
  nextPaymentDueDate: string | null;
  minimumPaymentAmount: number | null;
  isOverdue: boolean | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  aprs: Array<{
    apr_percentage: number;
    apr_type: string;
    balance_subject_to_apr: number | null;
    interest_charge_amount: number | null;
  }> | null;
}

interface AccountData {
  accountId: string;
  name: string;
  mask: string | null;
  type: "personal" | "business";
  balances: {
    current: number | null;
    available: number | null;
    limit: number | null;
  };
  liabilities: LiabilityData | null;
}

interface LiabilitiesResult {
  institution: string;
  hasConsent: boolean;
  accounts?: AccountData[];
  message?: string;
}

function PlaidLinkHandler({
  linkToken,
  onSuccess,
  onExit,
}: {
  linkToken: string;
  onSuccess: () => void;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: () => {
      onSuccess();
    },
    onExit: () => {
      onExit();
    },
  });

  useEffect(() => {
    if (ready) {
      open();
    }
  }, [ready, open]);

  return null;
}

export default function TestLiabilitiesPage() {
  const [items, setItems] = useState<ItemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [liabilitiesData, setLiabilitiesData] = useState<LiabilitiesResult | null>(null);
  const [loadingLiabilities, setLoadingLiabilities] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Fetch items on load
  useEffect(() => {
    fetch("/api/plaid/test-liabilities")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Grant consent for an item
  const grantConsent = async (itemId: string) => {
    setSelectedItem(itemId);
    const res = await fetch("/api/plaid/test-liabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    if (data.linkToken) {
      setLinkToken(data.linkToken);
    }
  };

  // Fetch liabilities data for an item
  const fetchLiabilities = async (itemId: string) => {
    setLoadingLiabilities(true);
    setLiabilitiesData(null);
    const res = await fetch(`/api/plaid/test-liabilities?itemId=${itemId}`);
    const data = await res.json();
    setLiabilitiesData(data);
    setLoadingLiabilities(false);
  };

  const handlePlaidSuccess = useCallback(() => {
    setLinkToken(null);
    // Refresh items list
    fetch("/api/plaid/test-liabilities")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        // Auto-fetch liabilities for the item we just updated
        if (selectedItem) {
          fetchLiabilities(selectedItem);
        }
      });
  }, [selectedItem]);

  const handlePlaidExit = useCallback(() => {
    setLinkToken(null);
    setSelectedItem(null);
  }, []);

  // Group items by institution
  const itemsByInstitution = items.reduce((acc, item) => {
    const inst = item.institution || "Unknown";
    if (!acc[inst]) acc[inst] = [];
    acc[inst].push(item);
    return acc;
  }, {} as Record<string, ItemStatus[]>);

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Plaid Liabilities API Test
        </h1>
        <p className="text-zinc-400 mb-8">
          Test the Liabilities endpoint to see statement data for each issuer
        </p>

        {linkToken && (
          <PlaidLinkHandler
            linkToken={linkToken}
            onSuccess={handlePlaidSuccess}
            onExit={handlePlaidExit}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side: Items list */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Linked Institutions
            </h2>

            {loading ? (
              <p className="text-zinc-500">Loading...</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(itemsByInstitution).map(([institution, instItems]) => (
                  <div
                    key={institution}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                  >
                    <h3 className="text-lg font-medium text-white mb-3">
                      {institution}
                    </h3>
                    <div className="space-y-2">
                      {instItems.map((item) => {
                        const isExpanded = expandedItems.has(item.id);
                        const accountCount = item.accounts?.length || 0;
                        
                        return (
                          <div
                            key={item.id}
                            className="bg-zinc-800/50 rounded overflow-hidden"
                          >
                            {/* Header row */}
                            <div className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-2 flex-1">
                                {item.hasLiabilitiesConsent ? (
                                  <span className="text-emerald-400">✓</span>
                                ) : item.hasLiabilitiesAvailable ? (
                                  <span className="text-amber-400">○</span>
                                ) : (
                                  <span className="text-red-400">✗</span>
                                )}
                                <button
                                  onClick={() => toggleItemExpanded(item.id)}
                                  className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
                                >
                                  <svg
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span>
                                    {accountCount} card{accountCount !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-zinc-500">
                                    ({item.hasLiabilitiesConsent
                                      ? "consent granted"
                                      : item.hasLiabilitiesAvailable
                                      ? "needs consent"
                                      : item.error || "not available"})
                                  </span>
                                </button>
                              </div>
                              <div className="flex gap-2">
                                {item.hasLiabilitiesConsent ? (
                                  <button
                                    onClick={() => fetchLiabilities(item.id)}
                                    className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    View Data
                                  </button>
                            ) : item.hasLiabilitiesAvailable ? (
                              <button
                                onClick={() => grantConsent(item.id)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Grant Consent
                              </button>
                            ) : null}
                              </div>
                            </div>
                            
                            {/* Expandable accounts list */}
                            {isExpanded && item.accounts && item.accounts.length > 0 && (
                              <div className="border-t border-zinc-700 px-3 py-2 bg-zinc-900/50">
                                <div className="space-y-1">
                                  {item.accounts.map((account, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm py-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-xs px-1.5 py-0.5 rounded ${
                                            account.type === "business"
                                              ? "bg-purple-500/20 text-purple-400"
                                              : "bg-blue-500/20 text-blue-400"
                                          }`}
                                        >
                                          {account.type === "business" ? "Biz" : "Per"}
                                        </span>
                                        <span className="text-zinc-300">{account.name}</span>
                                        {account.mask && (
                                          <span className="text-zinc-500">****{account.mask}</span>
                                        )}
                                      </div>
                                      <div className="text-zinc-400">
                                        ${account.balance?.toLocaleString() ?? 'N/A'}
                                        {account.limit && (
                                          <span className="text-zinc-600"> / ${account.limit.toLocaleString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side: Liabilities data */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Liabilities Data
            </h2>

            {loadingLiabilities ? (
              <p className="text-zinc-500">Loading liabilities...</p>
            ) : liabilitiesData ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">
                  {liabilitiesData.institution}
                </h3>

                {!liabilitiesData.hasConsent ? (
                  <p className="text-amber-400">{liabilitiesData.message}</p>
                ) : liabilitiesData.accounts?.length === 0 ? (
                  <p className="text-zinc-500">No credit accounts found</p>
                ) : (
                  <div className="space-y-6">
                    {liabilitiesData.accounts?.map((account) => (
                      <div
                        key={account.accountId}
                        className="bg-zinc-800/50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              account.type === "business"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {account.type === "business" ? "Business" : "Personal"}
                          </span>
                          <span className="font-medium text-white">
                            {account.name}
                          </span>
                          {account.mask && (
                            <span className="text-zinc-500">
                              ****{account.mask}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-500">Current Balance</p>
                            <p className="text-white font-medium">
                              {account.balances.current !== null
                                ? `$${account.balances.current.toLocaleString()}`
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Credit Limit</p>
                            <p className="text-white font-medium">
                              {account.balances.limit !== null
                                ? `$${account.balances.limit.toLocaleString()}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>

                        {account.liabilities ? (
                          <div className="mt-4 pt-4 border-t border-zinc-700">
                            <p className="text-xs text-emerald-400 mb-3">
                              ✓ Liabilities Data Available
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-zinc-500">Statement Balance</p>
                                <p className="text-white font-medium">
                                  {account.liabilities.lastStatementBalance !== null
                                    ? `$${account.liabilities.lastStatementBalance.toLocaleString()}`
                                    : "❌ N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500">Statement Date</p>
                                <p className="text-white font-medium">
                                  {account.liabilities.lastStatementIssueDate || "❌ N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500">Payment Due Date</p>
                                <p className="text-white font-medium">
                                  {account.liabilities.nextPaymentDueDate || "❌ N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500">Minimum Payment</p>
                                <p className="text-white font-medium">
                                  {account.liabilities.minimumPaymentAmount !== null
                                    ? `$${account.liabilities.minimumPaymentAmount.toLocaleString()}`
                                    : "❌ N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500">Is Overdue</p>
                                <p className="text-white font-medium">
                                  {account.liabilities.isOverdue !== null
                                    ? account.liabilities.isOverdue
                                      ? "⚠️ Yes"
                                      : "No"
                                    : "❌ N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500">Last Payment</p>
                                <p className="text-white font-medium">
                                  {account.liabilities.lastPaymentAmount !== null
                                    ? `$${account.liabilities.lastPaymentAmount.toLocaleString()} on ${account.liabilities.lastPaymentDate}`
                                    : "❌ N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t border-zinc-700">
                            <p className="text-xs text-red-400">
                              ❌ No liabilities data returned for this account
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                <p className="text-zinc-500">
                  Select an institution and click "View Data" or "Grant Consent"
                  to see liabilities data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <h3 className="text-sm font-medium text-white mb-2">Legend</h3>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-zinc-400">Consent granted - can view data</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400">○</span>
              <span className="text-zinc-400">Available - needs consent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">✗</span>
              <span className="text-zinc-400">Not available / Error</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
