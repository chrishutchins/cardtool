"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge, formatDate } from "@/components/data-table";

// Plaid access tiers
export type PlaidTier = "disabled" | "txns" | "txns_liab" | "full";

export const PLAID_TIERS: { value: PlaidTier; label: string; description: string }[] = [
  { value: "disabled", label: "Disabled", description: "No account linking" },
  { value: "txns", label: "Txns", description: "Transactions only" },
  { value: "txns_liab", label: "Txns + Liab", description: "Transactions + Liabilities" },
  { value: "full", label: "Full", description: "All features + on-demand refresh" },
];

interface UserStats {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  cardsAdded: number;
  spendingEdits: number;
  createdAt: string | null;
  plaidTier: PlaidTier;
}

interface UsersTableProps {
  users: UserStats[];
  onDelete: (userId: string) => Promise<void>;
  onSetPlaidTier: (userId: string, tier: PlaidTier) => Promise<void>;
  onEmulate: (userId: string, email: string | null) => Promise<void>;
}

export function UsersTable({
  users,
  onDelete,
  onSetPlaidTier,
  onEmulate,
}: UsersTableProps) {
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (user: UserStats) => {
    if (!confirm(`Delete all data for ${user.email || user.userId}? This cannot be undone.`)) {
      return;
    }
    setPendingUserId(user.userId);
    startTransition(async () => {
      await onDelete(user.userId);
      setPendingUserId(null);
    });
  };

  const handleSetPlaidTier = (user: UserStats, tier: PlaidTier) => {
    setPendingUserId(user.userId);
    startTransition(async () => {
      await onSetPlaidTier(user.userId, tier);
      setPendingUserId(null);
    });
  };

  const handleEmulate = (user: UserStats) => {
    setPendingUserId(user.userId);
    startTransition(async () => {
      await onEmulate(user.userId, user.email);
      setPendingUserId(null);
    });
  };

  const columns: DataTableColumn<UserStats>[] = [
    {
      id: "user",
      label: "User",
      accessor: "email",
      sticky: true,
      render: (row) => (
        <div>
          {row.email ? (
            <div className="text-white font-medium">{row.email}</div>
          ) : (
            <div className="text-zinc-500 italic">No email found</div>
          )}
          {(row.firstName || row.lastName) && (
            <div className="text-sm text-zinc-400">
              {[row.firstName, row.lastName].filter(Boolean).join(" ")}
            </div>
          )}
          <div className="text-xs text-zinc-600 font-mono">{row.userId}</div>
        </div>
      ),
    },
    {
      id: "cardsAdded",
      label: "Cards Added",
      accessor: "cardsAdded",
      align: "center",
      sortAccessor: (row) => row.cardsAdded,
      render: (row) => (
        <span className={`font-mono ${row.cardsAdded > 0 ? "text-white" : "text-zinc-600"}`}>
          {row.cardsAdded}
        </span>
      ),
    },
    {
      id: "spendingEdits",
      label: "Spending Edits",
      accessor: "spendingEdits",
      align: "center",
      sortAccessor: (row) => row.spendingEdits,
      render: (row) => (
        <span className={`font-mono ${row.spendingEdits > 0 ? "text-white" : "text-zinc-600"}`}>
          {row.spendingEdits}
        </span>
      ),
    },
    {
      id: "createdAt",
      label: "First Activity",
      accessor: "createdAt",
      sortAccessor: (row) => row.createdAt ?? "",
      render: (row) => (
        <span className="text-zinc-400 text-sm">
          {formatDate(row.createdAt, { year: "numeric", month: "short", day: "numeric" })}
        </span>
      ),
    },
    {
      id: "plaidTier",
      label: "Plaid Access",
      accessor: "plaidTier",
      align: "center",
      render: (row) => {
        const isRowPending = pendingUserId === row.userId && isPending;
        const tierConfig = PLAID_TIERS.find(t => t.value === row.plaidTier) ?? PLAID_TIERS[0];
        const tierColors: Record<PlaidTier, string> = {
          disabled: "bg-zinc-700 text-zinc-400 border-zinc-600",
          txns: "bg-blue-500/20 text-blue-400 border-blue-500/50",
          txns_liab: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
          full: "bg-amber-500/20 text-amber-400 border-amber-500/50",
        };
        return (
          <select
            value={row.plaidTier}
            onChange={(e) => {
              e.stopPropagation();
              handleSetPlaidTier(row, e.target.value as PlaidTier);
            }}
            disabled={isRowPending}
            className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${tierColors[row.plaidTier]}`}
            title={tierConfig.description}
          >
            {PLAID_TIERS.map((tier) => (
              <option key={tier.value} value={tier.value} className="bg-zinc-800 text-white">
                {tier.label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      accessor: () => null,
      sortable: false,
      hideFromPicker: true,
      align: "right",
      render: (row) => {
        const isRowPending = pendingUserId === row.userId && isPending;
        return (
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEmulate(row);
              }}
              disabled={isRowPending}
              className="text-amber-400 hover:text-amber-300 text-sm disabled:opacity-50"
            >
              {isRowPending ? "Loading..." : "Emulate"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row);
              }}
              disabled={isRowPending}
              className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      keyAccessor={(row) => row.userId}
      searchPlaceholder="Search by name, email, or user ID..."
      searchFilter={(row, query) => {
        const q = query.toLowerCase();
        const email = row.email?.toLowerCase() ?? "";
        const firstName = row.firstName?.toLowerCase() ?? "";
        const lastName = row.lastName?.toLowerCase() ?? "";
        const fullName = `${firstName} ${lastName}`.trim();
        const userId = row.userId.toLowerCase();

        return (
          email.includes(q) ||
          firstName.includes(q) ||
          lastName.includes(q) ||
          fullName.includes(q) ||
          userId.includes(q)
        );
      }}
      showColumnSelector={false}
      defaultSortColumn="createdAt"
      defaultSortDirection="desc"
      emptyMessage="No users yet."
      rowClassName={(row) => pendingUserId === row.userId && isPending ? "opacity-50" : ""}
    />
  );
}

