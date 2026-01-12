"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

export interface CardForProductChange {
  id: string;
  name: string;
  issuer_id: string;
  issuer_name: string;
  annual_fee: number;
  primary_currency_name: string | null;
}

export interface ClosedWalletCard {
  id: string;
  card_id: string;
  card_name: string;
  custom_name: string | null;
  approval_date: string | null;
  closed_date: string | null;
  closed_reason: string | null;
}

export interface CurrentWalletCard {
  id: string;
  card_id: string;
  custom_name: string | null;
  approval_date: string | null;
  player_number: number | null;
  issuer_id: string;
  card_name: string;
}

interface ProductChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Called after successful product change
  currentCard: CurrentWalletCard;
  allCards: CardForProductChange[];
  closedCards: ClosedWalletCard[];
  onProductChange: (data: {
    currentWalletId: string;
    newCardId: string;
    effectiveDate: string;
    customName: string | null;
    reactivateWalletId: string | null;
  }) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function ProductChangeModal({
  isOpen,
  onClose,
  onSuccess,
  currentCard,
  allCards,
  closedCards,
  onProductChange,
}: ProductChangeModalProps) {
  const [isPending, startTransition] = useTransition();
  
  // Step 1: Select new card
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // Step 2: Reactivation option
  const [reactivateOption, setReactivateOption] = useState<"new" | string>("new");
  // Step 3: Date and name
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nameOption, setNameOption] = useState<"keep" | "new" | "none">("none");
  const [newCustomName, setNewCustomName] = useState("");
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Filter cards to same issuer, excluding current card
  const eligibleCards = useMemo(() => {
    return allCards.filter(
      (card) =>
        card.issuer_id === currentCard.issuer_id &&
        card.id !== currentCard.card_id
    );
  }, [allCards, currentCard]);

  // Search through eligible cards
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return eligibleCards;
    const q = searchQuery.toLowerCase();
    return eligibleCards.filter(
      (card) =>
        card.name.toLowerCase().includes(q) ||
        card.primary_currency_name?.toLowerCase().includes(q)
    );
  }, [eligibleCards, searchQuery]);

  // Group by whether user has previously held this card
  const { availableForReactivation, previouslyNotHeld } = useMemo(() => {
    const reactivationOptions: ClosedWalletCard[] = [];
    const neverHeld: CardForProductChange[] = [];

    // Find closed wallet entries that match selected card
    if (selectedCardId) {
      const matchingClosed = closedCards.filter(
        (c) => c.card_id === selectedCardId
      );
      reactivationOptions.push(...matchingClosed);
    }

    // Cards never held are those where no closed entry exists
    filteredCards.forEach((card) => {
      const hasClosedEntry = closedCards.some((c) => c.card_id === card.id);
      if (!hasClosedEntry) {
        neverHeld.push(card);
      }
    });

    return {
      availableForReactivation: reactivationOptions,
      previouslyNotHeld: neverHeld,
    };
  }, [selectedCardId, closedCards, filteredCards]);

  const selectedCard = eligibleCards.find((c) => c.id === selectedCardId);
  
  // Determine if we're reactivating
  const isReactivating = reactivateOption !== "new" && availableForReactivation.length > 0;
  const reactivatingCard = isReactivating 
    ? availableForReactivation.find((c) => c.id === reactivateOption)
    : null;

  const handleSubmit = () => {
    if (!selectedCardId) return;
    
    let finalCustomName: string | null = null;
    if (nameOption === "keep" && currentCard.custom_name) {
      finalCustomName = currentCard.custom_name;
    } else if (nameOption === "new" && newCustomName.trim()) {
      finalCustomName = newCustomName.trim();
    }

    startTransition(async () => {
      await onProductChange({
        currentWalletId: currentCard.id,
        newCardId: selectedCardId,
        effectiveDate,
        customName: finalCustomName,
        reactivateWalletId: isReactivating ? reactivateOption : null,
      });
      onSuccess(); // Close everything after successful product change
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            Product Change
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Card Info */}
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Converting from</div>
            <div className="font-medium text-white">
              {currentCard.custom_name ?? currentCard.card_name}
            </div>
            {currentCard.custom_name && (
              <div className="text-sm text-zinc-400">{currentCard.card_name}</div>
            )}
          </div>

          {/* Step 1: Select New Card */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300">
              Select new card
            </h3>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />

            <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-700">
              {filteredCards.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No other cards from this issuer available
                </div>
              ) : (
                filteredCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedCardId(card.id);
                      setReactivateOption("new");
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors ${
                      selectedCardId === card.id
                        ? "bg-blue-600/20 border-l-2 border-blue-500"
                        : ""
                    }`}
                  >
                    <div className="font-medium text-white text-sm">
                      {card.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {card.primary_currency_name}
                      {card.annual_fee
                        ? ` • $${card.annual_fee}/yr`
                        : " • No annual fee"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Step 2: Reactivation Option (if applicable) */}
          {selectedCardId && availableForReactivation.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h3 className="text-sm font-medium text-amber-400">
                You previously held this card
              </h3>
              <p className="text-xs text-zinc-400">
                Reactivating will restore your original card opened date and credit history.
              </p>
              
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/50 cursor-pointer hover:bg-zinc-800">
                  <input
                    type="radio"
                    name="reactivate"
                    value="new"
                    checked={reactivateOption === "new"}
                    onChange={() => setReactivateOption("new")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm text-white">Start fresh</div>
                    <div className="text-xs text-zinc-500">
                      Create a new wallet entry without history
                    </div>
                  </div>
                </label>
                
                {availableForReactivation.map((closedCard) => (
                  <label
                    key={closedCard.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/50 cursor-pointer hover:bg-zinc-800"
                  >
                    <input
                      type="radio"
                      name="reactivate"
                      value={closedCard.id}
                      checked={reactivateOption === closedCard.id}
                      onChange={() => setReactivateOption(closedCard.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm text-white">
                        Reactivate {closedCard.custom_name ?? closedCard.card_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Opened {formatDate(closedCard.approval_date)}
                        {closedCard.closed_date && ` • Closed ${formatDate(closedCard.closed_date)}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date and Name Options */}
          {selectedCardId && (
            <div className="space-y-4">
              {/* Effective Date */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Product change date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Credits on the old card will end on this date
                </p>
              </div>

              {/* Custom Name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">
                  Card display name
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="nameOption"
                      value="none"
                      checked={nameOption === "none"}
                      onChange={() => setNameOption("none")}
                    />
                    <span className="text-sm text-zinc-300">
                      Use default name ({selectedCard?.name})
                    </span>
                  </label>
                  
                  {currentCard.custom_name && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nameOption"
                        value="keep"
                        checked={nameOption === "keep"}
                        onChange={() => setNameOption("keep")}
                      />
                      <span className="text-sm text-zinc-300">
                        Keep current name ({currentCard.custom_name})
                      </span>
                    </label>
                  )}
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="nameOption"
                      value="new"
                      checked={nameOption === "new"}
                      onChange={() => setNameOption("new")}
                    />
                    <span className="text-sm text-zinc-300">
                      Enter new name
                    </span>
                  </label>
                  
                  {nameOption === "new" && (
                    <input
                      type="text"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                      placeholder="Enter custom name..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none mt-2"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          {selectedCardId && (
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-start gap-2">
                <span className="text-amber-400">⚠️</span>
                <div className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">What happens:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Your current card will be archived (not deleted)</li>
                    <li>Credit history for the old card is preserved</li>
                    <li>Any linked Plaid account will transfer to the new card</li>
                    {isReactivating && reactivatingCard && (
                      <li className="text-amber-400">
                        Original opened date ({formatDate(reactivatingCard.approval_date)}) will be restored
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !selectedCardId}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Processing..." : "Product Change"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


