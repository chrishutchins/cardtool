"use client";

import { useState, useTransition } from "react";
import { InventoryItemData } from "./inventory-client";

interface UseInventoryModalProps {
  item: InventoryItemData;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function UseInventoryModal({
  item,
  onClose,
  onSubmit,
}: UseInventoryModalProps) {
  const [isPending, startTransition] = useTransition();
  const trackingType = item.inventory_types?.tracking_type ?? "single_use";

  // For quantity type
  const qty = item.quantity ?? 1;
  const remainingQuantity = qty - (item.quantity_used ?? 0);
  const [useCount, setUseCount] = useState(1);

  // For dollar_value type
  const remainingDollars = (item.remaining_value_cents ?? 0) / 100;
  const [useAmount, setUseAmount] = useState(remainingDollars.toFixed(2));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSubmit(formData);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Use Item</h2>
            <p className="text-sm text-zinc-400">{item.name}</p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {trackingType === "quantity" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                How many did you use?
              </label>
              <input
                type="number"
                name="use_count"
                min="1"
                max={remainingQuantity}
                value={useCount}
                onChange={(e) => setUseCount(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-2 text-sm text-zinc-500">
                {remainingQuantity} of {qty} remaining
              </p>
            </div>
          )}

          {trackingType === "dollar_value" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                How much did you spend?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  name="use_amount"
                  step="0.01"
                  min="0.01"
                  max={remainingDollars}
                  value={useAmount}
                  onChange={(e) => setUseAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                ${remainingDollars.toFixed(2)} remaining of ${((item.original_value_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
          )}

          {/* Quick actions for dollar value */}
          {trackingType === "dollar_value" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseAmount(remainingDollars.toFixed(2))}
                className="flex-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Use All (${remainingDollars.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => setUseAmount((remainingDollars / 2).toFixed(2))}
                className="flex-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Use Half
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isPending ? "Updating..." : "Mark Used"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

