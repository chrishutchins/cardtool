"use client";

import { useState, useTransition } from "react";
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

interface InventoryTypeRowProps {
  type: InventoryType;
  index: number;
  totalCount: number;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
  onReorder: (typeIds: string[]) => Promise<void>;
  allTypes: InventoryType[];
}

const TRACKING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  quantity: { label: "Quantity", color: "bg-purple-900/50 text-purple-300" },
  dollar_value: { label: "Dollar Value", color: "bg-emerald-900/50 text-emerald-300" },
  single_use: { label: "Single Use", color: "bg-blue-900/50 text-blue-300" },
};

export function InventoryTypeRow({ 
  type, 
  index, 
  totalCount, 
  onDelete, 
  onUpdate, 
  onReorder,
  allTypes 
}: InventoryTypeRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleMoveUp = () => {
    if (index === 0) return;
    startTransition(async () => {
      const newOrder = [...allTypes];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      await onReorder(newOrder.map(t => t.id));
    });
  };

  const handleMoveDown = () => {
    if (index === totalCount - 1) return;
    startTransition(async () => {
      const newOrder = [...allTypes];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      await onReorder(newOrder.map(t => t.id));
    });
  };

  if (isEditing) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-4">
          <InventoryTypeForm
            action={async (formData) => {
              await onUpdate(type.id, formData);
              setIsEditing(false);
            }}
            defaultValues={{ 
              name: type.name, 
              slug: type.slug,
              tracking_type: type.tracking_type,
              is_active: type.is_active ?? true
            }}
            onCancel={() => setIsEditing(false)}
          />
        </td>
      </tr>
    );
  }

  const trackingTypeInfo = TRACKING_TYPE_LABELS[type.tracking_type] || { label: type.tracking_type, color: "bg-zinc-700 text-zinc-300" };

  return (
    <tr className={`hover:bg-zinc-800/50 transition-colors ${type.is_active === false ? "opacity-50" : ""}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={handleMoveUp}
            disabled={index === 0 || isPending}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={handleMoveDown}
            disabled={index === totalCount - 1 || isPending}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <span className="text-zinc-500 text-sm ml-1">{index + 1}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-white font-medium">{type.name}</td>
      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">{type.slug}</td>
      <td className="px-6 py-4">
        <span className={`text-xs px-2 py-1 rounded-full ${trackingTypeInfo.color}`}>
          {trackingTypeInfo.label}
        </span>
      </td>
      <td className="px-6 py-4">
        {type.is_active ? (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/50 text-emerald-300">Active</span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-700 text-zinc-400">Inactive</span>
        )}
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
                  await onDelete(type.id);
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

