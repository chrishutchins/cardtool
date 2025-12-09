"use client";

import { useState, useTransition } from "react";
import { Tables } from "@/lib/database.types";

interface SpendBonus {
  id: string;
  name: string;
  bonus_type: "threshold" | "elite_earning";
  // Threshold fields
  spend_threshold_cents: number | null;
  reward_type: "points" | "cash" | "benefit" | null;
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  default_value_cents: number | null;
  period: "year" | "calendar_year" | "lifetime" | null;
  // Elite earning fields
  per_spend_cents: number | null;
  elite_unit_name: string | null;
  default_unit_value_cents: number | null;
  cap_amount: number | null;
  cap_period: "year" | "calendar_year" | null;
  // Related data
  currency_name?: string;
}

interface SpendBonusEditorProps {
  bonuses: SpendBonus[];
  currencies: Tables<"reward_currencies">[];
  onAddBonus: (formData: FormData) => Promise<void>;
  onUpdateBonus: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteBonus: (bonusId: string) => Promise<void>;
}

const periodLabels: Record<string, string> = {
  year: "Per Year",
  calendar_year: "Per Calendar Year",
  lifetime: "Lifetime (one-time)",
};

const rewardTypeLabels: Record<string, string> = {
  points: "Points",
  cash: "Cash",
  benefit: "Benefit (user-valued)",
};

