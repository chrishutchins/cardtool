"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";
import { TransferPartnerForm } from "./transfer-partner-form";

interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  is_transferable?: boolean | null;
}

interface TransferPartner {
  id: string;
  source_currency_id: string;
  destination_currency_id: string;
  source_units: number;
  destination_units: number;
  transfer_timing: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  source_currency: {
    id: string;
    name: string;
    code: string;
    currency_type: string;
  } | null;
  destination_currency: {
    id: string;
    name: string;
    code: string;
    currency_type: string;
  } | null;
}

interface TransferPartnersTableProps {
  transferPartners: TransferPartner[];
  currencies: Currency[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

const currencyTypeColors: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  airline_miles: "info",
  hotel_points: "warning",
  transferable_points: "success",
  non_transferable_points: "default",
  cash_back: "success",
};

export function TransferPartnersTable({ transferPartners, currencies, onDelete, onUpdate }: TransferPartnersTableProps) {
  const [editingPartner, setEditingPartner] = useState<TransferPartner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const columns: DataTableColumn<TransferPartner>[] = [
    {
      id: "source",
      label: "Source",
      accessor: "source_currency_id",
      sticky: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-white font-medium">{row.source_currency?.name || "Unknown"}</span>
          <span className="text-zinc-500 text-xs font-mono">{row.source_currency?.code}</span>
        </div>
      ),
    },
    {
      id: "arrow",
      label: "",
      accessor: () => null,
      sortable: false,
      render: () => <span className="text-zinc-500">→</span>,
    },
    {
      id: "destination",
      label: "Destination",
      accessor: "destination_currency_id",
      render: (row) => {
        const type = row.destination_currency?.currency_type || "other";
        const variant = currencyTypeColors[type] || "default";
        return (
          <div className="flex flex-col">
            <span className="text-white font-medium">{row.destination_currency?.name || "Unknown"}</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs font-mono">{row.destination_currency?.code}</span>
              <Badge variant={variant}>
                {type.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      id: "ratio",
      label: "Ratio",
      accessor: "source_units",
      align: "center",
      render: (row) => (
        <span className="text-white font-mono text-sm">
          {row.source_units}:{row.destination_units}
        </span>
      ),
    },
    {
      id: "timing",
      label: "Timing",
      accessor: "transfer_timing",
      render: (row) => (
        <span className="text-zinc-400 text-sm">
          {row.transfer_timing || "—"}
        </span>
      ),
    },
    {
      id: "notes",
      label: "Notes",
      accessor: "notes",
      render: (row) => {
        if (!row.notes) return <span className="text-zinc-600">—</span>;
        return (
          <span className="text-amber-400 text-sm" title={row.notes}>
            ⚠️ {row.notes}
          </span>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      accessor: "is_active",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "default"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
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
        if (deletingId === row.id) {
          return (
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-zinc-400">Delete?</span>
              <button
                onClick={() => handleDelete(row.id)}
                disabled={isPending}
                className="rounded px-3 py-1 text-sm text-red-400 hover:text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Yes
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                No
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditingPartner(row)}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeletingId(row.id)}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        data={transferPartners}
        columns={columns}
        keyAccessor={(row) => row.id}
        searchPlaceholder="Search transfer partners..."
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return (
            (row.source_currency?.name?.toLowerCase().includes(q) ?? false) ||
            (row.source_currency?.code?.toLowerCase().includes(q) ?? false) ||
            (row.destination_currency?.name?.toLowerCase().includes(q) ?? false) ||
            (row.destination_currency?.code?.toLowerCase().includes(q) ?? false) ||
            (row.notes?.toLowerCase().includes(q) ?? false)
          );
        }}
        showColumnSelector={false}
        defaultSortColumn="source"
        emptyMessage="No transfer partners yet. Add one above."
      />

      {/* Edit Modal */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingPartner(null)}
          />
          <div className="relative w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Transfer Partner</h2>
            <TransferPartnerForm
              action={async (formData) => {
                await onUpdate(editingPartner.id, formData);
                setEditingPartner(null);
              }}
              currencies={currencies}
              defaultValues={{
                source_currency_id: editingPartner.source_currency_id,
                destination_currency_id: editingPartner.destination_currency_id,
                source_units: editingPartner.source_units,
                destination_units: editingPartner.destination_units,
                transfer_timing: editingPartner.transfer_timing,
                notes: editingPartner.notes,
                is_active: editingPartner.is_active ?? true,
              }}
              onCancel={() => setEditingPartner(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
