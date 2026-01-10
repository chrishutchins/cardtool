"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge, formatDate } from "@/components/data-table";

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

interface UsersTableProps {
  users: UserStats[];
  onDelete: (userId: string) => Promise<void>;
  onToggleAccountLinking: (userId: string, enabled: boolean) => Promise<void>;
  onEmulate: (userId: string, email: string | null) => Promise<void>;
}

export function UsersTable({
  users,
  onDelete,
  onToggleAccountLinking,
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

  const handleToggleAccountLinking = (user: UserStats) => {
    setPendingUserId(user.userId);
    startTransition(async () => {
      await onToggleAccountLinking(user.userId, !user.accountLinkingEnabled);
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
      id: "accountLinking",
      label: "Account Linking",
      accessor: "accountLinkingEnabled",
      align: "center",
      render: (row) => {
        const isRowPending = pendingUserId === row.userId && isPending;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleAccountLinking(row);
            }}
            disabled={isRowPending}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
              row.accountLinkingEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
            }`}
          >
            {row.accountLinkingEnabled ? "Enabled" : "Disabled"}
          </button>
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

