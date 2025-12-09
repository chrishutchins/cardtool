"use client";

import { useState, useTransition } from "react";
import { Tables } from "@/lib/database.types";

interface WelcomeBonus {
  id: string;
  spend_requirement_cents: number;
  time_period_months: number;
  component_type: "points" | "cash" | "benefit";
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  default_benefit_value_cents: number | null;
  // Related data
  currency_name?: string;
}

interface WelcomeBonusEditorProps {
  bonuses: WelcomeBonus[];
  currencies: Tables<"reward_currencies">[];
  onAddBonus: (formData: FormData) => Promise<void>;
  onUpdateBonus: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteBonus: (bonusId: string) => Promise<void>;
}

const componentTypeLabels: Record<string, string> = {
  points: "Points",
  cash: "Cash/Statement Credit",
  benefit: "Benefit (user-valued)",
};

export function WelcomeBonusEditor({
  bonuses,
  currencies,
  onAddBonus,
  onUpdateBonus,
  onDeleteBonus,
}: WelcomeBonusEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);

  // New bonus form state
  const [componentType, setComponentType] = useState<"points" | "cash" | "benefit">("points");
  const [spendRequirement, setSpendRequirement] = useState("");
  const [timePeriod, setTimePeriod] = useState("3");
  const [pointsAmount, setPointsAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [benefitDescription, setBenefitDescription] = useState("");
  const [defaultBenefitValue, setDefaultBenefitValue] = useState("");

  // Edit form state
  const [editComponentType, setEditComponentType] = useState<"points" | "cash" | "benefit">("points");
  const [editSpendRequirement, setEditSpendRequirement] = useState("");
  const [editTimePeriod, setEditTimePeriod] = useState("3");
  const [editPointsAmount, setEditPointsAmount] = useState("");
  const [editCurrencyId, setEditCurrencyId] = useState("");
  const [editCashAmount, setEditCashAmount] = useState("");
  const [editBenefitDescription, setEditBenefitDescription] = useState("");
  const [editDefaultBenefitValue, setEditDefaultBenefitValue] = useState("");

  const resetForm = () => {
    setComponentType("points");
    setSpendRequirement("");
    setTimePeriod("3");
    setPointsAmount("");
    setCurrencyId("");
    setCashAmount("");
    setBenefitDescription("");
    setDefaultBenefitValue("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("component_type", componentType);
    formData.set("spend_requirement_cents", String(parseFloat(spendRequirement) * 100));
    formData.set("time_period_months", timePeriod);

    if (componentType === "points") {
      formData.set("points_amount", pointsAmount);
      formData.set("currency_id", currencyId);
    } else if (componentType === "cash") {
      formData.set("cash_amount_cents", String(parseFloat(cashAmount) * 100));
    } else {
      formData.set("benefit_description", benefitDescription);
      formData.set("default_benefit_value_cents", String(parseFloat(defaultBenefitValue) * 100));
    }

    startTransition(async () => {
      await onAddBonus(formData);
      setIsAdding(false);
      resetForm();
    });
  };

  const handleEdit = (bonus: WelcomeBonus) => {
    setEditingBonusId(bonus.id);
    setEditComponentType(bonus.component_type);
    setEditSpendRequirement(String(bonus.spend_requirement_cents / 100));
    setEditTimePeriod(String(bonus.time_period_months));
    setEditPointsAmount(bonus.points_amount?.toString() ?? "");
    setEditCurrencyId(bonus.currency_id ?? "");
    setEditCashAmount(bonus.cash_amount_cents ? String(bonus.cash_amount_cents / 100) : "");
    setEditBenefitDescription(bonus.benefit_description ?? "");
    setEditDefaultBenefitValue(bonus.default_benefit_value_cents ? String(bonus.default_benefit_value_cents / 100) : "");
  };

  const handleSaveEdit = (bonusId: string) => {
    const formData = new FormData();
    formData.set("component_type", editComponentType);
    formData.set("spend_requirement_cents", String(parseFloat(editSpendRequirement) * 100));
    formData.set("time_period_months", editTimePeriod);

    if (editComponentType === "points") {
      formData.set("points_amount", editPointsAmount);
      formData.set("currency_id", editCurrencyId);
    } else if (editComponentType === "cash") {
      formData.set("cash_amount_cents", String(parseFloat(editCashAmount) * 100));
    } else {
      formData.set("benefit_description", editBenefitDescription);
      formData.set("default_benefit_value_cents", String(parseFloat(editDefaultBenefitValue) * 100));
    }

    startTransition(async () => {
      await onUpdateBonus(bonusId, formData);
      setEditingBonusId(null);
    });
  };

  const handleDelete = (bonusId: string) => {
    startTransition(async () => {
      await onDeleteBonus(bonusId);
    });
  };

  const formatBonusValue = (bonus: WelcomeBonus) => {
    if (bonus.component_type === "points") {
      return `${bonus.points_amount?.toLocaleString()} ${bonus.currency_name ?? "points"}`;
    } else if (bonus.component_type === "cash") {
      return `$${((bonus.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
    } else {
      return bonus.benefit_description ?? "Benefit";
    }
  };

  // Group bonuses by spend requirement to show offer components together
  const groupedBonuses = bonuses.reduce((acc, bonus) => {
    const key = `${bonus.spend_requirement_cents}-${bonus.time_period_months}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(bonus);
    return acc;
  }, {} as Record<string, WelcomeBonus[]>);

  return (
    <div className="space-y-4">
      {/* Existing Bonuses */}
      {bonuses.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Bonus Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Time Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {bonuses.map((bonus) => (
                editingBonusId === bonus.id ? (
                  <tr key={bonus.id} className="bg-zinc-800/50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Component Type</label>
                            <select
                              value={editComponentType}
                              onChange={(e) => setEditComponentType(e.target.value as "points" | "cash" | "benefit")}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            >
                              {Object.entries(componentTypeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Spend Requirement ($)</label>
                            <input
                              type="number"
                              value={editSpendRequirement}
                              onChange={(e) => setEditSpendRequirement(e.target.value)}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Time Period (months)</label>
                            <input
                              type="number"
                              value={editTimePeriod}
                              onChange={(e) => setEditTimePeriod(e.target.value)}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                          {editComponentType === "points" && (
                            <>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Points Amount</label>
                                <input
                                  type="number"
                                  value={editPointsAmount}
                                  onChange={(e) => setEditPointsAmount(e.target.value)}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Currency</label>
                                <select
                                  value={editCurrencyId}
                                  onChange={(e) => setEditCurrencyId(e.target.value)}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                >
                                  <option value="">Select currency...</option>
                                  {currencies.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                          {editComponentType === "cash" && (
                            <div>
                              <label className="block text-xs text-zinc-400 mb-1">Cash Amount ($)</label>
                              <input
                                type="number"
                                value={editCashAmount}
                                onChange={(e) => setEditCashAmount(e.target.value)}
                                className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                              />
                            </div>
                          )}
                          {editComponentType === "benefit" && (
                            <>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Benefit Description</label>
                                <input
                                  type="text"
                                  value={editBenefitDescription}
                                  onChange={(e) => setEditBenefitDescription(e.target.value)}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Default Value ($)</label>
                                <input
                                  type="number"
                                  value={editDefaultBenefitValue}
                                  onChange={(e) => setEditDefaultBenefitValue(e.target.value)}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(bonus.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
                          >
                            {isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBonusId(null)}
                            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={bonus.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        bonus.component_type === "points" 
                          ? "bg-blue-700/50 text-blue-300"
                          : bonus.component_type === "cash"
                          ? "bg-green-700/50 text-green-300"
                          : "bg-purple-700/50 text-purple-300"
                      }`}>
                        {componentTypeLabels[bonus.component_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">{formatBonusValue(bonus)}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      Spend ${(bonus.spend_requirement_cents / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {bonus.time_period_months} month{bonus.time_period_months !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleEdit(bonus)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(bonus.id)}
                          disabled={isPending}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">No welcome bonus configured for this card.</p>
      )}

      {/* Add Bonus Form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="border border-zinc-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-white">Add Welcome Bonus Component</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Component Type</label>
              <select
                value={componentType}
                onChange={(e) => setComponentType(e.target.value as "points" | "cash" | "benefit")}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(componentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Spend Requirement ($)</label>
              <input
                type="number"
                value={spendRequirement}
                onChange={(e) => setSpendRequirement(e.target.value)}
                placeholder="e.g., 5000"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Time Period (months)</label>
              <input
                type="number"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                placeholder="e.g., 3"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {componentType === "points" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Points Amount</label>
                  <input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                    placeholder="e.g., 100000"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Currency</label>
                  <select
                    value={currencyId}
                    onChange={(e) => setCurrencyId(e.target.value)}
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select currency...</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {componentType === "cash" && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Cash Amount ($)</label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="e.g., 200"
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            )}

            {componentType === "benefit" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Benefit Description</label>
                  <input
                    type="text"
                    value={benefitDescription}
                    onChange={(e) => setBenefitDescription(e.target.value)}
                    placeholder="e.g., Free Night Certificate"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Default Value ($)</label>
                  <input
                    type="number"
                    value={defaultBenefitValue}
                    onChange={(e) => setDefaultBenefitValue(e.target.value)}
                    placeholder="e.g., 400"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <strong>Tip:</strong> A single welcome bonus offer can have multiple components. 
              For example: 100,000 points + $200 statement credit + Free Night Certificate all for spending $5,000 in 3 months.
              Add each component separately with the same spend requirement.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Adding..." : "Add Component"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Add Welcome Bonus Component
        </button>
      )}
    </div>
  );
}
