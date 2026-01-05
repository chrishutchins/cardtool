"use client";

import { useTransition } from "react";

interface UserStats {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  cardsAdded: number;
  spendingEdits: number;
  createdAt: string | null;
  accountLinkingEnabled: boolean;
}

export function UserRow({
  user,
  onDelete,
  onToggleAccountLinking,
  onEmulate,
}: {
  user: UserStats;
  onDelete: (userId: string) => Promise<void>;
  onToggleAccountLinking: (userId: string, enabled: boolean) => Promise<void>;
  onEmulate: (userId: string, email: string | null) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isEmulating, startEmulateTransition] = useTransition();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete all data for ${user.email || user.userId}? This cannot be undone.`)) {
      return;
    }
    startTransition(() => {
      onDelete(user.userId);
    });
  };

  const handleToggleAccountLinking = () => {
    startTransition(() => {
      onToggleAccountLinking(user.userId, !user.accountLinkingEnabled);
    });
  };

  const handleEmulate = () => {
    startEmulateTransition(() => {
      onEmulate(user.userId, user.email);
    });
  };

  return (
    <tr className={`hover:bg-zinc-800/30 ${isPending ? "opacity-50" : ""}`}>
      <td className="px-6 py-4">
        <div>
          {user.email ? (
            <div className="text-white font-medium">{user.email}</div>
          ) : (
            <div className="text-zinc-500 italic">No email found</div>
          )}
          {(user.firstName || user.lastName) && (
            <div className="text-sm text-zinc-400">
              {[user.firstName, user.lastName].filter(Boolean).join(" ")}
            </div>
          )}
          <div className="text-xs text-zinc-600 font-mono">{user.userId}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`font-mono ${user.cardsAdded > 0 ? "text-white" : "text-zinc-600"}`}>
          {user.cardsAdded}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`font-mono ${user.spendingEdits > 0 ? "text-white" : "text-zinc-600"}`}>
          {user.spendingEdits}
        </span>
      </td>
      <td className="px-6 py-4 text-zinc-400 text-sm">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={handleToggleAccountLinking}
          disabled={isPending}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
            user.accountLinkingEnabled
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
          }`}
        >
          {user.accountLinkingEnabled ? "Enabled" : "Disabled"}
        </button>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleEmulate}
            disabled={isEmulating || isPending}
            className="text-amber-400 hover:text-amber-300 text-sm disabled:opacity-50"
          >
            {isEmulating ? "Loading..." : "Emulate"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || isEmulating}
            className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}

