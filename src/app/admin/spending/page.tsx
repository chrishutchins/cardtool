"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSupabaseClient } from "@/lib/supabase/client";
import { DataTable, DataTableColumn, Badge, formatCurrency } from "@/components/data-table";

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
  group: string;
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

function getDisplayName(category: { slug: string; name: string }): string {
  return DISPLAY_NAME_OVERRIDES[category.slug] || category.name;
}

function getCategoryGroup(slug: string): string {
  for (const group of CATEGORY_GROUPS) {
    if (group.slugs.includes(slug)) {
      return group.name;
    }
  }
  return "Other";
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
  
  // Use the authenticated Supabase client
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (supabase) {
      loadData();
    }
  }, [supabase]);

  async function loadData() {
    if (!supabase) return;
    
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

    // Filter out hidden categories and merge with spending data + group info
    const merged: CategoryWithSpending[] = categoriesData
      .filter((cat) => !HIDDEN_CATEGORY_SLUGS.includes(cat.slug))
      .map((cat) => ({
        ...cat,
        spending: spendingData.find((s) => s.category_id === cat.id),
        group: getCategoryGroup(cat.slug),
      }));

    // Sort by group order, then by name within group
    const groupOrder = CATEGORY_GROUPS.map(g => g.name);
    merged.sort((a, b) => {
      const aGroupIndex = groupOrder.indexOf(a.group);
      const bGroupIndex = groupOrder.indexOf(b.group);
      if (aGroupIndex !== bGroupIndex) {
        return aGroupIndex - bGroupIndex;
      }
      // Within same group, sort by the order in CATEGORY_GROUPS.slugs
      const groupSlugs = CATEGORY_GROUPS.find(g => g.name === a.group)?.slugs ?? [];
      const aSlugIndex = groupSlugs.indexOf(a.slug);
      const bSlugIndex = groupSlugs.indexOf(b.slug);
      if (aSlugIndex !== -1 && bSlugIndex !== -1) {
        return aSlugIndex - bSlugIndex;
      }
      return a.name.localeCompare(b.name);
    });

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
    if (!supabase) return;
    startTransition(async () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
      </div>
    );
  }

  const columns: DataTableColumn<CategoryWithSpending>[] = [
    {
      id: "category",
      label: "Category",
      accessor: "name",
      sticky: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{getDisplayName(row)}</span>
          {row.excluded_by_default && (
            <Badge variant="default">Excluded</Badge>
          )}
        </div>
      ),
    },
    {
      id: "group",
      label: "Group",
      accessor: "group",
      render: (row) => (
        <Badge variant="warning">{row.group}</Badge>
      ),
    },
    {
      id: "spend",
      label: "Default Annual Spend",
      accessor: (row) => row.spending?.annual_spend_cents ?? 0,
      align: "right",
      sortAccessor: (row) => row.spending?.annual_spend_cents ?? 0,
      render: (row) => {
        if (editingId === row.id) {
          return (
            <div className="flex items-center justify-end gap-1">
              <span className="text-zinc-400">$</span>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEdit(row.id)}
                onKeyDown={(e) => handleKeyDown(e, row.id)}
                placeholder="0"
                disabled={isPending}
                className="w-28 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-right text-white text-sm focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>
          );
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEdit(row);
            }}
            className="text-right hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <span className={row.spending?.annual_spend_cents ? "text-white" : "text-zinc-600"}>
              {row.spending?.annual_spend_cents 
                ? formatDollars(row.spending.annual_spend_cents)
                : "$0"}
            </span>
          </button>
        );
      },
    },
  ];

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

      <DataTable
        data={categories}
        columns={columns}
        keyAccessor={(row) => row.id.toString()}
        searchPlaceholder="Search categories..."
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return (
            row.name.toLowerCase().includes(q) ||
            row.slug.toLowerCase().includes(q) ||
            row.group.toLowerCase().includes(q) ||
            getDisplayName(row).toLowerCase().includes(q)
          );
        }}
        showColumnSelector={false}
        emptyMessage="No categories found."
      />
    </div>
  );
}
