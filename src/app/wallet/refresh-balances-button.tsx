"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface RefreshBalancesButtonProps {
  hasLinkedAccounts?: boolean;
}

export function RefreshBalancesButton({ hasLinkedAccounts }: RefreshBalancesButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Don't show if no linked accounts
  if (!hasLinkedAccounts) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/plaid/refresh-balances", { method: "POST" });
      if (response.ok) {
        // Refresh the page to show updated data
        router.refresh();
      }
    } catch (error) {
      console.error("Error refreshing balances:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Refresh account balances from Plaid"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Refresh Balances</span>
    </button>
  );
}


