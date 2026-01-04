"use client";

import { useState, useTransition } from "react";

// Currency type (subset of reward_currencies table)
interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: "points" | "cash" | "miles" | "other" | "airline_miles" | "hotel_points" | "transferable_points" | "non_transferable_points" | "cash_back" | "crypto";
}

// Types for user-defined bonuses
export interface UserWelcomeBonus {
  id: string;
  wallet_card_id: string;
  is_active: boolean;
  component_type: "points" | "cash" | "benefit";
  spend_requirement_cents: number;
  time_period_months: number;
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  value_cents: number | null;
  currency_name?: string | null;
}

export interface UserSpendBonus {
  id: string;
  wallet_card_id: string;
  is_active: boolean;
  name: string;
  bonus_type: "threshold" | "elite_earning";
  // Threshold fields
  spend_threshold_cents: number | null;
  reward_type: "points" | "cash" | "benefit" | null;
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  value_cents: number | null;
  period: "year" | "calendar_year" | "lifetime" | null;
  // Elite earning fields
  per_spend_cents: number | null;
  elite_unit_name: string | null;
  unit_value_cents: number | null;
  cap_amount: number | null;
  cap_period: "year" | "calendar_year" | null;
  currency_name?: string | null;
}

interface WalletCard {
  wallet_id: string;
  card_id: string;
  display_name: string;
  card_name: string;
  currency_name: string | null;
  currency_id: string | null;
}

interface UserBonusSectionProps {
  walletCards: WalletCard[];
  currencies: Currency[];
  welcomeBonuses: UserWelcomeBonus[];
  spendBonuses: UserSpendBonus[];
  bonusDisplaySettings: {
    includeWelcomeBonuses: boolean;
    includeSpendBonuses: boolean;
  };
  onUpdateDisplaySettings: (includeWelcomeBonuses: boolean, includeSpendBonuses: boolean) => Promise<void>;
  onAddWelcomeBonus: (formData: FormData) => Promise<void>;
  onUpdateWelcomeBonus: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteWelcomeBonus: (bonusId: string) => Promise<void>;
  onToggleWelcomeBonusActive: (bonusId: string, isActive: boolean) => Promise<void>;
  onAddSpendBonus: (formData: FormData) => Promise<void>;
  onUpdateSpendBonus: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteSpendBonus: (bonusId: string) => Promise<void>;
  onToggleSpendBonusActive: (bonusId: string, isActive: boolean) => Promise<void>;
}

