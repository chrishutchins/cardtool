"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, formatDate } from "@/components/data-table";

// Plaid access tiers
export type PlaidTier = "disabled" | "txns" | "txns_liab" | "full";

export const PLAID_TIERS: { value: PlaidTier; label: string; description: string }[] = [
  { value: "disabled", label: "Disabled", description: "No Plaid features" },
  { value: "txns", label: "Transactions", description: "Transactions only" },
  { value: "txns_liab", label: "Txns + Liabilities", description: "Transactions + Liabilities" },
  { value: "full", label: "Full Access", description: "All Plaid features" },
];

export interface InviteCode {
  id: string;
  code: string;
  description: string | null;
  plaid_tier: PlaidTier;
  uses_remaining: number | null;
  uses_total: number | null;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  times_used: number;
}

interface InviteCodesTableProps {
  codes: InviteCode[];
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

export function InviteCodesTable({
  codes,
  onToggleActive,
  onDelete,
  onUpdate,
}: InviteCodesTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleToggleActive = (code: InviteCode) => {
    setPendingId(code.id);
    startTransition(async () => {
      await onToggleActive(code.id, !code.is_active);
      setPendingId(null);
    });
  };

  const handleDelete = (code: InviteCode) => {
    if (!confirm(`Delete invite code "${code.code}"? Users who used this code will keep their features.`)) {
      return;
    }
    setPendingId(code.id);
    startTransition(async () => {
      await onDelete(code.id);
      setPendingId(null);
    });
  };

  const handleSaveEdit = (code: InviteCode, formData: FormData) => {
    setPendingId(code.id);
    startTransition(async () => {
      await onUpdate(code.id, formData);
      setPendingId(null);
      setEditingId(null);
    });
  };

  const tierColors: Record<PlaidTier, string> = {
    disabled: "bg-zinc-700 text-zinc-400",
    txns: "bg-blue-500/20 text-blue-400",
    txns_liab: "bg-emerald-500/20 text-emerald-400",
    full: "bg-amber-500/20 text-amber-400",
  };

  const columns: DataTableColumn<InviteCode>[] = [
    {
      id: "code",
      label: "Code",
      accessor: "code",
      sticky: true,
      render: (row) => (
        <div>
          <div className="font-mono text-white font-medium">{row.code}</div>
          {row.description && (
            <div className="text-sm text-zinc-500">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      id: "plaid_tier",
      label: "Plaid Tier",
      accessor: "plaid_tier",
      render: (row) => {
        if (editingId === row.id) {
          return (
            <select
              name="plaid_tier"
              defaultValue={row.plaid_tier}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            >
              {PLAID_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
          );
        }
        const tierConfig = PLAID_TIERS.find((t) => t.value === row.plaid_tier);
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tierColors[row.plaid_tier]}`}>
            {tierConfig?.label ?? row.plaid_tier}
          </span>
        );
      },
    },
    {
      id: "uses",
      label: "Uses",
      accessor: "times_used",
      align: "center",
      render: (row) => {
        if (editingId === row.id) {
          return (
            <input
              type="number"
              name="uses_remaining"
              defaultValue={row.uses_remaining ?? ""}
              placeholder="∞"
              min={0}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center"
            />
          );
        }
        const usedStr = row.times_used.toString();
        const limitStr = row.uses_remaining !== null 
          ? `${row.uses_remaining + row.times_used}` 
          : "∞";
        const remainingStr = row.uses_remaining !== null 
          ? row.uses_remaining.toString()
          : "∞";
        
        return (
          <div className="text-sm">
            <span className="text-white font-mono">{usedStr}</span>
            <span className="text-zinc-500"> / {limitStr}</span>
            {row.uses_remaining !== null && (
              <div className="text-xs text-zinc-600">
                {remainingStr} remaining
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "expires_at",
      label: "Expires",
      accessor: "expires_at",
      render: (row) => {
        if (editingId === row.id) {
          return (
            <input
              type="datetime-local"
              name="expires_at"
              defaultValue={row.expires_at ? row.expires_at.slice(0, 16) : ""}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
            />
          );
        }
        if (!row.expires_at) {
          return <span className="text-zinc-500">Never</span>;
        }
        const expiresAt = new Date(row.expires_at);
        const isExpired = expiresAt < new Date();
        return (
          <span className={isExpired ? "text-red-400" : "text-zinc-400"}>
            {formatDate(row.expires_at, { 
              month: "short", 
              day: "numeric", 
              year: "numeric",
              hour: "numeric",
              minute: "2-digit"
            })}
            {isExpired && <span className="ml-1 text-red-400">(expired)</span>}
          </span>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      accessor: "is_active",
      align: "center",
      render: (row) => {
        const isRowPending = pendingId === row.id && isPending;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row);
            }}
            disabled={isRowPending}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              row.is_active
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
            } disabled:opacity-50`}
          >
            {row.is_active ? "Active" : "Inactive"}
          </button>
        );
      },
    },
    {
      id: "created",
      label: "Created",
      accessor: "created_at",
      sortAccessor: (row) => row.created_at,
      render: (row) => (
        <div className="text-sm">
          <div className="text-zinc-400">
            {formatDate(row.created_at, { month: "short", day: "numeric", year: "numeric" })}
          </div>
          {row.created_by && (
            <div className="text-xs text-zinc-600">{row.created_by}</div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      accessor: () => null,
      sortable: false,
      hideFromPicker: true,
      align: "right",
      render: (row) => {
        const isRowPending = pendingId === row.id && isPending;
        const isEditing = editingId === row.id;

        if (isEditing) {
          return (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveEdit(row, formData);
              }}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="description" value={row.description ?? ""} />
              <button
                type="submit"
                disabled={isRowPending}
                className="text-emerald-400 hover:text-emerald-300 text-sm disabled:opacity-50"
              >
                {isRowPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-zinc-400 hover:text-zinc-300 text-sm"
              >
                Cancel
              </button>
            </form>
          );
        }

        return (
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(row.id);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Edit
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
      data={codes}
      columns={columns}
      keyAccessor={(row) => row.id}
      searchPlaceholder="Search by code or description..."
      searchFilter={(row, query) => {
        const q = query.toLowerCase();
        return (
          row.code.toLowerCase().includes(q) ||
          (row.description?.toLowerCase().includes(q) ?? false)
        );
      }}
      showColumnSelector={false}
      defaultSortColumn="created"
      defaultSortDirection="desc"
      emptyMessage="No invite codes yet. Create one to get started."
      rowClassName={(row) => 
        (pendingId === row.id && isPending ? "opacity-50" : "") +
        (!row.is_active ? " opacity-60" : "")
      }
    />
  );
}
