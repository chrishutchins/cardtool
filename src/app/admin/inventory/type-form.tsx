"use client";

import { useState, useTransition } from "react";

interface InventoryTypeFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: { 
    name: string; 
    slug: string; 
    tracking_type: "quantity" | "dollar_value" | "single_use";
    is_active?: boolean;
  };
  onCancel?: () => void;
}

const TRACKING_TYPE_OPTIONS = [
  { value: "quantity", label: "Quantity", description: "Track count (e.g., 2 lounge passes)" },
  { value: "dollar_value", label: "Dollar Value", description: "Track remaining $ amount (e.g., $50 gift card)" },
  { value: "single_use", label: "Single Use", description: "Just used/not used (e.g., free night certificate)" },
];

export function InventoryTypeForm({ action, defaultValues, onCancel }: InventoryTypeFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [trackingType, setTrackingType] = useState<"quantity" | "dollar_value" | "single_use">(
    defaultValues?.tracking_type ?? "single_use"
  );
  const [isActive, setIsActive] = useState(defaultValues?.is_active ?? true);
  const [isPending, startTransition] = useTransition();

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      if (!defaultValues) {
        setName("");
        setSlug("");
        setTrackingType("single_use");
      } else {
        onCancel?.();
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-4">
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
            placeholder="e.g., Gift Card"
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
            placeholder="e.g., gift_card"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={isPending}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Tracking Type
          </label>
          <select
            name="tracking_type"
            value={trackingType}
            onChange={(e) => setTrackingType(e.target.value as "quantity" | "dollar_value" | "single_use")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isPending}
          >
            {TRACKING_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Tracking type description */}
      <p className="text-sm text-zinc-500">
        {TRACKING_TYPE_OPTIONS.find(o => o.value === trackingType)?.description}
      </p>

      {/* Is Active toggle (only for editing) */}
      {defaultValues && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
          />
          <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
          <span className="text-sm text-zinc-300">Active</span>
        </label>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (defaultValues ? "Updating..." : "Adding...") : (defaultValues ? "Update" : "Add Type")}
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

