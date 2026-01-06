"use client";

import { useState, useTransition, useMemo } from "react";
import { InventoryItemData, InventoryType } from "./inventory-client";

interface EditInventoryModalProps {
  item: InventoryItemData;
  inventoryTypes: InventoryType[];
  brandSuggestions: string[];
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function EditInventoryModal({
  item,
  inventoryTypes,
  brandSuggestions,
  onClose,
  onSubmit,
}: EditInventoryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTypeId, setSelectedTypeId] = useState(item.type_id);
  const [brandInput, setBrandInput] = useState(item.brand ?? "");
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  const selectedType = useMemo(() => {
    return inventoryTypes.find(t => t.id === selectedTypeId);
  }, [inventoryTypes, selectedTypeId]);

  const trackingType = selectedType?.tracking_type ?? "single_use";

  const filteredBrandSuggestions = useMemo(() => {
    if (!brandInput) return brandSuggestions.slice(0, 5);
    const lower = brandInput.toLowerCase();
    return brandSuggestions.filter(b => b.toLowerCase().includes(lower)).slice(0, 5);
  }, [brandInput, brandSuggestions]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSubmit(formData);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Item</h2>
            <p className="text-sm text-zinc-400">{item.name}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Type</label>
            <select
              name="type_id"
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              {inventoryTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={item.name}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Brand with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Brand (optional)</label>
            <input
              type="text"
              name="brand"
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onFocus={() => setShowBrandSuggestions(true)}
              onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
              placeholder="e.g., Hilton, Delta, Amazon"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            {showBrandSuggestions && filteredBrandSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-10 overflow-hidden">
                {filteredBrandSuggestions.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      setBrandInput(brand);
                      setShowBrandSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Value for dollar_value types */}
          {trackingType === "dollar_value" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Original Value ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    name="original_value"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={item.original_value_cents ? (item.original_value_cents / 100).toFixed(2) : ""}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Remaining ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    name="remaining_value"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={item.remaining_value_cents ? (item.remaining_value_cents / 100).toFixed(2) : ""}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quantity for quantity types */}
          {trackingType === "quantity" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Total Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  required
                  defaultValue={item.quantity ?? 1}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Used</label>
                <input
                  type="number"
                  name="quantity_used"
                  min="0"
                  required
                  defaultValue={item.quantity_used ?? 0}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Expiration Date <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              name="expiration_date"
              defaultValue={item.expiration_date ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Code & PIN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Code <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="code"
                defaultValue={item.code ?? ""}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                PIN <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="pin"
                defaultValue={item.pin ?? ""}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              URL <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              name="url"
              defaultValue={item.url ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Notes <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={item.notes ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

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
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

