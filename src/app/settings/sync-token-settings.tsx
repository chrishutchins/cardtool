"use client";

import { useState, useTransition } from "react";

interface SyncTokenSettingsProps {
  hasToken: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
  onGenerateToken: () => Promise<{ token?: string; error?: string }>;
  onRevokeToken: () => Promise<{ success?: boolean; error?: string }>;
}

export function SyncTokenSettings({
  hasToken: initialHasToken,
  createdAt,
  lastUsedAt,
  onGenerateToken,
  onRevokeToken,
}: SyncTokenSettingsProps) {
  const [hasToken, setHasToken] = useState(initialHasToken);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await onGenerateToken();
      if (result.error) {
        setError(result.error);
      } else if (result.token) {
        setNewToken(result.token);
        setHasToken(true);
      }
    });
  };

  const handleRevoke = () => {
    setError(null);
    startTransition(async () => {
      const result = await onRevokeToken();
      if (result.error) {
        setError(result.error);
      } else {
        setHasToken(false);
        setNewToken(null);
      }
    });
  };

  const handleCopy = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-2">
        Points Sync Token
      </h2>
      <p className="text-sm text-zinc-400 mb-4">
        Use this token to sync your loyalty program balances from the{" "}
        <a
          href="https://cardtool.app/scripts/cardtool-importer.user.js"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          CardTool Tampermonkey script
        </a>
        .
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      {newToken ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800">
            <p className="text-sm text-emerald-400 mb-2 font-medium">
              ⚠️ Copy this token now - it won&apos;t be shown again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded bg-zinc-950 text-emerald-300 text-sm font-mono break-all">
                {newToken}
              </code>
              <button
                onClick={handleCopy}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="text-sm text-zinc-400 hover:text-zinc-300"
          >
            Done - I&apos;ve saved my token
          </button>
        </div>
      ) : hasToken ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">Token active</span>
          </div>
          <div className="text-sm text-zinc-500 space-y-1">
            <p>Created: {formatDate(createdAt)}</p>
            <p>Last used: {formatDate(lastUsedAt)}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isPending ? "Generating..." : "Regenerate Token"}
            </button>
            <button
              onClick={handleRevoke}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-950/50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isPending ? "Revoking..." : "Revoke Token"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Generating..." : "Generate Sync Token"}
        </button>
      )}
    </div>
  );
}
