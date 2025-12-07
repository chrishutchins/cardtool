"use client";

import { useState, useOptimistic, useTransition } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface LargePurchaseCategoriesProps {
  categories: Category[];
  selectedCategoryIds: number[];
  everythingElseCategoryId: number | null;
  onToggleCategory: (categoryId: number, selected: boolean) => Promise<void>;
}

export function LargePurchaseCategories({
  categories,
  selectedCategoryIds,
  everythingElseCategoryId,
  onToggleCategory,
}: LargePurchaseCategoriesProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticSelected, setOptimisticSelected] = useOptimistic(
    new Set(selectedCategoryIds),
    (state: Set<number>, { categoryId, selected }: { categoryId: number; selected: boolean }) => {
      const newSet = new Set(state);
      if (selected) {
        newSet.add(categoryId);
      } else {
        newSet.delete(categoryId);
      }
      return newSet;
    }
  );

  const handleToggle = (categoryId: number, selected: boolean) => {
    startTransition(async () => {
      setOptimisticSelected({ categoryId, selected });
      await onToggleCategory(categoryId, selected);
    });
  };

  // Sort categories with Everything Else first, then alphabetically
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.id === everythingElseCategoryId) return -1;
    if (b.id === everythingElseCategoryId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Enable &gt;$5k tracking for categories where you make large purchases. 
        This helps calculate earnings more accurately for cards with &gt;$5k bonuses.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {sortedCategories.map((category) => {
          const isSelected = optimisticSelected.has(category.id);
          const isEverythingElse = category.id === everythingElseCategoryId;
          
          return (
            <label
              key={category.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                isSelected
                  ? "border-emerald-600 bg-emerald-950/30"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              } ${isPending ? "opacity-70" : ""}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleToggle(category.id, e.target.checked)}
                disabled={isPending}
                className="rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className={`text-sm ${isSelected ? "text-white" : "text-zinc-300"}`}>
                {category.name}
                {isEverythingElse && (
                  <span className="text-xs text-zinc-500 ml-1">(default)</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {optimisticSelected.size === 0 && (
        <p className="text-xs text-amber-400 mt-2">
          ⚠️ No categories selected. Select at least one category to track large purchases.
        </p>
      )}
    </div>
  );
}