export function SpendBonusEditor({
  bonuses,
  currencies,
  onAddBonus,
  onUpdateBonus,
  onDeleteBonus,
}: SpendBonusEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);

  // New bonus form state
  const [bonusType, setBonusType] = useState<"threshold" | "elite_earning">("threshold");
  const [name, setName] = useState("");
  // Threshold fields
  const [spendThreshold, setSpendThreshold] = useState("");
  const [rewardType, setRewardType] = useState<"points" | "cash" | "benefit">("benefit");
  const [pointsAmount, setPointsAmount] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [benefitDescription, setBenefitDescription] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [period, setPeriod] = useState<"year" | "calendar_year" | "lifetime">("year");
  // Elite earning fields
  const [perSpend, setPerSpend] = useState("");
  const [eliteUnitName, setEliteUnitName] = useState("");
  const [defaultUnitValue, setDefaultUnitValue] = useState("");
  const [capAmount, setCapAmount] = useState("");
  const [capPeriod, setCapPeriod] = useState<"year" | "calendar_year" | "">("year");

  // Edit form state (mirrored)
  const [editBonusType, setEditBonusType] = useState<"threshold" | "elite_earning">("threshold");
  const [editName, setEditName] = useState("");
  const [editSpendThreshold, setEditSpendThreshold] = useState("");
  const [editRewardType, setEditRewardType] = useState<"points" | "cash" | "benefit">("benefit");
  const [editPointsAmount, setEditPointsAmount] = useState("");
  const [editCurrencyId, setEditCurrencyId] = useState("");
  const [editCashAmount, setEditCashAmount] = useState("");
  const [editBenefitDescription, setEditBenefitDescription] = useState("");
  const [editDefaultValue, setEditDefaultValue] = useState("");
  const [editPeriod, setEditPeriod] = useState<"year" | "calendar_year" | "lifetime">("year");
  const [editPerSpend, setEditPerSpend] = useState("");
  const [editEliteUnitName, setEditEliteUnitName] = useState("");
  const [editDefaultUnitValue, setEditDefaultUnitValue] = useState("");
  const [editCapAmount, setEditCapAmount] = useState("");
  const [editCapPeriod, setEditCapPeriod] = useState<"year" | "calendar_year" | "">("year");

  const resetForm = () => {
    setBonusType("threshold");
    setName("");
    setSpendThreshold("");
    setRewardType("benefit");
    setPointsAmount("");
    setCurrencyId("");
    setCashAmount("");
    setBenefitDescription("");
    setDefaultValue("");
    setPeriod("year");
    setPerSpend("");
    setEliteUnitName("");
    setDefaultUnitValue("");
    setCapAmount("");
    setCapPeriod("year");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("bonus_type", bonusType);
    formData.set("name", name);

    if (bonusType === "threshold") {
      formData.set("spend_threshold_cents", String(parseFloat(spendThreshold) * 100));
      formData.set("reward_type", rewardType);
      formData.set("period", period);
      if (rewardType === "points") {
        formData.set("points_amount", pointsAmount);
        formData.set("currency_id", currencyId);
      } else if (rewardType === "cash") {
        formData.set("cash_amount_cents", String(parseFloat(cashAmount) * 100));
      } else {
        formData.set("benefit_description", benefitDescription);
        formData.set("default_value_cents", String(parseFloat(defaultValue) * 100));
      }
    } else {
      formData.set("per_spend_cents", String(parseFloat(perSpend) * 100));
      formData.set("elite_unit_name", eliteUnitName);
      // User enters value in cents directly, don't multiply by 100
      formData.set("default_unit_value_cents", String(parseFloat(defaultUnitValue)));
      if (capAmount) {
        formData.set("cap_amount", capAmount);
        formData.set("cap_period", capPeriod || "year");
      }
    }

    startTransition(async () => {
      try {
        await onAddBonus(formData);
        setIsAdding(false);
        resetForm();
      } catch (error) {
        console.error("Failed to add spend bonus:", error);
      }
    });
  };

  const handleEdit = (bonus: SpendBonus) => {
    setEditingBonusId(bonus.id);
    setEditBonusType(bonus.bonus_type);
    setEditName(bonus.name);
    
    if (bonus.bonus_type === "threshold") {
      setEditSpendThreshold(bonus.spend_threshold_cents ? String(bonus.spend_threshold_cents / 100) : "");
      setEditRewardType(bonus.reward_type ?? "benefit");
      setEditPointsAmount(bonus.points_amount?.toString() ?? "");
      setEditCurrencyId(bonus.currency_id ?? "");
      setEditCashAmount(bonus.cash_amount_cents ? String(bonus.cash_amount_cents / 100) : "");
      setEditBenefitDescription(bonus.benefit_description ?? "");
      setEditDefaultValue(bonus.default_value_cents ? String(bonus.default_value_cents / 100) : "");
      setEditPeriod(bonus.period ?? "year");
    } else {
      setEditPerSpend(bonus.per_spend_cents ? String(bonus.per_spend_cents / 100) : "");
      setEditEliteUnitName(bonus.elite_unit_name ?? "");
      // Value is stored in cents directly, no conversion needed
      setEditDefaultUnitValue(bonus.default_unit_value_cents ? String(bonus.default_unit_value_cents) : "");
      setEditCapAmount(bonus.cap_amount?.toString() ?? "");
      setEditCapPeriod(bonus.cap_period ?? "year");
    }
  };

  const handleSaveEdit = (bonusId: string) => {
    const formData = new FormData();
    formData.set("bonus_type", editBonusType);
    formData.set("name", editName);

    if (editBonusType === "threshold") {
      formData.set("spend_threshold_cents", String(parseFloat(editSpendThreshold) * 100));
      formData.set("reward_type", editRewardType);
      formData.set("period", editPeriod);
      if (editRewardType === "points") {
        formData.set("points_amount", editPointsAmount);
        formData.set("currency_id", editCurrencyId);
      } else if (editRewardType === "cash") {
        formData.set("cash_amount_cents", String(parseFloat(editCashAmount) * 100));
      } else {
        formData.set("benefit_description", editBenefitDescription);
        formData.set("default_value_cents", String(parseFloat(editDefaultValue) * 100));
      }
    } else {
      formData.set("per_spend_cents", String(parseFloat(editPerSpend) * 100));
      formData.set("elite_unit_name", editEliteUnitName);
      // User enters value in cents directly, don't multiply by 100
      formData.set("default_unit_value_cents", String(parseFloat(editDefaultUnitValue)));
      if (editCapAmount) {
        formData.set("cap_amount", editCapAmount);
        formData.set("cap_period", editCapPeriod || "year");
      }
    }

    startTransition(async () => {
      try {
        await onUpdateBonus(bonusId, formData);
        setEditingBonusId(null);
      } catch (error) {
        console.error("Failed to update spend bonus:", error);
      }
    });
  };

  const handleDelete = (bonusId: string) => {
    startTransition(async () => {
      await onDeleteBonus(bonusId);
    });
  };

  const formatReward = (bonus: SpendBonus) => {
    if (bonus.bonus_type === "threshold") {
      if (bonus.reward_type === "points") {
        return `${bonus.points_amount?.toLocaleString()} ${bonus.currency_name ?? "points"}`;
      } else if (bonus.reward_type === "cash") {
        return `$${((bonus.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
      } else {
        return bonus.benefit_description ?? "Benefit";
      }
    } else {
      return `1 ${bonus.elite_unit_name} per $${((bonus.per_spend_cents ?? 0) / 100).toFixed(0)}`;
    }
  };

  const formatDefaultValue = (bonus: SpendBonus) => {
    if (bonus.bonus_type === "threshold" && bonus.reward_type === "benefit") {
      return `$${((bonus.default_value_cents ?? 0) / 100).toLocaleString()}`;
    } else if (bonus.bonus_type === "elite_earning") {
      // Value is stored in cents directly (e.g., 1.5 = 1.5¢)
      return `${(bonus.default_unit_value_cents ?? 0).toFixed(2)}¢ per unit`;
    }
    return "-";
  };

  return (
    <div className="space-y-4">
      {/* Existing Bonuses */}
      {bonuses.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Reward</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Default Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {bonuses.map((bonus) => (
                editingBonusId === bonus.id ? (
                  <tr key={bonus.id} className="bg-zinc-800/50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Type</label>
                            <select
                              value={editBonusType}
                              onChange={(e) => setEditBonusType(e.target.value as "threshold" | "elite_earning")}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            >
                              <option value="threshold">Threshold (spend X → get Y)</option>
                              <option value="elite_earning">Elite Earning (earn per $X)</option>
                            </select>
                          </div>

                          {editBonusType === "threshold" ? (
                            <>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Spend Threshold ($)</label>
                                <input
                                  type="number"
                                  value={editSpendThreshold}
                                  onChange={(e) => setEditSpendThreshold(e.target.value)}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Reward Type</label>
                                <select
                                  value={editRewardType}
                                  onChange={(e) => setEditRewardType(e.target.value as "points" | "cash" | "benefit")}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                >
                                  {Object.entries(rewardTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Period</label>
                                <select
                                  value={editPeriod}
                                  onChange={(e) => setEditPeriod(e.target.value as "year" | "calendar_year" | "lifetime")}
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                >
                                  {Object.entries(periodLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              {editRewardType === "points" && (
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
                              {editRewardType === "cash" && (
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
                              {editRewardType === "benefit" && (
                                <>
                                  <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Benefit Description</label>
                                    <input
                                      type="text"
                                      value={editBenefitDescription}
                                      onChange={(e) => setEditBenefitDescription(e.target.value)}
                                      placeholder="e.g., Free Night Certificate"
                                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Default Value ($)</label>
                                    <input
                                      type="number"
                                      value={editDefaultValue}
                                      onChange={(e) => setEditDefaultValue(e.target.value)}
                                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Earn per ($)</label>
                                <input
                                  type="number"
                                  value={editPerSpend}
                                  onChange={(e) => setEditPerSpend(e.target.value)}
                                  placeholder="e.g., 2 for $2"
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Unit Name</label>
                                <input
                                  type="text"
                                  value={editEliteUnitName}
                                  onChange={(e) => setEditEliteUnitName(e.target.value)}
                                  placeholder="e.g., PQP, Elite Mile"
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Default Unit Value (cents)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editDefaultUnitValue}
                                  onChange={(e) => setEditDefaultUnitValue(e.target.value)}
                                  placeholder="e.g., 1 for 1 cent"
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Cap (units, optional)</label>
                                <input
                                  type="number"
                                  value={editCapAmount}
                                  onChange={(e) => setEditCapAmount(e.target.value)}
                                  placeholder="e.g., 3000"
                                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                />
                              </div>
                              {editCapAmount && (
                                <div>
                                  <label className="block text-xs text-zinc-400 mb-1">Cap Period</label>
                                  <select
                                    value={editCapPeriod}
                                    onChange={(e) => setEditCapPeriod(e.target.value as "year" | "calendar_year" | "")}
                                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                                  >
                                    <option value="year">Per Year</option>
                                    <option value="calendar_year">Per Calendar Year</option>
                                  </select>
                                </div>
                              )}
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
                    <td className="px-4 py-3 text-white font-medium">{bonus.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        bonus.bonus_type === "threshold" 
                          ? "bg-purple-700/50 text-purple-300" 
                          : "bg-amber-700/50 text-amber-300"
                      }`}>
                        {bonus.bonus_type === "threshold" ? "Threshold" : "Elite Earning"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-sm">
                      {bonus.bonus_type === "threshold" 
                        ? `Spend $${((bonus.spend_threshold_cents ?? 0) / 100).toLocaleString()}`
                        : `Per $${((bonus.per_spend_cents ?? 0) / 100).toFixed(0)} spent`
                      }
                      {bonus.bonus_type === "threshold" && bonus.period && (
                        <span className="text-zinc-500 ml-1">({periodLabels[bonus.period]?.replace("Per ", "").toLowerCase()})</span>
                      )}
                      {bonus.bonus_type === "elite_earning" && bonus.cap_amount && (
                        <span className="text-zinc-500 ml-1">(max {bonus.cap_amount.toLocaleString()}/{bonus.cap_period})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-medium text-sm">{formatReward(bonus)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{formatDefaultValue(bonus)}</td>
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
        <p className="text-zinc-500 text-sm">No spend bonuses configured for this card.</p>
      )}

      {/* Add Bonus Form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="border border-zinc-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-white">Add Spend Bonus</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Free Weekend Night"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Bonus Type</label>
              <select
                value={bonusType}
                onChange={(e) => setBonusType(e.target.value as "threshold" | "elite_earning")}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="threshold">Threshold (spend X → get Y)</option>
                <option value="elite_earning">Elite Earning (earn per $X)</option>
              </select>
            </div>

            {bonusType === "threshold" ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Spend Threshold ($)</label>
                  <input
                    type="number"
                    value={spendThreshold}
                    onChange={(e) => setSpendThreshold(e.target.value)}
                    placeholder="e.g., 30000"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Reward Type</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as "points" | "cash" | "benefit")}
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(rewardTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "year" | "calendar_year" | "lifetime")}
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(periodLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {rewardType === "points" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Points Amount</label>
                      <input
                        type="number"
                        value={pointsAmount}
                        onChange={(e) => setPointsAmount(e.target.value)}
                        placeholder="e.g., 50000"
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

                {rewardType === "cash" && (
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

                {rewardType === "benefit" && (
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
                        value={defaultValue}
                        onChange={(e) => setDefaultValue(e.target.value)}
                        placeholder="e.g., 400"
                        className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Earn 1 unit per ($)</label>
                  <input
                    type="number"
                    value={perSpend}
                    onChange={(e) => setPerSpend(e.target.value)}
                    placeholder="e.g., 2 for $2"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Elite Unit Name</label>
                  <input
                    type="text"
                    value={eliteUnitName}
                    onChange={(e) => setEliteUnitName(e.target.value)}
                    placeholder="e.g., PQP, Elite Mile, MQM"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Default Unit Value (cents)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={defaultUnitValue}
                    onChange={(e) => setDefaultUnitValue(e.target.value)}
                    placeholder="e.g., 1 for 1 cent"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cap (units, optional)</label>
                  <input
                    type="number"
                    value={capAmount}
                    onChange={(e) => setCapAmount(e.target.value)}
                    placeholder="e.g., 3000"
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {capAmount && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Cap Period</label>
                    <select
                      value={capPeriod}
                      onChange={(e) => setCapPeriod(e.target.value as "year" | "calendar_year" | "")}
                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="year">Per Year</option>
                      <option value="calendar_year">Per Calendar Year</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {bonusType === "threshold" && (
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
              <p className="text-sm text-purple-300">
                <strong>Threshold Bonus:</strong> User earns this reward once they spend the threshold amount on this card. 
                The value gets spread across all spending as a bonus rate.
              </p>
            </div>
          )}

          {bonusType === "elite_earning" && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
              <p className="text-sm text-amber-300">
                <strong>Elite Earning:</strong> User earns status/elite credits continuously as they spend. 
                Example: Alaska Summit earns 1 Elite Mile per $2 spent.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending || !name}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Adding..." : "Add Bonus"}
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
          + Add Spend Bonus
        </button>
      )}
    </div>
  );
}

