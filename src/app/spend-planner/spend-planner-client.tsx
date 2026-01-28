"use client";

import { useState, useMemo } from "react";
import { PlannedSpendingTable, type PlannedSpendingItem } from "./planned-spending-table";
import { CardGoalsTable, type CardGoal } from "./card-goals-table";
import { FeasibilityAnalysis } from "./feasibility-analysis";

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_category_id: number | null;
}

export interface WalletCard {
  id: string;
  card_id: string;
  custom_name: string | null;
  card_name: string;
  card_image: string | null;
  issuer_name: string;
  player_number: number | null;
}

export interface SpendBonus {
  id: string;
  wallet_card_id: string;
  name: string;
  threshold_cents: number;
  reward_value_cents: number;
}

interface SpendPlannerClientProps {
  categories: Category[];
  walletCards: WalletCard[];
  plannedSpending: PlannedSpendingItem[];
  cardGoals: CardGoal[];
  spendBonuses: SpendBonus[];
  currentYear: number;
  onAddPlannedSpending: (item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) => Promise<void>;
  onUpdatePlannedSpending: (id: string, item: {
    name: string;
    cost_percent: number | null;
    category_id: number | null;
    amount_cents: number;
    frequency: string;
    target_month: number | null;
    notes: string | null;
  }) => Promise<void>;
  onDeletePlannedSpending: (id: string) => Promise<void>;
  onAddCardGoal: (item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) => Promise<void>;
  onUpdateCardGoal: (id: string, item: {
    wallet_card_id: string;
    goal_type: string;
    target_amount_cents: number;
    bonus_id: string | null;
    notes: string | null;
  }) => Promise<void>;
  onDeleteCardGoal: (id: string) => Promise<void>;
}

export function SpendPlannerClient({
  categories,
  walletCards,
  plannedSpending,
  cardGoals,
  spendBonuses,
  currentYear,
  onAddPlannedSpending,
  onUpdatePlannedSpending,
  onDeletePlannedSpending,
  onAddCardGoal,
  onUpdateCardGoal,
  onDeleteCardGoal,
}: SpendPlannerClientProps) {
  const [activeTab, setActiveTab] = useState<"spending" | "goals" | "analysis">("spending");

  // Calculate totals for header
  const totalPlannedSpend = useMemo(() => {
    return plannedSpending.reduce((sum, item) => {
      if (item.frequency === "monthly") {
        return sum + item.amount_cents * 12;
      } else if (item.frequency === "annual") {
        return sum + item.amount_cents;
      } else {
        return sum + item.amount_cents;
      }
    }, 0);
  }, [plannedSpending]);

  const totalCardGoals = useMemo(() => {
    return cardGoals.reduce((sum, goal) => {
      if (goal.goal_type === "monthly_target") {
        return sum + goal.target_amount_cents * 12;
      } else {
        return sum + goal.target_amount_cents;
      }
    }, 0);
  }, [cardGoals]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const gap = totalCardGoals - totalPlannedSpend;
  const isFeasible = gap <= 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="text-sm text-zinc-400">Total Planned Spending</div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalPlannedSpend)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {plannedSpending.length} source{plannedSpending.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="text-sm text-zinc-400">Total Card Goals</div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalCardGoals)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {cardGoals.length} goal{cardGoals.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className={`bg-zinc-900 rounded-lg border p-4 ${
          isFeasible ? "border-green-700" : "border-red-700"
        }`}>
          <div className="text-sm text-zinc-400">Gap</div>
          <div className={`text-2xl font-bold mt-1 ${
            isFeasible ? "text-green-400" : "text-red-400"
          }`}>
            {gap > 0 ? "+" : ""}{formatCurrency(gap)}
          </div>
          <div className={`text-xs mt-1 ${
            isFeasible ? "text-green-500" : "text-red-500"
          }`}>
            {isFeasible
              ? "Goals fit within planned spending"
              : "Need more spending to hit goals"}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("spending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "spending"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Planned Spending
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "goals"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Card Goals
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "analysis"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Feasibility Analysis
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "spending" && (
        <PlannedSpendingTable
          items={plannedSpending}
          categories={categories}
          currentYear={currentYear}
          onAdd={onAddPlannedSpending}
          onUpdate={onUpdatePlannedSpending}
          onDelete={onDeletePlannedSpending}
        />
      )}

      {activeTab === "goals" && (
        <CardGoalsTable
          goals={cardGoals}
          walletCards={walletCards}
          spendBonuses={spendBonuses}
          currentYear={currentYear}
          onAdd={onAddCardGoal}
          onUpdate={onUpdateCardGoal}
          onDelete={onDeleteCardGoal}
        />
      )}

      {activeTab === "analysis" && (
        <FeasibilityAnalysis
          plannedSpending={plannedSpending}
          cardGoals={cardGoals}
          categories={categories}
          walletCards={walletCards}
        />
      )}
    </div>
  );
}
