"use client";

import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WalletCard, SpendBonus } from "./spend-planner-client";
import type { CardGoal } from "./card-goals-table";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) => Promise<void>;
  walletCards: WalletCard[];
  spendBonuses: SpendBonus[];
  editGoal?: CardGoal | null;
}

export function AddGoalModal({
  isOpen,
  onClose,
  onSave,
  walletCards,
  spendBonuses,
  editGoal,
}: AddGoalModalProps) {
  const [walletCardId, setWalletCardId] = useState("");
  const [goalType, setGoalType] = useState<"annual_total" | "monthly_target" | "bonus_threshold">("annual_total");
  const [amountStr, setAmountStr] = useState("");
  const [bonusId, setBonusId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or editGoal changes
  useEffect(() => {
    if (isOpen) {
      setWalletCardId(editGoal?.wallet_card_id ?? "");
      setGoalType(editGoal?.goal_type ?? "annual_total");
      setAmountStr(editGoal ? (editGoal.target_amount_cents / 100).toString() : "");
      setBonusId(editGoal?.bonus_id ?? null);
      setNotes(editGoal?.notes ?? "");
      setError(null);
    }
  }, [isOpen, editGoal]);

  // Get bonuses for selected card
  const cardBonuses = useMemo(() => {
    if (!walletCardId) return [];
    return spendBonuses.filter(b => b.wallet_card_id === walletCardId);
  }, [walletCardId, spendBonuses]);

  // Group cards by issuer - must be before early return to maintain hook order
  const cardsByIssuer = useMemo(() => {
    const grouped = new Map<string, WalletCard[]>();
    walletCards.forEach(card => {
      const issuer = card.issuer_name || "Other";
      if (!grouped.has(issuer)) {
        grouped.set(issuer, []);
      }
      grouped.get(issuer)!.push(card);
    });
    return grouped;
  }, [walletCards]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!walletCardId) {
      setError("Please select a card");
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
      await onSave({
        wallet_card_id: walletCardId,
        goal_type: goalType,
        target_amount_cents: Math.round(amount * 100),
        bonus_id: goalType === "bonus_threshold" ? bonusId : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
          {editGoal ? "Edit Card Goal" : "Add Card Goal"}
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="card" className="text-zinc-300">
              Card
            </Label>
            <select
              id="card"
              value={walletCardId}
              onChange={(e) => {
                setWalletCardId(e.target.value);
                setBonusId(null); // Reset bonus when card changes
              }}
              className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            >
              <option value="">Select a card</option>
              {Array.from(cardsByIssuer.entries()).map(([issuer, cards]) => (
                <optgroup key={issuer} label={issuer}>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.custom_name ?? card.card_name}
                      {card.player_number && card.player_number > 1 ? ` (P${card.player_number})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="goalType" className="text-zinc-300">
                Goal Type
              </Label>
              <select
                id="goalType"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as "annual_total" | "monthly_target" | "bonus_threshold")}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="annual_total">Annual Total</option>
                <option value="monthly_target">Monthly Target</option>
                <option value="bonus_threshold">Bonus Threshold</option>
              </select>
            </div>

            <div>
              <Label htmlFor="amount" className="text-zinc-300">
                {goalType === "monthly_target" ? "Monthly Amount" : "Amount"}
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

          {goalType === "bonus_threshold" && cardBonuses.length > 0 && (
            <div>
              <Label htmlFor="bonus" className="text-zinc-300">
                Link to Spend Bonus (optional)
              </Label>
              <select
                id="bonus"
                value={bonusId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setBonusId(id);
                  // Auto-fill amount from bonus threshold
                  if (id) {
                    const bonus = cardBonuses.find(b => b.id === id);
                    if (bonus) {
                      setAmountStr((bonus.threshold_cents / 100).toString());
                    }
                  }
                }}
                className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">No linked bonus</option>
                {cardBonuses.map((bonus) => (
                  <option key={bonus.id} value={bonus.id}>
                    {bonus.name} (${(bonus.threshold_cents / 100).toLocaleString()} threshold)
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
              {isSaving ? "Saving..." : editGoal ? "Save Changes" : "Add Goal"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
