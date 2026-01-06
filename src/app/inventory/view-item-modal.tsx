"use client";

import { useState, useTransition } from "react";
import { InventoryItemData } from "./inventory-client";

interface ViewItemModalProps {
  item: InventoryItemData;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function ViewItemModal({
  item,
  onClose,
  onEdit,
  onDelete,
}: ViewItemModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trackingType = item.inventory_types?.tracking_type ?? "single_use";
  const typeName = item.inventory_types?.name ?? "Unknown";

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await onDelete();
    });
  };

  // Calculate remaining for display
  const getRemainingDisplay = () => {
    if (trackingType === "dollar_value") {
      const remaining = (item.remaining_value_cents ?? 0) / 100;
      const original = (item.original_value_cents ?? 0) / 100;
      return `$${remaining.toFixed(2)} of $${original.toFixed(2)} remaining`;
    } else if (trackingType === "quantity") {
      const qty = item.quantity ?? 1;
      const remaining = qty - (item.quantity_used ?? 0);
      return `${remaining} of ${qty} remaining`;
    } else {
      return item.is_used ? "Used" : "Available";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{item.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {typeName}
              </span>
              {item.brand && (
                <span className="text-xs text-zinc-500">{item.brand}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
            <span className="text-sm text-zinc-400">Status</span>
            <span className={`text-sm font-medium ${item.is_used ? "text-emerald-400" : "text-amber-400"}`}>
              {getRemainingDisplay()}
            </span>
          </div>

          {/* Expiration */}
          {item.expiration_date && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
              <span className="text-sm text-zinc-400">Expires</span>
              <span className="text-sm text-white">{formatDate(item.expiration_date)}</span>
            </div>
          )}

          {/* Code */}
          {item.code && (
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Code</span>
                <button
                  onClick={() => copyToClipboard(item.code!, "code")}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  {copiedField === "code" ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <code className="block font-mono text-white text-sm bg-zinc-900 rounded px-3 py-2 select-all">
                {item.code}
              </code>
            </div>
          )}

          {/* PIN */}
          {item.pin && (
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">PIN</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {showPin ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(item.pin!, "pin")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    {copiedField === "pin" ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <code className="block font-mono text-white text-sm bg-zinc-900 rounded px-3 py-2 select-all">
                {showPin ? item.pin : "••••••••"}
              </code>
            </div>
          )}

          {/* URL */}
          {item.url && (
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">URL</span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-emerald-400 hover:text-emerald-300 truncate transition-colors"
              >
                {item.url}
              </a>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="p-3 rounded-lg bg-zinc-800/50">
              <span className="text-sm text-zinc-400 block mb-1">Notes</span>
              <p className="text-sm text-white whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-zinc-800">
          {isDeleting ? (
            <>
              <span className="flex-1 text-sm text-zinc-400 self-center">Delete this item?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                disabled={isPending}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsDeleting(true)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-red-400 hover:bg-zinc-800 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={onEdit}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

