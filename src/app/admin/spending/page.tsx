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
}

interface CategoryWithSpending extends Category {
  spending?: SpendingDefault;
}

// Display names for spending UI to clarify mutually exclusive categories
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  "all-travel": "Other Travel (excl. Flights, Hotels, Cars)",
  "online-retail": "Online Retail (excl. Amazon)",
  "entertainment": "Entertainment (excl. Streaming)",
  "foreign-currency": "Foreign Transactions",
};

// Virtual/payment overlay categories to hide (don't need spending defaults)
const HIDDEN_CATEGORY_SLUGS = ["mobile-pay", "over-5k", "paypal"];

// Category groupings for organized display
const CATEGORY_GROUPS: { name: string; slugs: string[] }[] = [
  {
    name: "Everyday",
    slugs: ["grocery", "dining", "gas-ev", "drugstore", "wholesale-clubs"],
  },
  {
    name: "Shopping",
    slugs: ["amazon", "online-retail", "apparel", "home-improvement", "home-decor", "pet-supply"],
  },
  {
    name: "Travel",
    slugs: ["flights", "hotels", "rental-car", "transit", "all-travel", "foreign-currency"],
  },
  {
    name: "Entertainment & Lifestyle",
    slugs: ["entertainment", "streaming", "fitness", "personal-care"],
  },
  {
    name: "Bills & Utilities",
    slugs: ["phone", "internet-cable", "utilities", "insurance", "rent", "mortgage", "daycare"],
  },
  {
    name: "Business",
    slugs: ["business-services", "office-supply", "software", "ads", "shipping", "contractors"],
  },
  {
    name: "Other",
    slugs: ["taxes", "everything-else"],
  },
];

function getDisplayName(category: CategoryWithSpending): string {
  return DISPLAY_NAME_OVERRIDES[category.slug] || category.name;
}

function groupCategories(categories: CategoryWithSpending[]): { name: string; categories: CategoryWithSpending[] }[] {
  // Filter out hidden/virtual categories first
  const filteredCategories = categories.filter((c) => !HIDDEN_CATEGORY_SLUGS.includes(c.slug));
  const slugToCategory = new Map(filteredCategories.map((c) => [c.slug, c]));
  const usedSlugs = new Set<string>();
  
  const groups = CATEGORY_GROUPS.map((group) => {
    const groupCategories = group.slugs
      .map((slug) => {
        const cat = slugToCategory.get(slug);
        if (cat) usedSlugs.add(slug);
        return cat;
      })
      .filter((c): c is CategoryWithSpending => c !== undefined);
    
    return { name: group.name, categories: groupCategories };
  }).filter((g) => g.categories.length > 0);
  
  // Add any uncategorized items to "Other"
  const uncategorized = filteredCategories.filter((c) => !usedSlugs.has(c.slug));
  if (uncategorized.length > 0) {
    const otherGroup = groups.find((g) => g.name === "Other");
    if (otherGroup) {
      otherGroup.categories.push(...uncategorized);
    } else {
      groups.push({ name: "Other", categories: uncategorized });
    }
  }
  
  return groups;
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
  const [editValue, setEditValue] = useState<string>("");
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
        .select("id, category_id, annual_spend_cents"),
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
    setEditValue(
      category.spending 
        ? (category.spending.annual_spend_cents / 100).toString() 
        : ""
    );
  }

  async function saveEdit(categoryId: number) {
    startTransition(async () => {
      const supabase = createClient();
      const amountCents = Math.round(parseFloat(editValue || "0") * 100);
      
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;

      if (category.spending) {
        // Update existing
        await supabase
          .from("spending_defaults")
          .update({
            annual_spend_cents: amountCents,
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
          });
      }

      setEditingId(null);
      setEditValue("");
      loadData();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent, categoryId: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(categoryId);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  }

  const totalDefaultSpend = categories.reduce(
    (sum, c) => sum + (c.spending?.annual_spend_cents ?? 0),
    0
  );

  const groupedCategories = groupCategories(categories);

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
            Set default annual spending amounts for each category. Click any value to edit.
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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {groupedCategories.map((group) => (
              <>
                {/* Group header */}
                <tr key={`group-${group.name}`} className="bg-zinc-800/30">
                  <td colSpan={2} className="px-6 py-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                      {group.name}
                    </span>
                  </td>
                </tr>
                {/* Categories in group */}
                {group.categories.map((category) => (
                  <tr key={category.id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{getDisplayName(category)}</span>
                        {category.excluded_by_default && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-zinc-700 text-zinc-400">
                            Excluded
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === category.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-zinc-400">$</span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(category.id)}
                            onKeyDown={(e) => handleKeyDown(e, category.id)}
                            placeholder="0"
                            disabled={isPending}
                            className="w-28 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-right text-white text-sm focus:border-emerald-500 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(category)}
                          className="text-right hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <span className={category.spending?.annual_spend_cents ? "text-white" : "text-zinc-600"}>
                            {category.spending?.annual_spend_cents 
                              ? formatDollars(category.spending.annual_spend_cents)
                              : "$0"}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </>
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
