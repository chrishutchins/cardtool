"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn } from "@/components/data-table";
import { Tables } from "@/lib/database.types";

interface BrandsTableProps {
  brands: Tables<"brands">[];
  cardCounts: Map<string, number>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

export function BrandsTable({ brands, cardCounts, onDelete, onUpdate }: BrandsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = (brand: Tables<"brands">) => {
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditSlug(brand.slug);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSlug("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const formData = new FormData();
    formData.set("name", editName);
    formData.set("slug", editSlug);
    
    startTransition(async () => {
      await onUpdate(editingId, formData);
      cancelEdit();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const columns: DataTableColumn<Tables<"brands">>[] = [
    {
      id: "name",
      label: "Name",
      accessor: "name",
      sticky: true,
      render: (row) => {
        if (editingId === row.id) {
          return (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
              disabled={isPending}
            />
          );
        }
        return <span className="text-white font-medium">{row.name}</span>;
      },
    },
    {
      id: "slug",
      label: "Slug",
      accessor: "slug",
      render: (row) => {
        if (editingId === row.id) {
          return (
            <input
              type="text"
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              disabled={isPending}
            />
          );
        }
        return <span className="text-zinc-400 font-mono text-sm">{row.slug}</span>;
      },
    },
    {
      id: "cards",
      label: "Cards",
      align: "center" as const,
      accessor: (row) => cardCounts.get(row.id) ?? 0,
      sortAccessor: (row) => cardCounts.get(row.id) ?? 0,
      render: (row) => {
        const count = cardCounts.get(row.id) ?? 0;
        return <span className={count > 0 ? "text-zinc-300" : "text-zinc-600"}>{count}</span>;
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
        if (editingId === row.id) {
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={saveEdit}
                disabled={isPending}
                className="rounded px-3 py-1 text-sm text-emerald-400 hover:text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={isPending}
                className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          );
        }

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
              onClick={() => startEdit(row)}
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
    <DataTable
      data={brands}
      columns={columns}
      keyAccessor={(row) => row.id}
      searchPlaceholder="Search brands..."
      searchFilter={(row, query) => {
        const q = query.toLowerCase();
        return row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
      }}
      showColumnSelector={false}
      defaultSortColumn="name"
      emptyMessage="No brands yet. Add one above."
    />
  );
}
