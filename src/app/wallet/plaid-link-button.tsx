"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, AlertCircle } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess: () => void;
}

// Inner component that only mounts when we have a token
function PlaidLinkHandler({
  linkToken,
  onPlaidSuccess,
  onExit,
  onError,
}: {
  linkToken: string;
  onPlaidSuccess: (publicToken: string, metadata: unknown) => void;
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
    }, 10000); // 10 second timeout
    
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

  return null; // This component just handles the Plaid logic
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Failed to create link token:", data);
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
      console.error("Error fetching link token:", err);
      setError("Network error - please try again");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: unknown) => {
      setIsExchanging(true);
      setError(null);
      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken, metadata }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          console.error("Failed to exchange token:", data);
          setError(data.error || "Failed to link account");
          return;
        }
        
        if (data.success) {
          // Trigger a background sync to fetch transactions for newly linked accounts
          // Don't await - let it run in background while user continues
          fetch("/api/plaid/sync-credits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ forceRefresh: true }),
          }).catch(err => console.error("Background sync failed:", err));
          
          onSuccess();
        } else {
          setError(data.error || "Failed to link account");
        }
      } catch (err) {
        console.error("Error exchanging token:", err);
        setError("Network error - please try again");
      } finally {
        setIsExchanging(false);
        setLinkToken(null);
      }
    },
    [onSuccess]
  );

  const handleExit = useCallback(() => {
    setLinkToken(null);
  }, []);

  const handlePlaidError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setLinkToken(null);
  }, []);

  const handleClick = async () => {
    if (!linkToken && !isLoading) {
      await fetchLinkToken();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Only render PlaidLinkHandler when we have a token */}
      {linkToken && (
        <PlaidLinkHandler
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
        disabled={isLoading || isExchanging}
        variant="outline"
        className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
      >
        {isLoading || isExchanging ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isExchanging ? "Linking..." : "Loading..."}
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4 mr-2" />
            Link Cards
          </>
        )}
      </Button>
    </div>
  );
}
