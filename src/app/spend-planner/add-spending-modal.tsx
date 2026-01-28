"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "./spend-planner-client";
import type { PlannedSpendingItem } from "./planned-spending-table";

interface AddSpendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) => Promise<void>;
  categories: Category[];
  editItem?: PlannedSpendingItem | null;
}

export function AddSpendingModal({
  isOpen,
  onClose,
  onSave,
  categories,
  editItem,
}: AddSpendingModalProps) {
  const [name, setName] = useState("");
  const [costPercent, setCostPercent] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "annual" | "one_time">("annual");
  const [targetMonth, setTargetMonth] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or editItem changes
  useEffect(() => {
    if (isOpen) {
      setName(editItem?.name ?? "");
      setCostPercent(editItem?.cost_percent?.toString() ?? "");
      setCategoryId(editItem?.category_id ?? null);
      setAmountStr(editItem ? (editItem.amount_cents / 100).toString() : "");
      setFrequency(editItem?.frequency ?? "annual");
      setTargetMonth(editItem?.target_month ?? null);
      setNotes(editItem?.notes ?? "");
      setError(null);
    }
  }, [isOpen, editItem]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const costPercentVal = costPercent ? parseFloat(costPercent) : null;
      await onSave({
        name: name.trim(),
        cost_percent: costPercentVal,
        category_id: categoryId,
        amount_cents: Math.round(amount * 100),
        frequency,
        target_month: frequency === "one_time" ? targetMonth : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Group categories by parent
  const topLevelCategories = categories.filter(c => !c.parent_category_id);
  const childCategories = categories.filter(c => c.parent_category_id);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg bg-zinc-900 rounded-lg border border-zinc-700 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">
          {editItem ? "Edit Spending Source" : "Add Spending Source"}
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-zinc-300">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., IRS Taxes, Trevor IWT, Gold Bullion"
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-zinc-300">
                Category (MCC)
              </Label>
              <select
                id="category"
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">No category</option>
                {topLevelCategories.map((cat) => {
                  const children = childCategories.filter(c => c.parent_category_id === cat.id);
                  if (children.length > 0) {
                    return (
                      <optgroup key={cat.id} label={cat.name}>
                        <option value={cat.id}>{cat.name} (General)</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  }
                  return (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <Label htmlFor="costPercent" className="text-zinc-300">
                Processing Fee %
              </Label>
              <Input
                id="costPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={costPercent}
                onChange={(e) => setCostPercent(e.target.value)}
                placeholder="e.g., 1.8"
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency" className="text-zinc-300">
                Frequency
              </Label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "monthly" | "annual" | "one_time")}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="one_time">One-time</option>
              </select>
            </div>

            <div>
              <Label htmlFor="amount" className="text-zinc-300">
                {frequency === "monthly" ? "Monthly Amount" : "Amount"}
              </Label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
          </div>

          {frequency === "one_time" && (
            <div>
              <Label htmlFor="targetMonth" className="text-zinc-300">
                Target Month
              </Label>
              <select
                id="targetMonth"
                value={targetMonth ?? ""}
                onChange={(e) => setTargetMonth(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">Not specified</option>
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-zinc-300">
              Notes (optional)
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details"
              className="mt-1 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : editItem ? "Save Changes" : "Add Source"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
