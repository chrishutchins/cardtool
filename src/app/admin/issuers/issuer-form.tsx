"use client";

import { useState, useTransition } from "react";

interface IssuerFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: { name: string; slug: string };
  onCancel?: () => void;
}

export function IssuerForm({ action, defaultValues, onCancel }: IssuerFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [isPending, startTransition] = useTransition();

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      // Reset form for new entries (not edits)
      if (!defaultValues) {
        setName("");
        setSlug("");
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-zinc-400 mb-1">
          Name
        </label>
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
          placeholder="e.g., Chase"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-zinc-400 mb-1">
          Slug
        </label>
        <input
          type="text"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g., chase"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (defaultValues ? "Updating..." : "Adding...") : (defaultValues ? "Update" : "Add Issuer")}
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

