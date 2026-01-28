"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddGoalModal } from "./add-goal-modal";
import type { WalletCard, SpendBonus } from "./spend-planner-client";

export interface CardGoal {
  id: string;
  wallet_card_id: string;
  goal_type: "annual_total" | "monthly_target" | "bonus_threshold";
  target_amount_cents: number;
  target_category_id: number | null;
  bonus_id: string | null;
  year: number;
  notes: string | null;
}

interface CardGoalsTableProps {
  goals: CardGoal[];
  walletCards: WalletCard[];
  spendBonuses: SpendBonus[];
  currentYear: number;
  onAdd: (item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) => Promise<void>;
  onUpdate: (id: string, item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CardGoalsTable({
  goals,
  walletCards,
  spendBonuses,
  currentYear,
  onAdd,
  onUpdate,
  onDelete,
}: CardGoalsTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<CardGoal | null>(null);
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

  const getCardInfo = (walletCardId: string) => {
    const card = walletCards.find(c => c.id === walletCardId);
    if (!card) return { name: "Unknown Card", issuer: "", player: null };
    const displayName = card.custom_name ?? card.card_name;
    return {
      name: displayName,
      issuer: card.issuer_name,
      player: card.player_number,
    };
  };

  const getBonusName = (bonusId: string | null) => {
    if (!bonusId) return null;
    const bonus = spendBonuses.find(b => b.id === bonusId);
    return bonus?.name ?? null;
  };

  const getGoalTypeLabel = (goalType: string, bonusId: string | null) => {
    if (bonusId) {
      const bonusName = getBonusName(bonusId);
      return bonusName ? `Bonus: ${bonusName}` : "Bonus Threshold";
    }
    switch (goalType) {
      case "annual_total":
        return "Annual Total";
      case "monthly_target":
        return "Monthly Target";
      case "bonus_threshold":
        return "Bonus Threshold";
      default:
        return goalType;
    }
  };

  const getAnnualAmount = (goal: CardGoal) => {
    if (goal.goal_type === "monthly_target") {
      return goal.target_amount_cents * 12;
    }
    return goal.target_amount_cents;
  };

  const handleEdit = (goal: CardGoal) => {
    setEditGoal(goal);
    setShowModal(true);
  };

  const handleSave = async (data: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) => {
    if (editGoal) {
      await onUpdate(editGoal.id, data);
    } else {
      await onAdd(data);
    }
    setEditGoal(null);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      await onDelete(id);
      setDeletingId(null);
    });
  };

  // Calculate totals
  const totalAnnual = goals.reduce((sum, goal) => sum + getAnnualAmount(goal), 0);

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Card Spend Goals</h2>
          <p className="text-sm text-zinc-400">
            Set spending targets for each card
          </p>
        </div>
        <Button
          onClick={() => {
            setEditGoal(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-zinc-500">No card goals set yet.</p>
          <p className="text-sm text-zinc-600 mt-1">
            Add goals to track how much you want to spend on each card.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left p-3 font-medium">Card</th>
                <th className="text-left p-3 font-medium">Goal Type</th>
                <th className="text-right p-3 font-medium">Target</th>
                <th className="text-right p-3 font-medium">Annual</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const cardInfo = getCardInfo(goal.wallet_card_id);
                return (
                  <tr
                    key={goal.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="p-3">
                      <div className="text-white font-medium">{cardInfo.name}</div>
                      <div className="text-xs text-zinc-500">
                        {cardInfo.issuer}
                        {cardInfo.player && cardInfo.player > 1 && (
                          <span className="ml-1 text-zinc-600">P{cardInfo.player}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-zinc-300">
                        {getGoalTypeLabel(goal.goal_type, goal.bonus_id)}
                      </div>
                      {goal.notes && (
                        <div className="text-xs text-zinc-500 mt-0.5">{goal.notes}</div>
                      )}
                    </td>
                    <td className="p-3 text-sm text-right text-zinc-300">
                      {formatCurrency(goal.target_amount_cents)}
                      {goal.goal_type === "monthly_target" && (
                        <span className="text-zinc-500">/mo</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-right font-medium text-white">
                      {formatCurrency(getAnnualAmount(goal))}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          disabled={deletingId === goal.id || isPending}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700">
                <td colSpan={3} className="p-3 text-right text-sm text-zinc-400">
                  Total Annual:
                </td>
                <td className="p-3 text-right text-lg font-bold text-white">
                  {formatCurrency(totalAnnual)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AddGoalModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditGoal(null);
        }}
        onSave={handleSave}
        walletCards={walletCards}
        spendBonuses={spendBonuses}
        editGoal={editGoal}
      />
    </div>
  );
}
