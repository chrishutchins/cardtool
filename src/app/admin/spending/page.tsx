"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: number;
  name: string;
  slug: string;
  excluded_by_default: boolean;
}

interface SpendingDefault {
  id: number;
  category_id: number;
  annual_spend_cents: number;
  source: string | null;
}

interface CategoryWithSpending extends Category {
  spending?: SpendingDefault;
}

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function AdminSpendingPage() {
  const [categories, setCategories] = useState<CategoryWithSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editSource, setEditSource] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    
    const [categoriesResult, spendingResult] = await Promise.all([
      supabase
        .from("earning_categories")
        .select("id, name, slug, excluded_by_default")
        .order("name"),
      supabase
        .from("spending_defaults")
        .select("*"),
    ]);

    const categoriesData = categoriesResult.data ?? [];
    const spendingData = spendingResult.data ?? [];

    const merged: CategoryWithSpending[] = categoriesData.map((cat) => ({
      ...cat,
      spending: spendingData.find((s) => s.category_id === cat.id),
    }));

    setCategories(merged);
    setLoading(false);
  }

  function startEdit(category: CategoryWithSpending) {
    setEditingId(category.id);
    setEditAmount(
      category.spending 
        ? (category.spending.annual_spend_cents / 100).toString() 
        : ""
    );
    setEditSource(category.spending?.source ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
    setEditSource("");
  }

  async function saveEdit(categoryId: number) {
    startTransition(async () => {
      const supabase = createClient();
      const amountCents = Math.round(parseFloat(editAmount || "0") * 100);
      
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;

      if (category.spending) {
        // Update existing
        await supabase
          .from("spending_defaults")
          .update({
            annual_spend_cents: amountCents,
            source: editSource || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", category.spending.id);
      } else {
        // Insert new
        await supabase
          .from("spending_defaults")
          .insert({
            category_id: categoryId,
            annual_spend_cents: amountCents,
            source: editSource || null,
          });
      }

      cancelEdit();
      loadData();
    });
  }

  async function deleteDefault(spendingId: number) {
    if (!confirm("Remove default spending for this category?")) return;
    
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("spending_defaults")
        .delete()
        .eq("id", spendingId);
      loadData();
    });
  }

  const totalDefaultSpend = categories.reduce(
    (sum, c) => sum + (c.spending?.annual_spend_cents ?? 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Default Spending</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Set default annual spending amounts for each category. Users can override these values.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">Total Default Spending</div>
          <div className="text-2xl font-bold text-white">{formatDollars(totalDefaultSpend)}/yr</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Default Annual Spend
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-zinc-800/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{category.name}</span>
                    {category.excluded_by_default && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-zinc-700 text-zinc-400">
                        Excluded
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">{category.slug}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId === category.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-zinc-400">$</span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="0"
                        className="w-28 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-right text-white text-sm focus:border-emerald-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className={category.spending ? "text-white" : "text-zinc-600"}>
                      {category.spending 
                        ? formatDollars(category.spending.annual_spend_cents)
                        : "—"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      placeholder="e.g., BLS estimate"
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <span className="text-zinc-500 text-sm">
                      {category.spending?.source ?? "—"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId === category.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => saveEdit(category.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-400 text-sm hover:text-white hover:border-zinc-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(category)}
                        className="px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-400 text-sm hover:text-white hover:border-zinc-600 transition-colors"
                      >
                        {category.spending ? "Edit" : "Set"}
                      </button>
                      {category.spending && (
                        <button
                          onClick={() => deleteDefault(category.spending!.id)}
                          className="px-3 py-1.5 rounded-md border border-zinc-700 text-red-400 text-sm hover:text-red-300 hover:border-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No categories found.
          </div>
        )}
      </div>
    </div>
  );
}

