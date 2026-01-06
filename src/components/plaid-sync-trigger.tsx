"use client";

import { useEffect, useRef } from "react";

const SYNC_DEBOUNCE_KEY = "cardtool_last_plaid_sync";
const SYNC_DEBOUNCE_HOURS = 24;

/**
 * Component that triggers a Plaid credit sync when mounted.
 * Debounced to once per day using localStorage.
 * Silent - doesn't show any UI.
 */
export function PlaidSyncTrigger() {
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only run once per component mount
    if (hasSynced.current) return;
    hasSynced.current = true;

    // Check localStorage for last sync time
    const lastSync = localStorage.getItem(SYNC_DEBOUNCE_KEY);
    if (lastSync) {
      const lastSyncTime = new Date(lastSync).getTime();
      const hoursSinceSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
      
      if (hoursSinceSync < SYNC_DEBOUNCE_HOURS) {
        // Already synced within the debounce period
        return;
      }
    }

    // Trigger sync in background
    const triggerSync = async () => {
      try {
        // Update localStorage immediately to prevent duplicate syncs
        localStorage.setItem(SYNC_DEBOUNCE_KEY, new Date().toISOString());

        const response = await fetch("/api/plaid/sync-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRefresh: false }),
        });

        if (!response.ok) {
          // If sync failed, remove the localStorage entry so it can retry later
          localStorage.removeItem(SYNC_DEBOUNCE_KEY);
        }
      } catch (error) {
        // If sync failed, remove the localStorage entry
        localStorage.removeItem(SYNC_DEBOUNCE_KEY);
        console.error("Background plaid sync failed:", error);
      }
    };

    // Run sync in background after a short delay to not block initial render
    const timeoutId = setTimeout(triggerSync, 2000);

    return () => clearTimeout(timeoutId);
  }, []);

  // This component renders nothing
  return null;
}

