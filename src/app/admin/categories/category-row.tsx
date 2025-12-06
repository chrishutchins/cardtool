"use client";

import { useState } from "react";
import { Tables } from "@/lib/database.types";
import { CategoryForm } from "./category-form";

interface CategoryRowProps {
  category: Tables<"earning_categories">;
  categories: Tables<"earning_categories">[];
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, formData: FormData) => Promise<void>;
}

export function CategoryRow({ category, categories, onDelete, onUpdate }: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const parentCategory = category.parent_category_id 
    ? categories.find(c => c.id === category.parent_category_id) 
    : null;

  if (isEditing) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-4">
          <CategoryForm
            action={async (formData) => {
              await onUpdate(category.id, formData);
              setIsEditing(false);
            }}
            defaultValues={{
              name: category.name,
              slug: category.slug,
              description: category.description,
              excluded_by_default: category.excluded_by_default,
              parent_category_id: category.parent_category_id,
            }}
            onCancel={() => setIsEditing(false)}
            categories={categories}
            currentCategoryId={category.id}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-800/50 transition-colors">
      <td className="px-6 py-4 text-white font-medium">{category.name}</td>
      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">{category.slug}</td>
      <td className="px-6 py-4 text-zinc-400 text-sm">
        {parentCategory ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-400">
            {parentCategory.name}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-6 py-4 text-zinc-500 text-sm truncate max-w-xs">
        {category.description || "—"}
      </td>
      <td className="px-6 py-4 text-center">
        {category.excluded_by_default ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400">
            Excluded
          </span>
        ) : null}
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
