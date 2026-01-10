"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";
import { InventoryTypeForm } from "./type-form";

interface InventoryType {
  id: string;
  name: string;
  slug: string;
  tracking_type: "quantity" | "dollar_value" | "single_use";
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface InventoryTypesTableProps {
  types: InventoryType[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
  onReorder: (typeIds: string[]) => Promise<void>;
}

const TRACKING_TYPE_LABELS: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  quantity: { label: "Quantity", variant: "info" },
  dollar_value: { label: "Dollar Value", variant: "success" },
  single_use: { label: "Single Use", variant: "default" },
};

export function InventoryTypesTable({ types, onDelete, onUpdate, onReorder }: InventoryTypesTableProps) {
  const [editingType, setEditingType] = useState<InventoryType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const handleMoveUp = (type: InventoryType) => {
    const index = types.findIndex(t => t.id === type.id);
    if (index <= 0) return;
    
    startTransition(async () => {
      const newOrder = [...types];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      await onReorder(newOrder.map(t => t.id));
    });
  };

  const handleMoveDown = (type: InventoryType) => {
    const index = types.findIndex(t => t.id === type.id);
    if (index < 0 || index >= types.length - 1) return;
    
    startTransition(async () => {
      const newOrder = [...types];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      await onReorder(newOrder.map(t => t.id));
    });
  };

  const columns: DataTableColumn<InventoryType>[] = [
    {
      id: "order",
      label: "Order",
      accessor: "display_order",
      sortable: false,
      render: (row) => {
        const index = types.findIndex(t => t.id === row.id);
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveUp(row);
              }}
              disabled={index === 0 || isPending}
              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move up"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveDown(row);
              }}
              disabled={index === types.length - 1 || isPending}
              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move down"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <span className="text-zinc-500 text-sm ml-1">{index + 1}</span>
          </div>
        );
      },
    },
    {
      id: "name",
      label: "Name",
      accessor: "name",
      sticky: true,
      render: (row) => <span className="text-white font-medium">{row.name}</span>,
    },
    {
      id: "slug",
      label: "Slug",
      accessor: "slug",
      render: (row) => <span className="text-zinc-400 font-mono text-sm">{row.slug}</span>,
    },
    {
      id: "tracking_type",
      label: "Tracking Type",
      accessor: "tracking_type",
      render: (row) => {
        const info = TRACKING_TYPE_LABELS[row.tracking_type] ?? { label: row.tracking_type, variant: "default" as const };
        return <Badge variant={info.variant}>{info.label}</Badge>;
      },
    },
    {
      id: "status",
      label: "Status",
      accessor: "is_active",
      render: (row) => (
        row.is_active !== false 
          ? <Badge variant="success">Active</Badge>
          : <Badge variant="default">Inactive</Badge>
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
              onClick={() => setEditingType(row)}
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
        data={types}
        columns={columns}
        keyAccessor={(row) => row.id}
        searchPlaceholder="Search inventory types..."
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
        }}
        showColumnSelector={false}
        emptyMessage="No inventory types yet. Add one above."
        rowClassName={(row) => row.is_active === false ? "opacity-50" : ""}
      />

      {/* Edit Modal */}
      {editingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingType(null)}
          />
          <div className="relative w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Inventory Type</h2>
            <InventoryTypeForm
              action={async (formData) => {
                await onUpdate(editingType.id, formData);
                setEditingType(null);
              }}
              defaultValues={{
                name: editingType.name,
                slug: editingType.slug,
                tracking_type: editingType.tracking_type,
                is_active: editingType.is_active ?? true,
              }}
              onCancel={() => setEditingType(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