export function UserBonusSection({
  walletCards,
  currencies,
  welcomeBonuses,
  spendBonuses,
  bonusDisplaySettings,
  onUpdateDisplaySettings,
  onAddWelcomeBonus,
  onUpdateWelcomeBonus,
  onDeleteWelcomeBonus,
  onToggleWelcomeBonusActive,
  onAddSpendBonus,
  onUpdateSpendBonus,
  onDeleteSpendBonus,
  onToggleSpendBonusActive,
}: UserBonusSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWelcomeBonus, setEditingWelcomeBonus] = useState<UserWelcomeBonus | null>(null);
  const [editingSpendBonus, setEditingSpendBonus] = useState<UserSpendBonus | null>(null);

  // Group bonuses by wallet card
  const welcomeBonusesByWallet = new Map<string, UserWelcomeBonus[]>();
  welcomeBonuses.forEach((wb) => {
    const existing = welcomeBonusesByWallet.get(wb.wallet_card_id) || [];
    existing.push(wb);
    welcomeBonusesByWallet.set(wb.wallet_card_id, existing);
  });

  const spendBonusesByWallet = new Map<string, UserSpendBonus[]>();
  spendBonuses.forEach((sb) => {
    const existing = spendBonusesByWallet.get(sb.wallet_card_id) || [];
    existing.push(sb);
    spendBonusesByWallet.set(sb.wallet_card_id, existing);
  });

  // Filter to wallet cards that have bonuses
  const walletCardsWithBonuses = walletCards.filter(
    (wc) => welcomeBonusesByWallet.has(wc.wallet_id) || spendBonusesByWallet.has(wc.wallet_id)
  );

  const handleToggleWelcomeBonuses = (checked: boolean) => {
    startTransition(async () => {
      await onUpdateDisplaySettings(checked, bonusDisplaySettings.includeSpendBonuses);
    });
  };

  const handleToggleSpendBonuses = (checked: boolean) => {
    startTransition(async () => {
      await onUpdateDisplaySettings(bonusDisplaySettings.includeWelcomeBonuses, checked);
    });
  };

  const formatWelcomeBonusValue = (wb: UserWelcomeBonus) => {
    if (wb.component_type === "points") {
      return `${wb.points_amount?.toLocaleString()} ${wb.currency_name || "points"}`;
    } else if (wb.component_type === "cash") {
      return `$${((wb.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
    } else {
      return wb.benefit_description ?? "Benefit";
    }
  };

  const formatSpendBonusValue = (sb: UserSpendBonus) => {
    if (sb.bonus_type === "threshold") {
      if (sb.reward_type === "points") {
        return `${sb.points_amount?.toLocaleString()} ${sb.currency_name || "points"}`;
      } else if (sb.reward_type === "cash") {
        return `$${((sb.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
      } else {
        return sb.benefit_description ?? "Benefit";
      }
    } else {
      return `1 ${sb.elite_unit_name} per $${((sb.per_spend_cents ?? 0) / 100).toFixed(0)}`;
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-white">Your Bonuses</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Manage welcome bonuses and spend bonuses for your cards
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Global Toggles */}
          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Include in Calculations</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bonusDisplaySettings.includeWelcomeBonuses}
                  onChange={(e) => handleToggleWelcomeBonuses(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm text-zinc-300">Welcome Bonuses (SUBs)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bonusDisplaySettings.includeSpendBonuses}
                  onChange={(e) => handleToggleSpendBonuses(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm text-zinc-300">Spend Bonuses</span>
              </label>
            </div>
          </div>

          {/* Add Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Bonus
            </button>
          </div>

          {/* Bonuses List */}
          {walletCardsWithBonuses.length === 0 && welcomeBonuses.length === 0 && spendBonuses.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>No bonuses yet. Click &quot;Add Bonus&quot; to create one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {walletCardsWithBonuses.map((walletCard) => {
                const cardWelcomeBonuses = welcomeBonusesByWallet.get(walletCard.wallet_id) || [];
                const cardSpendBonuses = spendBonusesByWallet.get(walletCard.wallet_id) || [];

                return (
                  <div key={walletCard.wallet_id} className="border border-zinc-800 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">
                      {walletCard.display_name}
                      {walletCard.display_name !== walletCard.card_name && (
                        <span className="ml-2 text-sm text-zinc-500 font-normal">({walletCard.card_name})</span>
                      )}
                    </h4>

                    {/* Welcome Bonuses */}
                    {cardWelcomeBonuses.length > 0 && (
                      <div className="mb-4">
                        <span className="text-sm font-medium text-zinc-400 block mb-2">Welcome Bonuses</span>
                        <div className="space-y-2">
                          {cardWelcomeBonuses.map((wb) => (
                            <WelcomeBonusRow
                              key={wb.id}
                              bonus={wb}
                              onEdit={() => setEditingWelcomeBonus(wb)}
                              onDelete={() => {
                                startTransition(async () => {
                                  await onDeleteWelcomeBonus(wb.id);
                                });
                              }}
                              onToggleActive={(isActive) => {
                                startTransition(async () => {
                                  await onToggleWelcomeBonusActive(wb.id, isActive);
                                });
                              }}
                              isPending={isPending}
                              formatValue={formatWelcomeBonusValue}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Spend Bonuses */}
                    {cardSpendBonuses.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-zinc-400 block mb-2">Spend Bonuses</span>
                        <div className="space-y-2">
                          {cardSpendBonuses.map((sb) => (
                            <SpendBonusRow
                              key={sb.id}
                              bonus={sb}
                              onEdit={() => setEditingSpendBonus(sb)}
                              onDelete={() => {
                                startTransition(async () => {
                                  await onDeleteSpendBonus(sb.id);
                                });
                              }}
                              onToggleActive={(isActive) => {
                                startTransition(async () => {
                                  await onToggleSpendBonusActive(sb.id, isActive);
                                });
                              }}
                              isPending={isPending}
                              formatValue={formatSpendBonusValue}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Bonus Modal */}
      {showAddModal && (
        <AddBonusModal
          walletCards={walletCards}
          currencies={currencies}
          onClose={() => setShowAddModal(false)}
          onAddWelcomeBonus={onAddWelcomeBonus}
          onAddSpendBonus={onAddSpendBonus}
        />
      )}

      {/* Edit Welcome Bonus Modal */}
      {editingWelcomeBonus && (
        <EditWelcomeBonusModal
          bonus={editingWelcomeBonus}
          currencies={currencies}
          onClose={() => setEditingWelcomeBonus(null)}
          onUpdate={onUpdateWelcomeBonus}
        />
      )}

      {/* Edit Spend Bonus Modal */}
      {editingSpendBonus && (
        <EditSpendBonusModal
          bonus={editingSpendBonus}
          currencies={currencies}
          onClose={() => setEditingSpendBonus(null)}
          onUpdate={onUpdateSpendBonus}
        />
      )}
    </div>
  );
}

// Welcome Bonus Row Component
function WelcomeBonusRow({
  bonus,
  onEdit,
  onDelete,
  onToggleActive,
  isPending,
  formatValue,
}: {
  bonus: UserWelcomeBonus;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
  isPending: boolean;
  formatValue: (wb: UserWelcomeBonus) => string;
}) {
  return (
    <div className={`bg-zinc-800/50 rounded p-3 ${!bonus.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={bonus.is_active}
            onChange={(e) => onToggleActive(e.target.checked)}
            disabled={isPending}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600"
          />
          <div>
            <span className={`text-sm ${bonus.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
              {formatValue(bonus)}
            </span>
            <div className="text-xs text-zinc-500">
              Spend ${((bonus.spend_requirement_cents ?? 0) / 100).toLocaleString()} in {bonus.time_period_months} months
            </div>
            {bonus.component_type === "benefit" && bonus.value_cents && (
              <div className="text-xs text-blue-400">
                Your value: ${(bonus.value_cents / 100).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-zinc-400 hover:text-zinc-300"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="p-1 text-red-400 hover:text-red-300"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Spend Bonus Row Component
function SpendBonusRow({
  bonus,
  onEdit,
  onDelete,
  onToggleActive,
  isPending,
  formatValue,
}: {
  bonus: UserSpendBonus;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
  isPending: boolean;
  formatValue: (sb: UserSpendBonus) => string;
}) {
  return (
    <div className={`bg-zinc-800/50 rounded p-3 ${!bonus.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={bonus.is_active}
            onChange={(e) => onToggleActive(e.target.checked)}
            disabled={isPending}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white">{bonus.name}</span>
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                bonus.bonus_type === "threshold" 
                  ? "bg-purple-700/50 text-purple-300" 
                  : "bg-amber-700/50 text-amber-300"
              }`}>
                {bonus.bonus_type === "threshold" ? "Threshold" : "Elite"}
              </span>
            </div>
            <span className={`text-sm ${bonus.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
              {formatValue(bonus)}
            </span>
            <div className="text-xs text-zinc-500">
              {bonus.bonus_type === "threshold" 
                ? `Spend $${((bonus.spend_threshold_cents ?? 0) / 100).toLocaleString()} ${bonus.period === "year" ? "per year" : bonus.period === "calendar_year" ? "per calendar year" : "once"}`
                : bonus.cap_amount ? `Max ${bonus.cap_amount.toLocaleString()} ${bonus.elite_unit_name} per ${bonus.cap_period}` : "No cap"
              }
            </div>
            {((bonus.reward_type === "benefit" && bonus.value_cents) || (bonus.bonus_type === "elite_earning" && bonus.unit_value_cents)) && (
              <div className="text-xs text-blue-400">
                Your value: {bonus.bonus_type === "threshold" ? `$${((bonus.value_cents ?? 0) / 100).toLocaleString()}` : `${bonus.unit_value_cents}¢ per unit`}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-zinc-400 hover:text-zinc-300"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="p-1 text-red-400 hover:text-red-300"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Bonus Modal
function AddBonusModal({
  walletCards,
  currencies,
  onClose,
  onAddWelcomeBonus,
  onAddSpendBonus,
}: {
  walletCards: { wallet_id: string; display_name: string; card_name: string; currency_id: string | null }[];
  currencies: Currency[];
  onClose: () => void;
  onAddWelcomeBonus: (formData: FormData) => Promise<void>;
  onAddSpendBonus: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [bonusType, setBonusType] = useState<"welcome" | "spend">("welcome");
  const [selectedWalletId, setSelectedWalletId] = useState(walletCards[0]?.wallet_id || "");
  
  // Welcome bonus fields
  const [componentType, setComponentType] = useState<"points" | "cash" | "benefit">("points");
  const [spendRequirement, setSpendRequirement] = useState("");
  const [timePeriod, setTimePeriod] = useState("3");
  const [pointsAmount, setPointsAmount] = useState("");
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id || "");
  const [cashAmount, setCashAmount] = useState("");
  const [benefitDescription, setBenefitDescription] = useState("");
  const [benefitValue, setBenefitValue] = useState("");

  // Spend bonus fields
  const [spendBonusType, setSpendBonusType] = useState<"threshold" | "elite_earning">("threshold");
  const [bonusName, setBonusName] = useState("");
  const [thresholdAmount, setThresholdAmount] = useState("");
  const [rewardType, setRewardType] = useState<"points" | "cash" | "benefit">("points");
  const [period, setPeriod] = useState<"year" | "calendar_year" | "lifetime">("year");
  const [perSpendAmount, setPerSpendAmount] = useState("");
  const [eliteUnitName, setEliteUnitName] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [capAmount, setCapAmount] = useState("");
  const [capPeriod, setCapPeriod] = useState<"year" | "calendar_year">("year");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("wallet_card_id", selectedWalletId);

    if (bonusType === "welcome") {
      formData.set("component_type", componentType);
      formData.set("spend_requirement_cents", String(Math.round(parseFloat(spendRequirement || "0") * 100)));
      formData.set("time_period_months", timePeriod);
      if (componentType === "points") {
        formData.set("points_amount", pointsAmount);
        formData.set("currency_id", currencyId);
      } else if (componentType === "cash") {
        formData.set("cash_amount_cents", String(Math.round(parseFloat(cashAmount || "0") * 100)));
      } else {
        formData.set("benefit_description", benefitDescription);
        formData.set("value_cents", String(Math.round(parseFloat(benefitValue || "0") * 100)));
      }
      startTransition(async () => {
        await onAddWelcomeBonus(formData);
        onClose();
      });
    } else {
      formData.set("name", bonusName);
      formData.set("bonus_type", spendBonusType);
      if (spendBonusType === "threshold") {
        formData.set("spend_threshold_cents", String(Math.round(parseFloat(thresholdAmount || "0") * 100)));
        formData.set("reward_type", rewardType);
        formData.set("period", period);
        if (rewardType === "points") {
          formData.set("points_amount", pointsAmount);
          formData.set("currency_id", currencyId);
        } else if (rewardType === "cash") {
          formData.set("cash_amount_cents", String(Math.round(parseFloat(cashAmount || "0") * 100)));
        } else {
          formData.set("benefit_description", benefitDescription);
          formData.set("value_cents", String(Math.round(parseFloat(benefitValue || "0") * 100)));
        }
      } else {
        formData.set("per_spend_cents", String(Math.round(parseFloat(perSpendAmount || "0") * 100)));
        formData.set("elite_unit_name", eliteUnitName);
        formData.set("unit_value_cents", unitValue); // User enters cents directly
        if (capAmount) {
          formData.set("cap_amount", capAmount);
          formData.set("cap_period", capPeriod);
        }
      }
      startTransition(async () => {
        await onAddSpendBonus(formData);
        onClose();
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Add Bonus</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Wallet Card Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Card</label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
              required
            >
              {[...walletCards]
                .sort((a, b) => a.display_name.localeCompare(b.display_name))
                .map((wc) => (
                  <option key={wc.wallet_id} value={wc.wallet_id}>
                    {wc.display_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Bonus Type Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Bonus Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBonusType("welcome")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                  bonusType === "welcome" 
                    ? "bg-blue-600 text-white" 
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}
              >
                Welcome Bonus
              </button>
              <button
                type="button"
                onClick={() => setBonusType("spend")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                  bonusType === "spend" 
                    ? "bg-blue-600 text-white" 
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}
              >
                Spend Bonus
              </button>
            </div>
          </div>

          {bonusType === "welcome" ? (
            <>
              {/* Welcome Bonus Fields */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Reward Type</label>
                <select
                  value={componentType}
                  onChange={(e) => setComponentType(e.target.value as "points" | "cash" | "benefit")}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                >
                  <option value="points">Points</option>
                  <option value="cash">Cash</option>
                  <option value="benefit">Benefit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Spend Requirement ($)</label>
                  <input
                    type="number"
                    value={spendRequirement}
                    onChange={(e) => setSpendRequirement(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="4000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Time Period (months)</label>
                  <input
                    type="number"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="3"
                    required
                  />
                </div>
              </div>

              {componentType === "points" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Points Amount</label>
                    <input
                      type="number"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      placeholder="80000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Currency</label>
                    <select
                      value={currencyId}
                      onChange={(e) => setCurrencyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      required
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {componentType === "cash" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cash Amount ($)</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="500"
                    required
                  />
                </div>
              )}

              {componentType === "benefit" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Benefit Description</label>
                    <input
                      type="text"
                      value={benefitDescription}
                      onChange={(e) => setBenefitDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      placeholder="Free night certificate"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Your Value ($)</label>
                    <input
                      type="number"
                      value={benefitValue}
                      onChange={(e) => setBenefitValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      placeholder="300"
                      required
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Spend Bonus Fields */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Bonus Name</label>
                <input
                  type="text"
                  value={bonusName}
                  onChange={(e) => setBonusName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="Annual airline credit"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Spend Bonus Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSpendBonusType("threshold")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      spendBonusType === "threshold" 
                        ? "bg-purple-600 text-white" 
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    Threshold
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpendBonusType("elite_earning")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      spendBonusType === "elite_earning" 
                        ? "bg-amber-600 text-white" 
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    Elite Earning
                  </button>
                </div>
              </div>

              {spendBonusType === "threshold" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Spend Threshold ($)</label>
                      <input
                        type="number"
                        value={thresholdAmount}
                        onChange={(e) => setThresholdAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="15000"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Period</label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as "year" | "calendar_year" | "lifetime")}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      >
                        <option value="year">Per Year</option>
                        <option value="calendar_year">Per Calendar Year</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Reward Type</label>
                    <select
                      value={rewardType}
                      onChange={(e) => setRewardType(e.target.value as "points" | "cash" | "benefit")}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    >
                      <option value="points">Points</option>
                      <option value="cash">Cash/Credit</option>
                      <option value="benefit">Benefit</option>
                    </select>
                  </div>

                  {rewardType === "points" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Points Amount</label>
                        <input
                          type="number"
                          value={pointsAmount}
                          onChange={(e) => setPointsAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="10000"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Currency</label>
                        <select
                          value={currencyId}
                          onChange={(e) => setCurrencyId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                          required
                        >
                          {currencies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {rewardType === "cash" && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Cash/Credit Amount ($)</label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="200"
                        required
                      />
                    </div>
                  )}

                  {rewardType === "benefit" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Benefit Description</label>
                        <input
                          type="text"
                          value={benefitDescription}
                          onChange={(e) => setBenefitDescription(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="Free night certificate"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Your Value ($)</label>
                        <input
                          type="number"
                          value={benefitValue}
                          onChange={(e) => setBenefitValue(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                          placeholder="300"
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Per Spend Amount ($)</label>
                      <input
                        type="number"
                        value={perSpendAmount}
                        onChange={(e) => setPerSpendAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Elite Unit Name</label>
                      <input
                        type="text"
                        value={eliteUnitName}
                        onChange={(e) => setEliteUnitName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="PQP"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Your Value Per Unit (¢)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitValue}
                      onChange={(e) => setUnitValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      placeholder="1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Cap Amount (optional)</label>
                      <input
                        type="number"
                        value={capAmount}
                        onChange={(e) => setCapAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                        placeholder="75000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Cap Period</label>
                      <select
                        value={capPeriod}
                        onChange={(e) => setCapPeriod(e.target.value as "year" | "calendar_year")}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                        disabled={!capAmount}
                      >
                        <option value="year">Per Year</option>
                        <option value="calendar_year">Per Calendar Year</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add Bonus"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Welcome Bonus Modal
function EditWelcomeBonusModal({
  bonus,
  currencies,
  onClose,
  onUpdate,
}: {
  bonus: UserWelcomeBonus;
  currencies: Currency[];
  onClose: () => void;
  onUpdate: (bonusId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [componentType, setComponentType] = useState<"points" | "cash" | "benefit">(bonus.component_type);
  const [spendRequirement, setSpendRequirement] = useState(String(bonus.spend_requirement_cents / 100));
  const [timePeriod, setTimePeriod] = useState(String(bonus.time_period_months));
  const [pointsAmount, setPointsAmount] = useState(String(bonus.points_amount ?? ""));
  const [currencyId, setCurrencyId] = useState(bonus.currency_id ?? currencies[0]?.id ?? "");
  const [cashAmount, setCashAmount] = useState(String((bonus.cash_amount_cents ?? 0) / 100));
  const [benefitDescription, setBenefitDescription] = useState(bonus.benefit_description ?? "");
  const [benefitValue, setBenefitValue] = useState(String((bonus.value_cents ?? 0) / 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("component_type", componentType);
    formData.set("spend_requirement_cents", String(Math.round(parseFloat(spendRequirement || "0") * 100)));
    formData.set("time_period_months", timePeriod);
    if (componentType === "points") {
      formData.set("points_amount", pointsAmount);
      formData.set("currency_id", currencyId);
    } else if (componentType === "cash") {
      formData.set("cash_amount_cents", String(Math.round(parseFloat(cashAmount || "0") * 100)));
    } else {
      formData.set("benefit_description", benefitDescription);
      formData.set("value_cents", String(Math.round(parseFloat(benefitValue || "0") * 100)));
    }
    startTransition(async () => {
      await onUpdate(bonus.id, formData);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Edit Welcome Bonus</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Reward Type</label>
            <select
              value={componentType}
              onChange={(e) => setComponentType(e.target.value as "points" | "cash" | "benefit")}
              className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
            >
              <option value="points">Points</option>
              <option value="cash">Cash</option>
              <option value="benefit">Benefit</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Spend Requirement ($)</label>
              <input
                type="number"
                value={spendRequirement}
                onChange={(e) => setSpendRequirement(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Time Period (months)</label>
              <input
                type="number"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                required
              />
            </div>
          </div>

          {componentType === "points" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Points Amount</label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Currency</label>
                <select
                  value={currencyId}
                  onChange={(e) => setCurrencyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  required
                >
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {componentType === "cash" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Cash Amount ($)</label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                required
              />
            </div>
          )}

          {componentType === "benefit" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Benefit Description</label>
                <input
                  type="text"
                  value={benefitDescription}
                  onChange={(e) => setBenefitDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Your Value ($)</label>
                <input
                  type="number"
                  value={benefitValue}
                  onChange={(e) => setBenefitValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Spend Bonus Modal - simplified for brevity, follows similar pattern
function EditSpendBonusModal({
  bonus,
  currencies,
  onClose,
  onUpdate,
}: {
  bonus: UserSpendBonus;
  currencies: Currency[];
  onClose: () => void;
  onUpdate: (bonusId: string, formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [bonusName, setBonusName] = useState(bonus.name);
  const [spendBonusType] = useState<"threshold" | "elite_earning">(bonus.bonus_type as "threshold" | "elite_earning");
  
  // Threshold fields
  const [thresholdAmount, setThresholdAmount] = useState(String((bonus.spend_threshold_cents ?? 0) / 100));
  const [rewardType, setRewardType] = useState<"points" | "cash" | "benefit">(bonus.reward_type as "points" | "cash" | "benefit" ?? "points");
  const [period, setPeriod] = useState<"year" | "calendar_year" | "lifetime">(bonus.period as "year" | "calendar_year" | "lifetime" ?? "year");
  const [pointsAmount, setPointsAmount] = useState(String(bonus.points_amount ?? ""));
  const [currencyId, setCurrencyId] = useState(bonus.currency_id ?? currencies[0]?.id ?? "");
  const [cashAmount, setCashAmount] = useState(String((bonus.cash_amount_cents ?? 0) / 100));
  const [benefitDescription, setBenefitDescription] = useState(bonus.benefit_description ?? "");
  const [benefitValue, setBenefitValue] = useState(String((bonus.value_cents ?? 0) / 100));
  
  // Elite earning fields
  const [perSpendAmount, setPerSpendAmount] = useState(String((bonus.per_spend_cents ?? 0) / 100));
  const [eliteUnitName, setEliteUnitName] = useState(bonus.elite_unit_name ?? "");
  const [unitValue, setUnitValue] = useState(String(bonus.unit_value_cents ?? "")); // Already in cents
  const [capAmount, setCapAmount] = useState(String(bonus.cap_amount ?? ""));
  const [capPeriod, setCapPeriod] = useState<"year" | "calendar_year">(bonus.cap_period as "year" | "calendar_year" ?? "year");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", bonusName);
    formData.set("bonus_type", spendBonusType);
    
    if (spendBonusType === "threshold") {
      formData.set("spend_threshold_cents", String(Math.round(parseFloat(thresholdAmount || "0") * 100)));
      formData.set("reward_type", rewardType);
      formData.set("period", period);
      if (rewardType === "points") {
        formData.set("points_amount", pointsAmount);
        formData.set("currency_id", currencyId);
      } else if (rewardType === "cash") {
        formData.set("cash_amount_cents", String(Math.round(parseFloat(cashAmount || "0") * 100)));
      } else {
        formData.set("benefit_description", benefitDescription);
        formData.set("value_cents", String(Math.round(parseFloat(benefitValue || "0") * 100)));
      }
    } else {
      formData.set("per_spend_cents", String(Math.round(parseFloat(perSpendAmount || "0") * 100)));
      formData.set("elite_unit_name", eliteUnitName);
      formData.set("unit_value_cents", unitValue); // User enters cents directly
      if (capAmount) {
        formData.set("cap_amount", capAmount);
        formData.set("cap_period", capPeriod);
      }
    }
    
    startTransition(async () => {
      await onUpdate(bonus.id, formData);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Edit Spend Bonus</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Bonus Name</label>
            <input
              type="text"
              value={bonusName}
              onChange={(e) => setBonusName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
              required
            />
          </div>

          <div className="text-sm text-zinc-400">
            Type: <span className={`px-2 py-1 rounded ${spendBonusType === "threshold" ? "bg-purple-700/50 text-purple-300" : "bg-amber-700/50 text-amber-300"}`}>
              {spendBonusType === "threshold" ? "Threshold" : "Elite Earning"}
            </span>
          </div>

          {spendBonusType === "threshold" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Spend Threshold ($)</label>
                  <input
                    type="number"
                    value={thresholdAmount}
                    onChange={(e) => setThresholdAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "year" | "calendar_year" | "lifetime")}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  >
                    <option value="year">Per Year</option>
                    <option value="calendar_year">Per Calendar Year</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Reward Type</label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as "points" | "cash" | "benefit")}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                >
                  <option value="points">Points</option>
                  <option value="cash">Cash/Credit</option>
                  <option value="benefit">Benefit</option>
                </select>
              </div>

              {rewardType === "points" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Points Amount</label>
                    <input
                      type="number"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Currency</label>
                    <select
                      value={currencyId}
                      onChange={(e) => setCurrencyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      required
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {rewardType === "cash" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cash/Credit Amount ($)</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    required
                  />
                </div>
              )}

              {rewardType === "benefit" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Benefit Description</label>
                    <input
                      type="text"
                      value={benefitDescription}
                      onChange={(e) => setBenefitDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Your Value ($)</label>
                    <input
                      type="number"
                      value={benefitValue}
                      onChange={(e) => setBenefitValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                      required
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Per Spend Amount ($)</label>
                  <input
                    type="number"
                    value={perSpendAmount}
                    onChange={(e) => setPerSpendAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Elite Unit Name</label>
                  <input
                    type="text"
                    value={eliteUnitName}
                    onChange={(e) => setEliteUnitName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Your Value Per Unit (¢)</label>
                <input
                  type="number"
                  step="0.01"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cap Amount (optional)</label>
                  <input
                    type="number"
                    value={capAmount}
                    onChange={(e) => setCapAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cap Period</label>
                  <select
                    value={capPeriod}
                    onChange={(e) => setCapPeriod(e.target.value as "year" | "calendar_year")}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-white"
                    disabled={!capAmount}
                  >
                    <option value="year">Per Year</option>
                    <option value="calendar_year">Per Calendar Year</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

