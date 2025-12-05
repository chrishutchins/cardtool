"use client";

import { useState } from "react";
import { Database } from "@/lib/database.types";

type CardWithCurrency = Database["public"]["Views"]["card_with_currency"]["Row"];

interface EnablersEditorProps {
  currentEnablerIds: string[];
  availableCards: CardWithCurrency[];
  onUpdate: (enablerIds: string[]) => Promise<void>;
}

export function EnablersEditor({
  currentEnablerIds,
  availableCards,
  onUpdate,
}: EnablersEditorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentEnablerIds));
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = 
    selectedIds.size !== currentEnablerIds.length ||
    !currentEnablerIds.every((id) => selectedIds.has(id));

  const handleToggle = (cardId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(Array.from(selectedIds));
    setIsSaving(false);
  };

  // Group cards by issuer
  const cardsByIssuer = availableCards.reduce((acc, card) => {
    const issuer = card.issuer_name ?? "Unknown";
    if (!acc[issuer]) acc[issuer] = [];
    acc[issuer].push(card);
    return acc;
  }, {} as Record<string, CardWithCurrency[]>);

  return (
    <div className="space-y-4">
      <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-700 divide-y divide-zinc-700">
        {Object.entries(cardsByIssuer).map(([issuer, cards]) => (
          <div key={issuer}>
            <div className="px-4 py-2 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase sticky top-0">
              {issuer}
            </div>
            {cards.map((card) => (
              <label
                key={card.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/30 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(card.id!)}
                  onChange={() => handleToggle(card.id!)}
                  className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-white">{card.name}</span>
                  <span className="text-zinc-500 text-sm ml-2">
                    {card.primary_currency_code}
                  </span>
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      )}
    </div>
  );
}

