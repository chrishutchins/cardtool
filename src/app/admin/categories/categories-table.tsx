"use client";

import { useState, useTransition } from "react";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";
import { Tables } from "@/lib/database.types";
import { CategoryForm } from "./category-form";

interface CategoriesTableProps {
  categories: Tables<"earning_categories">[];
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, formData: FormData) => Promise<void>;
}

export function CategoriesTable({ categories, onDelete, onUpdate }: CategoriesTableProps) {
  const [editingCategory, setEditingCategory] = useState<Tables<"earning_categories"> | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  const getParentCategory = (id: number | null) => {
    if (!id) return null;
    return categories.find(c => c.id === id);
  };

  const columns: DataTableColumn<Tables<"earning_categories">>[] = [
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
      id: "parent",
      label: "Parent",
      accessor: "parent_category_id",
      render: (row) => {
        const parent = getParentCategory(row.parent_category_id);
        return parent ? (
          <Badge variant="info">{parent.name}</Badge>
        ) : (
          <span className="text-zinc-500">—</span>
        );
      },
    },
    {
      id: "description",
      label: "Description",
      accessor: "description",
      render: (row) => (
        <span className="text-zinc-500 text-sm truncate max-w-xs block">
          {row.description || "—"}
        </span>
      ),
    },
    {
      id: "excluded",
      label: "Excluded",
      accessor: "excluded_by_default",
      align: "center",
      render: (row) => (
        row.excluded_by_default ? (
          <Badge variant="warning">Excluded</Badge>
        ) : null
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
              onClick={() => setEditingCategory(row)}
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
        data={categories}
        columns={columns}
        keyAccessor={(row) => row.id.toString()}
        searchPlaceholder="Search categories..."
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return (
            row.name.toLowerCase().includes(q) ||
            row.slug.toLowerCase().includes(q) ||
            (row.description?.toLowerCase().includes(q) ?? false)
          );
        }}
        showColumnSelector={false}
        defaultSortColumn="name"
        emptyMessage="No categories yet. Add one above."
      />

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingCategory(null)}
          />
          <div className="relative w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Category</h2>
            <CategoryForm
              action={async (formData) => {
                await onUpdate(editingCategory.id, formData);
                setEditingCategory(null);
              }}
              defaultValues={{
                name: editingCategory.name,
                slug: editingCategory.slug,
                description: editingCategory.description,
                excluded_by_default: editingCategory.excluded_by_default,
                parent_category_id: editingCategory.parent_category_id,
              }}
              onCancel={() => setEditingCategory(null)}
              categories={categories}
              currentCategoryId={editingCategory.id}
            />
          </div>
        </div>
      )}
    </>
  );
}
