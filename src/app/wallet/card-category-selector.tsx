"use client";

import { useTransition } from "react";

interface CapWithCategories {
  id: string;
  cap_type: string;
  cap_amount: number | null;
  categories: { id: number; name: string }[];
}

interface CardCategorySelectorProps {
  cardId: string;
  cardName: string;
  walletCardId?: string; // Optional - for per-wallet-card selections
  caps: CapWithCategories[];
  userSelections: { cap_id: string; selected_category_id: number; wallet_card_id?: string | null }[];
  onSelectCategory: (capId: string, categoryId: number, walletCardId?: string) => Promise<void>;
  compact?: boolean; // For use in modal
}

export function CardCategorySelector({
  cardId,
  cardName,
  walletCardId,
  caps,
  userSelections,
  onSelectCategory,
  compact = false,
}: CardCategorySelectorProps) {
  const [isPending, startTransition] = useTransition();

  // Filter to only show selected_category caps
  const selectableCaps = caps.filter((cap) => cap.cap_type === "selected_category");

  if (selectableCaps.length === 0) return null;

  const handleSelect = (capId: string, categoryId: number) => {
    startTransition(async () => {
      await onSelectCategory(capId, categoryId, walletCardId);
    });
  };

  // Filter selections for this wallet card (if specified) or legacy (null wallet_card_id)
  const relevantSelections = userSelections.filter(s => 
    walletCardId 
      ? s.wallet_card_id === walletCardId || (s.wallet_card_id === null && !userSelections.some(x => x.cap_id === s.cap_id && x.wallet_card_id === walletCardId))
      : true
  );

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {selectableCaps.map((cap) => {
        // Find selection for this cap, preferring wallet-specific selection
        const walletSpecificSelection = relevantSelections.find(
          s => s.cap_id === cap.id && s.wallet_card_id === walletCardId
        );
        const legacySelection = relevantSelections.find(
          s => s.cap_id === cap.id && !s.wallet_card_id
        );
        const currentSelection = walletSpecificSelection || legacySelection;
        
        return (
          <div key={cap.id} className={compact ? "" : "rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"}>
            {!compact && (
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-white">{cardName}</span>
                  <span className="text-xs text-zinc-500 ml-2">
                    Select one category for bonus rate
                    {cap.cap_amount && ` (up to $${cap.cap_amount.toLocaleString()}/yr)`}
                  </span>
                </div>
              </div>
            )}
            {compact && (
              <p className="text-xs text-zinc-400 mb-2">
                Select category for bonus rate
                {cap.cap_amount && ` (up to $${cap.cap_amount.toLocaleString()}/yr)`}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {cap.categories.map((cat) => {
                const isSelected = currentSelection?.selected_category_id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cap.id, cat.id)}
                    disabled={isPending}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    } disabled:opacity-50`}
                  >
                    {cat.name}
                    {isSelected && " ✓"}
                  </button>
                );
              })}
            </div>
            {!currentSelection && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠ Select a category to activate the bonus rate
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

