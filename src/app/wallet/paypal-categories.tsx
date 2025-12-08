"use client";

import { useState, useTransition, useOptimistic } from "react";

interface PaypalCategoriesProps {
  categories: { id: number; name: string; slug: string }[];
  selectedCategoryIds: number[];
  onToggleCategory: (categoryId: number, selected: boolean) => Promise<void>;
}

export function PaypalCategories({
  categories,
  selectedCategoryIds,
  onToggleCategory,
}: PaypalCategoriesProps) {
  const [isPending, startTransition] = useTransition();
  
  // Use optimistic updates for instant UI feedback
  const [optimisticSelected, setOptimisticSelected] = useOptimistic(
    selectedCategoryIds,
    (current: number[], { categoryId, selected }: { categoryId: number; selected: boolean }) => {
      if (selected) {
        return [...current, categoryId];
      } else {
        return current.filter(id => id !== categoryId);
      }
    }
  );
  
  const selectedSet = new Set(optimisticSelected);

  const handleToggle = (categoryId: number) => {
    const isSelected = selectedSet.has(categoryId);
    const newSelected = !isSelected;
    
    startTransition(async () => {
      // Optimistically update UI immediately
      setOptimisticSelected({ categoryId, selected: newSelected });
      // Then persist to server (no need to wait for revalidation)
      await onToggleCategory(categoryId, newSelected);
    });
  };

  // Common categories that make sense for PayPal
  const suggestedCategories = ["online-retail", "amazon"];
  
  // Sort categories: suggested first, then alphabetically
  const sortedCategories = [...categories].sort((a, b) => {
    const aIsSuggested = suggestedCategories.includes(a.slug);
    const bIsSuggested = suggestedCategories.includes(b.slug);
    if (aIsSuggested && !bIsSuggested) return -1;
    if (!aIsSuggested && bIsSuggested) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Select categories where you typically pay through PayPal. 
        Cards with PayPal bonuses will earn their elevated rate on these categories.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {sortedCategories.map((category) => {
          const isSelected = selectedSet.has(category.id);
          const isSuggested = suggestedCategories.includes(category.slug);
          
          return (
            <button
              key={category.id}
              onClick={() => handleToggle(category.id)}
              disabled={isPending}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="flex items-center gap-2">
                {isSelected && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {category.name}
                {isSuggested && !isSelected && (
                  <span className="text-xs text-zinc-500">★</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      
      {selectedCategoryIds.length > 0 && (
        <p className="text-xs text-zinc-500 mt-2">
          {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? "y" : "ies"} selected
        </p>
      )}
    </div>
  );
}

