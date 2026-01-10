"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";
import { Tables, Enums } from "@/lib/database.types";
import { CurrencyForm } from "./currency-form";

interface CurrenciesTableProps {
  currencies: Tables<"reward_currencies">[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

const typeConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  airline_miles: { label: "✈️ Airline Miles", variant: "info" },
  hotel_points: { label: "🏨 Hotel Points", variant: "warning" },
  transferable_points: { label: "🔄 Transferable", variant: "info" },
  non_transferable_points: { label: "📍 Non-Transferable", variant: "default" },
  cash_back: { label: "💵 Cash Back", variant: "success" },
  crypto: { label: "₿ Crypto", variant: "warning" },
  other: { label: "Other", variant: "default" },
  points: { label: "Points", variant: "default" },
  cash: { label: "Cash", variant: "success" },
  miles: { label: "Miles", variant: "info" },
};

export function CurrenciesTable({ currencies, onDelete, onUpdate }: CurrenciesTableProps) {
  const [editingCurrency, setEditingCurrency] = useState<Tables<"reward_currencies"> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const columns: DataTableColumn<Tables<"reward_currencies">>[] = [
    {
      id: "name",
      label: "Name",
      accessor: "name",
      sticky: true,
      render: (row) => <span className="text-white font-medium">{row.name}</span>,
    },
    {
      id: "code",
      label: "Code",
      accessor: "code",
      render: (row) => <span className="text-zinc-400 font-mono text-sm">{row.code}</span>,
    },
    {
      id: "type",
      label: "Type",
      accessor: "currency_type",
      render: (row) => {
        const config = typeConfig[row.currency_type] ?? typeConfig.other;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "value",
      label: "Value (¢/unit)",
      accessor: "base_value_cents",
      align: "right",
      sortAccessor: (row) => row.base_value_cents ?? 0,
      render: (row) => (
        <span className="text-zinc-400">
          {row.base_value_cents ? `${row.base_value_cents}¢` : "—"}
        </span>
      ),
    },
    {
      id: "cash_out",
      label: "Cash Out (¢/unit)",
      accessor: "cash_out_value_cents",
      align: "right",
      sortAccessor: (row) => row.cash_out_value_cents ?? 0,
      render: (row) => (
        <span className="text-zinc-400">
          {row.currency_type !== "cash_back"
            ? (row.cash_out_value_cents ? `${row.cash_out_value_cents}¢` : "—")
            : <span className="text-zinc-600">N/A</span>
          }
        </span>
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
              onClick={() => setEditingCurrency(row)}
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
        data={currencies}
        columns={columns}
        keyAccessor={(row) => row.id}
        searchPlaceholder="Search currencies..."
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return (
            row.name.toLowerCase().includes(q) ||
            row.code.toLowerCase().includes(q) ||
            row.currency_type.toLowerCase().includes(q)
          );
        }}
        showColumnSelector={false}
        defaultSortColumn="name"
        emptyMessage="No currencies yet. Add one above."
      />

      {/* Edit Modal */}
      {editingCurrency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingCurrency(null)}
          />
          <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Currency</h2>
            <CurrencyForm
              action={async (formData) => {
                await onUpdate(editingCurrency.id, formData);
                setEditingCurrency(null);
              }}
              defaultValues={{
                name: editingCurrency.name,
                code: editingCurrency.code,
                currency_type: editingCurrency.currency_type as Enums<"reward_currency_type">,
                base_value_cents: editingCurrency.base_value_cents,
                cash_out_value_cents: editingCurrency.cash_out_value_cents,
                notes: editingCurrency.notes,
              }}
              onCancel={() => setEditingCurrency(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
