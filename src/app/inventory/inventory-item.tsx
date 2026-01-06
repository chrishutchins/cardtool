"use client";

import { useState, useTransition } from "react";
import { InventoryItemData, InventoryType } from "./inventory-client";
import { ViewItemModal } from "./view-item-modal";
import { EditInventoryModal } from "./edit-inventory-modal";
import { UseInventoryModal } from "./use-inventory-modal";

interface InventoryItemProps {
  item: InventoryItemData;
  inventoryTypes: InventoryType[];
  brandSuggestions: string[];
  showBrand: boolean;
  showType: boolean;
  onUpdateItem: (itemId: string, formData: FormData) => Promise<void>;
  onUseItem: (itemId: string, formData: FormData) => Promise<void>;
  onMarkUnused: (itemId: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
}

export function InventoryItem({
  item,
  inventoryTypes,
  brandSuggestions,
  showBrand,
  showType,
  onUpdateItem,
  onUseItem,
  onMarkUnused,
  onDeleteItem,
}: InventoryItemProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const trackingType = item.inventory_types?.tracking_type ?? "single_use";
  const typeName = item.inventory_types?.name ?? "Unknown";

  // Calculate remaining for display
  const getRemainingDisplay = () => {
    if (trackingType === "dollar_value") {
      const remaining = (item.remaining_value_cents ?? 0) / 100;
      const original = (item.original_value_cents ?? 0) / 100;
      if (item.is_used) {
        return { text: `$${original.toFixed(0)} used`, color: "text-emerald-400" };
      }
      if (remaining < original) {
        return { text: `$${remaining.toFixed(0)} remaining`, color: "text-amber-400" };
      }
      return { text: `$${original.toFixed(0)}`, color: "text-zinc-300" };
    } else if (trackingType === "quantity") {
      const remaining = item.quantity - (item.quantity_used ?? 0);
      if (item.is_used) {
        return { text: `${item.quantity} used`, color: "text-emerald-400" };
      }
      if (item.quantity_used > 0) {
        return { text: `${remaining} of ${item.quantity} left`, color: "text-amber-400" };
      }
      return { text: `${item.quantity}`, color: "text-zinc-300" };
    } else {
      // single_use
      if (item.is_used) {
        return { text: "Used", color: "text-emerald-400" };
      }
      return { text: "Available", color: "text-zinc-300" };
    }
  };

  const remainingDisplay = getRemainingDisplay();

  // Format expiration date
  const formatExpiration = () => {
    if (!item.expiration_date) return null;
    const exp = new Date(item.expiration_date + "T00:00:00");
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Expired", color: "text-red-400" };
    } else if (diffDays <= 7) {
      return { text: `Expires in ${diffDays}d`, color: "text-red-400" };
    } else if (diffDays <= 30) {
      return { text: `Expires ${exp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, color: "text-amber-400" };
    } else {
      return { text: `Exp ${exp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, color: "text-zinc-500" };
    }
  };

  const expirationDisplay = formatExpiration();

  const handleMarkUsed = () => {
    if (trackingType === "single_use") {
      // For single use, just mark it directly
      startTransition(async () => {
        const formData = new FormData();
        await onUseItem(item.id, formData);
      });
    } else {
      // For quantity/dollar value, show the use modal
      setShowUseModal(true);
    }
  };

  const handleMarkUnused = () => {
    startTransition(async () => {
      await onMarkUnused(item.id);
    });
  };

  // Calculate progress for partially used items
  const getProgress = () => {
    if (trackingType === "dollar_value" && item.original_value_cents) {
      return ((item.remaining_value_cents ?? 0) / item.original_value_cents) * 100;
    } else if (trackingType === "quantity" && item.quantity > 0) {
      return ((item.quantity - (item.quantity_used ?? 0)) / item.quantity) * 100;
    }
    return 100;
  };

  const progress = getProgress();
  const isPartiallyUsed = progress < 100 && progress > 0;

  return (
    <>
      <div className={`px-4 py-3 ${item.is_used ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Left: Status + Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Status Button */}
            {item.is_used ? (
              <button
                onClick={handleMarkUnused}
                disabled={isPending}
                className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                title="Click to unmark"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : isPartiallyUsed ? (
              <button
                onClick={handleMarkUsed}
                disabled={isPending}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center flex-shrink-0 hover:from-emerald-500 hover:to-emerald-700 transition-all disabled:opacity-50"
                title="Partially used - click to use more"
              >
                <span className="text-xs font-bold text-white">+</span>
              </button>
            ) : (
              <button
                onClick={handleMarkUsed}
                disabled={isPending}
                className="w-8 h-8 rounded-lg border-2 border-zinc-600 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-all group disabled:opacity-50"
                title="Mark as used"
              >
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}

            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowViewModal(true)}
                  className={`font-medium hover:underline ${item.is_used ? "text-zinc-400 line-through" : "text-white"}`}
                >
                  {item.name}
                </button>
                {showType && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 whitespace-nowrap">
                    {typeName}
                  </span>
                )}
                {item.code && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 whitespace-nowrap">
                    Has code
                  </span>
                )}
              </div>
              {showBrand && item.brand && (
                <div className="text-sm text-zinc-500 mt-0.5">{item.brand}</div>
              )}
            </div>
          </div>

          {/* Right: Value + Expiration + Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Expiration */}
            {expirationDisplay && (
              <div className={`text-xs ${expirationDisplay.color} hidden sm:block`}>
                {expirationDisplay.text}
              </div>
            )}

            {/* Value/Status */}
            <div className="text-right min-w-[80px]">
              <div className={`text-sm font-medium ${remainingDisplay.color}`}>
                {remainingDisplay.text}
              </div>
              {/* Progress bar for partially used */}
              {isPartiallyUsed && (
                <div className="w-16 h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowViewModal(true)}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="View details"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showViewModal && (
        <ViewItemModal
          item={item}
          onClose={() => setShowViewModal(false)}
          onEdit={() => {
            setShowViewModal(false);
            setShowEditModal(true);
          }}
          onDelete={async () => {
            await onDeleteItem(item.id);
            setShowViewModal(false);
          }}
        />
      )}

      {showEditModal && (
        <EditInventoryModal
          item={item}
          inventoryTypes={inventoryTypes}
          brandSuggestions={brandSuggestions}
          onClose={() => setShowEditModal(false)}
          onSubmit={async (formData) => {
            await onUpdateItem(item.id, formData);
            setShowEditModal(false);
          }}
        />
      )}

      {showUseModal && (
        <UseInventoryModal
          item={item}
          onClose={() => setShowUseModal(false)}
          onSubmit={async (formData) => {
            await onUseItem(item.id, formData);
            setShowUseModal(false);
          }}
        />
      )}
    </>
  );
}

