"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";
import { Tables } from "@/lib/database.types";
import { SiteConfigForm } from "./site-config-form";

interface Currency {
  code: string;
  name: string;
}

interface SiteConfigsTableProps {
  configs: Tables<"site_configs">[];
  currencies: Currency[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

export function SiteConfigsTable({ configs, currencies, onDelete, onUpdate }: SiteConfigsTableProps) {
  const [editingConfig, setEditingConfig] = useState<Tables<"site_configs"> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const columns: DataTableColumn<Tables<"site_configs">>[] = [
    {
      id: "name",
      label: "Name",
      accessor: "name",
      sticky: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{row.name}</span>
          {!row.is_active && (
            <Badge variant="warning">Inactive</Badge>
          )}
        </div>
      ),
    },
    {
      id: "currency",
      label: "Currency",
      accessor: "currency_code",
      render: (row) => (
        <span className="text-zinc-300 font-mono text-sm">{row.currency_code}</span>
      ),
    },
    {
      id: "domain",
      label: "Domain",
      accessor: "domain",
      render: (row) => (
        <span className="text-zinc-400 font-mono text-sm">{row.domain}</span>
      ),
    },
    {
      id: "selector",
      label: "Selector",
      accessor: "selector",
      render: (row) => (
        <span className="text-zinc-500 font-mono text-xs truncate max-w-[200px] block" title={row.selector}>
          {row.selector.length > 40 ? row.selector.substring(0, 40) + "..." : row.selector}
        </span>
      ),
    },
    {
      id: "balance_url",
      label: "Balance URL",
      accessor: "balance_page_url",
      render: (row) => (
        row.balance_page_url ? (
          <a 
            href={row.balance_page_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 text-sm truncate max-w-[150px] block"
            title={row.balance_page_url}
          >
            {new URL(row.balance_page_url).pathname || "/"}
          </a>
        ) : (
          <span className="text-zinc-600">—</span>
        )
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
              onClick={() => setEditingConfig(row)}
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
        data={configs}
        columns={columns}
        keyAccessor={(row) => row.id}
        searchPlaceholder="Search site configs..."
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return (
            row.name.toLowerCase().includes(q) ||
            row.currency_code.toLowerCase().includes(q) ||
            row.domain.toLowerCase().includes(q) ||
            row.selector.toLowerCase().includes(q)
          );
        }}
        showColumnSelector={false}
        defaultSortColumn="name"
        emptyMessage="No site configs yet. Add one above."
      />

      {/* Edit Modal */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingConfig(null)}
          />
          <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Site Config</h2>
            <SiteConfigForm
              action={async (formData) => {
                await onUpdate(editingConfig.id, formData);
                setEditingConfig(null);
              }}
              currencies={currencies}
              defaultValues={{
                name: editingConfig.name,
                currency_code: editingConfig.currency_code,
                domain: editingConfig.domain,
                balance_page_url: editingConfig.balance_page_url,
                selector: editingConfig.selector,
                parse_regex: editingConfig.parse_regex,
                is_active: editingConfig.is_active,
                format: editingConfig.format,
              }}
              onCancel={() => setEditingConfig(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
