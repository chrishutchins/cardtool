"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source_url: string | null;
  is_default: boolean;
  display_order: number;
}

interface TemplatesTableProps {
  templates: Template[];
  onDelete: (templateId: string) => Promise<void>;
  onSetDefault: (templateId: string) => Promise<void>;
}

export function TemplatesTable({ templates, onDelete, onSetDefault }: TemplatesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const handleSetDefault = (id: string) => {
    startTransition(async () => {
      await onSetDefault(id);
    });
  };

  const columns: DataTableColumn<Template>[] = [
    {
      id: "name",
      label: "Name",
      accessor: "name",
      sticky: true,
      render: (row) => (
        <Link
          href={`/admin/point-values/${row.id}`}
          className="text-white font-medium hover:text-amber-400 transition-colors"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: "description",
      label: "Description",
      accessor: "description",
      render: (row) => (
        <span className="text-zinc-400 text-sm">{row.description || "—"}</span>
      ),
    },
    {
      id: "source",
      label: "Source",
      accessor: "source_url",
      render: (row) => (
        row.source_url ? (
          <a
            href={row.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 text-sm"
          >
            Link ↗
          </a>
        ) : (
          <span className="text-zinc-500">—</span>
        )
      ),
    },
    {
      id: "default",
      label: "Default",
      accessor: "is_default",
      align: "center",
      render: (row) => (
        row.is_default ? (
          <Badge variant="success">Default</Badge>
        ) : (
          <button
            onClick={() => handleSetDefault(row.id)}
            disabled={isPending}
            className="text-zinc-500 hover:text-white text-sm transition-colors disabled:opacity-50"
          >
            Set Default
          </button>
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
            <Link
              href={`/admin/point-values/${row.id}`}
              className="text-amber-400 hover:text-amber-300 text-sm"
            >
              Edit Values
            </Link>
            {!row.is_default && (
              <button
                onClick={() => setDeletingId(row.id)}
                className="text-red-400 hover:text-red-300 text-sm ml-3"
              >
                Delete
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={templates}
      columns={columns}
      keyAccessor={(row) => row.id}
      searchPlaceholder="Search templates..."
      searchFilter={(row, query) => {
        const q = query.toLowerCase();
        return (
          row.name.toLowerCase().includes(q) ||
          (row.description?.toLowerCase().includes(q) ?? false)
        );
      }}
      showColumnSelector={false}
      defaultSortColumn="name"
      emptyMessage="No templates yet. Create one above."
    />
  );
}
