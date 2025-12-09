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
}

export function UserRow({
  user,
  onDelete,
}: {
  user: UserStats;
  onDelete: (userId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

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
      <td className="px-6 py-4 text-right">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
        >
          {isPending ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

