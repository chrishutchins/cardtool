"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess: () => void;
}

// Inner component that only mounts when we have a token
function PlaidLinkHandler({
  linkToken,
  onPlaidSuccess,
  onExit,
}: {
  linkToken: string;
  onPlaidSuccess: (publicToken: string, metadata: unknown) => void;
  onExit: () => void;
}) {
  const hasOpened = useRef(false);
  
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit,
  });

  // Open Plaid Link when ready (only once)
  useEffect(() => {
    if (ready && !hasOpened.current) {
      hasOpened.current = true;
      open();
    }
  }, [ready, open]);

  return null; // This component just handles the Plaid logic
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);

  const fetchLinkToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await response.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
      }
    } catch (error) {
      console.error("Error fetching link token:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: unknown) => {
      setIsExchanging(true);
      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken, metadata }),
        });
        const data = await response.json();
        if (data.success) {
          onSuccess();
        }
      } catch (error) {
        console.error("Error exchanging token:", error);
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

  const handleClick = async () => {
    if (!linkToken && !isLoading) {
      await fetchLinkToken();
    }
  };

  return (
    <>
      {/* Only render PlaidLinkHandler when we have a token */}
      {linkToken && (
        <PlaidLinkHandler
          linkToken={linkToken}
          onPlaidSuccess={onPlaidSuccess}
          onExit={handleExit}
        />
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
    </>
  );
}
