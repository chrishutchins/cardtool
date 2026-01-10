"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn } from "@/components/data-table";
import { Tables } from "@/lib/database.types";

interface IssuersTableProps {
  issuers: Tables<"issuers">[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

export function IssuersTable({ issuers, onDelete, onUpdate }: IssuersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = (issuer: Tables<"issuers">) => {
    setEditingId(issuer.id);
    setEditName(issuer.name);
    setEditSlug(issuer.slug);
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

  const columns: DataTableColumn<Tables<"issuers">>[] = [
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
      data={issuers}
      columns={columns}
      keyAccessor={(row) => row.id}
      searchPlaceholder="Search issuers..."
      searchFilter={(row, query) => {
        const q = query.toLowerCase();
        return row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
      }}
      showColumnSelector={false}
      defaultSortColumn="name"
      emptyMessage="No issuers yet. Add one above."
    />
  );
}
