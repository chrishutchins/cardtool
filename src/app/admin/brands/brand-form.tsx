"use client";

import { useState, useTransition } from "react";

interface BrandFormProps {
  action: (formData: FormData) => Promise<void>;
}

export function BrandForm({ action }: BrandFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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
      setName("");
      setSlug("");
    });
  };

  return (
    <form action={handleSubmit} className="flex gap-4 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSlug(generateSlug(e.target.value));
          }}
          placeholder="e.g., Delta"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-zinc-400 mb-1">Slug</label>
        <input
          type="text"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g., delta"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white font-mono placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          required
          disabled={isPending}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Adding..." : "Add Brand"}
      </button>
    </form>
  );
}
