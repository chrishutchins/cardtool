"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccessMetadata } from "react-plaid-link";

interface PlaidLiabilitiesButtonProps {
  plaidItemId: string;
  institutionName: string | null;
  onSuccess?: () => void;
}

export function PlaidLiabilitiesButton({ plaidItemId, institutionName, onSuccess }: PlaidLiabilitiesButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch link token when button is clicked
  const fetchLinkToken = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/plaid/grant-liabilities-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: plaidItemId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create link token");
      }

      setLinkToken(data.linkToken);
    } catch (err) {
      console.error("Error fetching liabilities link token:", err);
      setError(err instanceof Error ? err.message : "Failed to start consent flow");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful Plaid Link completion
  const handleSuccess = useCallback(async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
    try {
      // Record that consent was granted
      const response = await fetch("/api/plaid/grant-liabilities-consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: plaidItemId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to record consent");
      }

      // Clear link token and call success callback
      setLinkToken(null);
      onSuccess?.();
    } catch (err) {
      console.error("Error recording liabilities consent:", err);
      setError(err instanceof Error ? err.message : "Failed to complete consent flow");
    }
  }, [plaidItemId, onSuccess]);

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => {
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // Automatically open Plaid Link when we have a token
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={fetchLinkToken}
        disabled={isLoading}
        className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/30"
        title={`Grant statement access for ${institutionName || "this institution"}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Grant Statement Access
      </Button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
