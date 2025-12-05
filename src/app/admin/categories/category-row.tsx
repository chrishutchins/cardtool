"use client";

import { useState } from "react";
import { Tables } from "@/lib/database.types";
import { CategoryForm } from "./category-form";

interface CategoryRowProps {
  category: Tables<"earning_categories">;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, formData: FormData) => Promise<void>;
}

export function CategoryRow({ category, onDelete, onUpdate }: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isEditing) {
    return (
      <tr>
        <td colSpan={5} className="px-6 py-4">
          <CategoryForm
            action={async (formData) => {
              await onUpdate(category.id, formData);
              setIsEditing(false);
            }}
            defaultValues={{
              name: category.name,
              slug: category.slug,
              sort_order: category.sort_order,
              description: category.description,
            }}
            onCancel={() => setIsEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-800/50 transition-colors">
      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">{category.sort_order}</td>
      <td className="px-6 py-4 text-white font-medium">{category.name}</td>
      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">{category.slug}</td>
      <td className="px-6 py-4 text-zinc-500 text-sm truncate max-w-xs">
        {category.description || "—"}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
          {isDeleting ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Delete?</span>
              <button
                onClick={async () => {
                  await onDelete(category.id);
                }}
                className="rounded px-3 py-1 text-sm text-red-400 hover:text-white hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

