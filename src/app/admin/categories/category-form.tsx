"use client";

import { useState } from "react";

interface CategoryFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name: string;
    slug: string;
    sort_order: number;
    description: string | null;
  };
  onCancel?: () => void;
}

export function CategoryForm({ action, defaultValues, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!defaultValues) {
              setSlug(generateSlug(e.target.value));
            }
          }}
          placeholder="e.g., Dining"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Slug</label>
        <input
          type="text"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g., dining"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Sort Order</label>
        <input
          type="number"
          name="sort_order"
          defaultValue={defaultValues?.sort_order ?? 100}
          min="0"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
        <input
          type="text"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Optional description..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-end gap-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {defaultValues ? "Update" : "Add Category"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

