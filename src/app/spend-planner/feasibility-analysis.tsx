"use client";

import { useMemo } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { Category, WalletCard } from "./spend-planner-client";
import type { PlannedSpendingItem } from "./planned-spending-table";
import type { CardGoal } from "./card-goals-table";

interface FeasibilityAnalysisProps {
  plannedSpending: PlannedSpendingItem[];
  cardGoals: CardGoal[];
  categories: Category[];
  walletCards: WalletCard[];
}

export function FeasibilityAnalysis({
  plannedSpending,
  cardGoals,
  categories,
  walletCards,
}: FeasibilityAnalysisProps) {
  // Calculate spend by category
  const spendByCategory = useMemo(() => {
    const result = new Map<number | null, number>();
    
    plannedSpending.forEach(item => {
      const annualAmount = item.frequency === "monthly"
        ? item.amount_cents * 12
        : item.amount_cents;
      
      const current = result.get(item.category_id) ?? 0;
      result.set(item.category_id, current + annualAmount);
    });
    
    return result;
  }, [plannedSpending]);

  // Build category breakdown for planned spending
  const categoryBreakdown = useMemo(() => {
    const breakdown: Array<{
      categoryId: number | null;
      categoryName: string;
      plannedSpend: number;
    }> = [];

    spendByCategory.forEach((plannedSpend, categoryId) => {
      if (plannedSpend > 0) {
        breakdown.push({
          categoryId,
          categoryName: categoryId
            ? categories.find(c => c.id === categoryId)?.name ?? "Unknown"
            : "Uncategorized",
          plannedSpend,
        });
      }
    });

    // Sort by amount (largest first)
    breakdown.sort((a, b) => b.plannedSpend - a.plannedSpend);

    return breakdown;
  }, [spendByCategory, categories]);

  // Calculate goals by card
  const goalsByCard = useMemo(() => {
    const result = new Map<string, {
      card: WalletCard;
      goals: CardGoal[];
      totalAnnual: number;
    }>();

    cardGoals.forEach(goal => {
      const card = walletCards.find(c => c.id === goal.wallet_card_id);
      if (!card) return;

      if (!result.has(goal.wallet_card_id)) {
        result.set(goal.wallet_card_id, {
          card,
          goals: [],
          totalAnnual: 0,
        });
      }

      const entry = result.get(goal.wallet_card_id)!;
      entry.goals.push(goal);
      entry.totalAnnual += goal.goal_type === "monthly_target"
        ? goal.target_amount_cents * 12
        : goal.target_amount_cents;
    });

    return Array.from(result.values()).sort((a, b) => b.totalAnnual - a.totalAnnual);
  }, [cardGoals, walletCards]);

  // Overall totals
  const totalPlannedSpend = useMemo(() => {
    let total = 0;
    spendByCategory.forEach(amount => {
      total += amount;
    });
    return total;
  }, [spendByCategory]);

  const totalGoals = useMemo(() => {
    return cardGoals.reduce((sum, goal) => {
      const annualAmount = goal.goal_type === "monthly_target"
        ? goal.target_amount_cents * 12
        : goal.target_amount_cents;
      return sum + annualAmount;
    }, 0);
  }, [cardGoals]);

  const overallGap = totalGoals - totalPlannedSpend;
  const isOverallFeasible = overallGap <= 0;
  const excessSpend = isOverallFeasible ? -overallGap : 0;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className={`bg-zinc-900 rounded-lg border p-6 ${
        isOverallFeasible ? "border-green-700" : "border-red-700"
      }`}>
        <div className="flex items-center gap-4">
          {isOverallFeasible ? (
            <CheckCircle className="h-12 w-12 text-green-400" />
          ) : (
            <XCircle className="h-12 w-12 text-red-400" />
          )}
          <div>
            <h2 className={`text-2xl font-bold ${
              isOverallFeasible ? "text-green-400" : "text-red-400"
            }`}>
              {isOverallFeasible ? "Plan is Feasible" : "Plan Exceeds Budget"}
            </h2>
            <p className="text-zinc-400 mt-1">
              {isOverallFeasible
                ? `You have ${formatCurrency(-overallGap)} more spending than goals require`
                : `You need ${formatCurrency(overallGap)} more spending to meet all goals`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <div className="text-sm text-zinc-400">Planned Spending</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(totalPlannedSpend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Card Goals</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(totalGoals)}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">
              {isOverallFeasible ? "Available to Optimize" : "Additional Needed"}
            </div>
            <div className={`text-xl font-bold ${isOverallFeasible ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(isOverallFeasible ? excessSpend : overallGap)}
            </div>
          </div>
        </div>
      </div>

      {/* Planned Spending by Category */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Planned Spending by Category</h3>
          <p className="text-sm text-zinc-400">
            Your spending sources broken down by MCC category
          </p>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No planned spending added yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Annual Amount</th>
                  <th className="text-right p-3 font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((row) => (
                  <tr
                    key={row.categoryId ?? "uncategorized"}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="p-3 text-white font-medium">
                      {row.categoryName}
                    </td>
                    <td className="p-3 text-right text-zinc-300">
                      {formatCurrency(row.plannedSpend)}
                    </td>
                    <td className="p-3 text-right text-zinc-400">
                      {totalPlannedSpend > 0 
                        ? ((row.plannedSpend / totalPlannedSpend) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card Summary */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">By Card</h3>
          <p className="text-sm text-zinc-400">
            Total goals per card
          </p>
        </div>

        {goalsByCard.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No card goals to display
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {goalsByCard.map(({ card, goals, totalAnnual }) => (
              <div
                key={card.id}
                className="bg-zinc-800/50 rounded-lg p-4"
              >
                <div className="font-medium text-white">
                  {card.custom_name ?? card.card_name}
                </div>
                <div className="text-xs text-zinc-500">
                  {card.issuer_name}
                  {card.player_number && card.player_number > 1 && (
                    <span className="ml-1">P{card.player_number}</span>
                  )}
                </div>
                <div className="text-xl font-bold text-white mt-2">
                  {formatCurrency(totalAnnual)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {goals.length} goal{goals.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
