"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddSpendingModal } from "./add-spending-modal";
import type { Category } from "./spend-planner-client";

export interface PlannedSpendingItem {
  id: string;
  name: string;
  cost_percent: number | null;
  category_id: number | null;
  amount_cents: number;
  frequency: "monthly" | "annual" | "one_time";
  target_month: number | null;
  year: number;
  notes: string | null;
}

interface PlannedSpendingTableProps {
  items: PlannedSpendingItem[];
  categories: Category[];
  currentYear: number;
  onAdd: (item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) => Promise<void>;
  onUpdate: (id: string, item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PlannedSpendingTable({
  items,
  categories,
  currentYear,
  onAdd,
  onUpdate,
  onDelete,
}: PlannedSpendingTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PlannedSpendingItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "—";
    const category = categories.find(c => c.id === categoryId);
    return category?.name ?? "Unknown";
  };

  const getAnnualAmount = (item: PlannedSpendingItem) => {
    if (item.frequency === "monthly") {
      return item.amount_cents * 12;
    }
    return item.amount_cents;
  };

  const getMonthlyAmount = (item: PlannedSpendingItem) => {
    if (item.frequency === "annual") {
      return Math.round(item.amount_cents / 12);
    } else if (item.frequency === "monthly") {
      return item.amount_cents;
    }
    return null; // One-time
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleEdit = (item: PlannedSpendingItem) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleSave = async (data: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) => {
    if (editItem) {
      await onUpdate(editItem.id, data);
    } else {
      await onAdd(data);
    }
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  // Calculate totals
  const totalAnnual = items.reduce((sum, item) => sum + getAnnualAmount(item), 0);

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Planned Spending Sources</h2>
          <p className="text-sm text-zinc-400">
            Define where your money will go this year
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-zinc-500">No spending sources defined yet.</p>
          <p className="text-sm text-zinc-600 mt-1">
            Add spending sources to plan where your money will go.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Cost %</th>
                <th className="text-right p-3 font-medium">Monthly</th>
                <th className="text-right p-3 font-medium">Annual</th>
                <th className="text-left p-3 font-medium">Timing</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="p-3">
                    <div className="text-white font-medium">{item.name}</div>
                    {item.notes && (
                      <div className="text-xs text-zinc-500 mt-0.5">{item.notes}</div>
                    )}
                  </td>
                  <td className="p-3 text-sm text-zinc-300">
                    {getCategoryName(item.category_id)}
                  </td>
                  <td className="p-3 text-sm text-right text-zinc-300">
                    {item.cost_percent !== null ? `${item.cost_percent}%` : "—"}
                  </td>
                  <td className="p-3 text-sm text-right text-zinc-300">
                    {getMonthlyAmount(item) !== null
                      ? formatCurrency(getMonthlyAmount(item)!)
                      : "—"}
                  </td>
                  <td className="p-3 text-sm text-right font-medium text-white">
                    {formatCurrency(getAnnualAmount(item))}
                  </td>
                  <td className="p-3 text-sm text-zinc-400">
                    {item.frequency === "monthly" && "Monthly"}
                    {item.frequency === "annual" && "Annual"}
                    {item.frequency === "one_time" && (
                      <span>
                        One-time
                        {item.target_month && (
                          <span className="text-zinc-500">
                            {" "}({monthNames[item.target_month - 1]})
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id || isPending}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700">
                <td colSpan={4} className="p-3 text-right text-sm text-zinc-400">
                  Total Annual:
                </td>
                <td className="p-3 text-right text-lg font-bold text-white">
                  {formatCurrency(totalAnnual)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AddSpendingModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        categories={categories}
        editItem={editItem}
      />
    </div>
  );
}
