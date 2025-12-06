"use client";

import { useState, useEffect, useTransition } from "react";
import { Tables } from "@/lib/database.types";

interface CategoryFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name: string;
    slug: string;
    description: string | null;
    excluded_by_default: boolean;
    parent_category_id: number | null;
  };
  onCancel?: () => void;
  categories?: Tables<"earning_categories">[];
  currentCategoryId?: number;
}

export function CategoryForm({ action, defaultValues, onCancel, categories, currentCategoryId }: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [excludedByDefault, setExcludedByDefault] = useState(defaultValues?.excluded_by_default ?? false);
  const [parentCategoryId, setParentCategoryId] = useState<string>(
    defaultValues?.parent_category_id?.toString() ?? ""
  );

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setExcludedByDefault(false);
    setParentCategoryId("");
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      // Only reset form for new categories (not edits)
      if (!defaultValues) {
        resetForm();
      }
      // If editing, call onCancel to close the edit form
      if (defaultValues && onCancel) {
        onCancel();
      }
    });
  };

  useEffect(() => {
    if (defaultValues) {
      setName(defaultValues.name);
      setSlug(defaultValues.slug);
      setDescription(defaultValues.description ?? "");
      setExcludedByDefault(defaultValues.excluded_by_default);
      setParentCategoryId(defaultValues.parent_category_id?.toString() ?? "");
    }
  }, [defaultValues]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Filter out the current category from parent options (can't be parent of itself)
  const availableParents = categories?.filter(c => c.id !== currentCategoryId) ?? [];

  return (
    <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <label className="block text-sm font-medium text-zinc-400 mb-1">Parent Category</label>
        <select
          name="parent_category_id"
          value={parentCategoryId}
          onChange={(e) => setParentCategoryId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">None</option>
          {availableParents.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
        <input
          type="text"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            name="excluded_by_default"
            value="true"
            checked={excludedByDefault}
            onChange={(e) => setExcludedByDefault(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
          />
          Excluded
        </label>
      </div>
      <div className="flex items-end gap-2 lg:col-span-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (defaultValues ? "Updating..." : "Adding...") : (defaultValues ? "Update" : "Add Category")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
