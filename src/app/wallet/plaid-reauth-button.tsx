"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, AlertCircle } from "lucide-react";

interface PlaidReauthButtonProps {
  plaidItemId: string;
  institutionName: string | null;
  onSuccess: () => void;
}

// Inner component that only mounts when we have a token
function PlaidReauthHandler({
  linkToken,
  onPlaidSuccess,
  onExit,
  onError,
}: {
  linkToken: string;
  onPlaidSuccess: () => void;
  onExit: () => void;
  onError: (error: string) => void;
}) {
  const hasOpened = useRef(false);
  const [initTimeout, setInitTimeout] = useState(false);
  
  const { open, ready, error } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit,
  });

  // Set a timeout to detect if Plaid never becomes ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready && !error) {
        console.error("Plaid Link initialization timeout - never became ready");
        setInitTimeout(true);
        onError("Plaid Link failed to load - please check your popup blocker or try again");
      }
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [ready, error, onError]);

  // Report any Plaid Link errors
  useEffect(() => {
    if (error) {
      console.error("Plaid Link error:", error);
      onError(error.message || "Failed to initialize Plaid Link");
    }
  }, [error, onError]);

  // Open Plaid Link when ready (only once)
  useEffect(() => {
    if (ready && !hasOpened.current && !initTimeout) {
      hasOpened.current = true;
      open();
    }
  }, [ready, open, initTimeout]);

  return null;
}

export function PlaidReauthButton({ plaidItemId, institutionName, onSuccess }: PlaidReauthButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdateLinkToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/create-update-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaidItemId }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Failed to create update link token:", data);
        setError(data.error || "Failed to connect to Plaid");
        return;
      }
      
      if (data.link_token) {
        setLinkToken(data.link_token);
      } else {
        console.error("No link_token in response:", data);
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Error fetching update link token:", err);
      setError("Network error - please try again");
    } finally {
      setIsLoading(false);
    }
  }, [plaidItemId]);

  const onPlaidSuccess = useCallback(async () => {
    setIsReconnecting(true);
    setError(null);
    try {
      // Clear the reauth flag after successful reconnection
      const response = await fetch("/api/plaid/clear-reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaidItemId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to clear reauth flag:", data);
        // Don't show error - reconnection was successful
      }
      
      onSuccess();
    } catch (err) {
      console.error("Error clearing reauth flag:", err);
      // Don't fail - the reconnection itself was successful
      onSuccess();
    } finally {
      setIsReconnecting(false);
      setLinkToken(null);
    }
  }, [plaidItemId, onSuccess]);

  const handleExit = useCallback(() => {
    setLinkToken(null);
  }, []);

  const handlePlaidError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setLinkToken(null);
  }, []);

  const handleClick = async () => {
    if (!linkToken && !isLoading) {
      await fetchUpdateLinkToken();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {linkToken && (
        <PlaidReauthHandler
          linkToken={linkToken}
          onPlaidSuccess={onPlaidSuccess}
          onExit={handleExit}
          onError={handlePlaidError}
        />
      )}
      {error && (
        <div className="flex items-center gap-1 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      <Button
        onClick={handleClick}
        disabled={isLoading || isReconnecting}
        variant="outline"
        size="sm"
        className="border-amber-600 text-amber-400 hover:bg-amber-600/10"
      >
        {isLoading || isReconnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isReconnecting ? "Reconnecting..." : "Loading..."}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reconnect {institutionName || "Bank"}
          </>
        )}
      </Button>
    </div>
  );
}
