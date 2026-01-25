"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface CloneResult {
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    tablesWiped: number;
    walletsCloned: number;
    linkedAccountsCloned: number;
    linkedAccountsWithWallet: number;
    transactionsCloned: number;
    creditUsagesCloned: number;
    creditUsageTransactionLinksCloned: number;
    pointBalancesCloned: number;
    pointBalancesExcluded: number;
    bankAccountsCloned: number;
    creditReportSnapshotsCloned: number;
    creditReportAccountsCloned: number;
    creditReportWalletLinksCloned: number;
    creditScoresCloned: number;
    creditInquiriesCloned: number;
    creditInquiryGroupsCloned: number;
  };
}

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CloneResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClone = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/demo/clone", {
        method: "POST",
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Demo Account</h1>
        <p className="text-zinc-400 mt-1">
          Clone your account to the demo account with privacy transformations
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Transformations Applied</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">•</span>
            <span><strong className="text-zinc-300">Player descriptions:</strong> Cleared (set to null)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">•</span>
            <span><strong className="text-zinc-300">Point balances:</strong> Brex and United PerksPlus removed; balances &gt;2M divided by 3, 1-2M divided by 2</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">•</span>
            <span><strong className="text-zinc-300">Account masks:</strong> Credit card and bank account last-4 digits hidden</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">•</span>
            <span><strong className="text-zinc-300">Bank balances:</strong> Hidden from Payments page</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">•</span>
            <span><strong className="text-zinc-300">Card names:</strong> Custom names cleared; duplicates get numbered suffix (e.g., &quot;Amex Gold 1000&quot;)</span>
          </li>
        </ul>
      </div>

      {/* Action Section */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Refresh Demo Account</h2>
            <p className="text-sm text-zinc-400 mt-1">
              This will wipe all existing demo account data and clone your current account
            </p>
          </div>
          
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh Demo
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                Confirm Wipe & Clone
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg border p-6 ${
            result.success
              ? "bg-emerald-950/30 border-emerald-800"
              : "bg-red-950/30 border-red-800"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                {result.success ? "Clone Successful" : "Clone Failed"}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {result.message || result.error}
              </p>
              
              {result.stats && (
                <div className="mt-4 space-y-4">
                  {/* Core Data */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.walletsCloned}</p>
                      <p className="text-xs text-zinc-500">Cards</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.linkedAccountsWithWallet}</p>
                      <p className="text-xs text-zinc-500">Linked Accounts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.bankAccountsCloned}</p>
                      <p className="text-xs text-zinc-500">Bank Accounts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.transactionsCloned.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">Transactions</p>
                    </div>
                  </div>
                  {/* Credits & Points */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.creditUsagesCloned}</p>
                      <p className="text-xs text-zinc-500">Credit Usages</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.creditUsageTransactionLinksCloned}</p>
                      <p className="text-xs text-zinc-500">Credit-Transaction Links</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.pointBalancesCloned}</p>
                      <p className="text-xs text-zinc-500">Point Balances</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.pointBalancesExcluded}</p>
                      <p className="text-xs text-zinc-500">Points Excluded</p>
                    </div>
                  </div>
                  {/* Credit Report */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.creditReportSnapshotsCloned}</p>
                      <p className="text-xs text-zinc-500">Report Snapshots</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.creditReportAccountsCloned}</p>
                      <p className="text-xs text-zinc-500">Credit Accounts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.creditScoresCloned}</p>
                      <p className="text-xs text-zinc-500">Credit Scores</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{result.stats.creditInquiriesCloned}</p>
                      <p className="text-xs text-zinc-500">Credit Inquiries</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Demo Account Info */}
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500">
          <strong>Demo User ID:</strong> user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          To view the demo account, use the Emulate feature on the Users page or sign in with the demo account credentials.
        </p>
      </div>
    </div>
  );
}
