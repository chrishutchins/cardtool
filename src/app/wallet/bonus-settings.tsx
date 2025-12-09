"use client";

import { useState, useTransition } from "react";
import { WelcomeBonusInput, WelcomeBonusSettings as WelcomeBonusSettingsType, SpendBonusInput } from "@/lib/returns-calculator";

interface WalletCard {
  card_id: string;
  card_name: string;
  currency_name: string | null;
}

interface BonusSettingsProps {
  walletCards: WalletCard[];
  welcomeBonuses: WelcomeBonusInput[];
  welcomeBonusSettings: Map<string, WelcomeBonusSettingsType>;
  welcomeBonusValueOverrides: Map<string, number>;
  spendBonuses: SpendBonusInput[];
  spendBonusValues: Map<string, number>;
  bonusDisplaySettings: {
    includeWelcomeBonuses: boolean;
    includeSpendBonuses: boolean;
  };
  onUpdateDisplaySettings: (includeWelcomeBonuses: boolean, includeSpendBonuses: boolean) => Promise<void>;
  onUpdateWelcomeBonusSettings: (cardId: string, isActive: boolean, spendOverride: number | null, timeOverride: number | null) => Promise<void>;
  onUpdateWelcomeBonusValueOverride: (bonusId: string, valueCents: number | null) => Promise<void>;
  onUpdateSpendBonusValue: (bonusId: string, valueCents: number | null) => Promise<void>;
}

export function BonusSettings({
  walletCards,
  welcomeBonuses,
  welcomeBonusSettings,
  welcomeBonusValueOverrides,
  spendBonuses,
  spendBonusValues,
  bonusDisplaySettings,
  onUpdateDisplaySettings,
  onUpdateWelcomeBonusSettings,
  onUpdateWelcomeBonusValueOverride,
  onUpdateSpendBonusValue,
}: BonusSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);

  // Group welcome bonuses by card
  const welcomeBonusesByCard = new Map<string, WelcomeBonusInput[]>();
  welcomeBonuses.forEach((wb) => {
    const existing = welcomeBonusesByCard.get(wb.card_id) ?? [];
    existing.push(wb);
    welcomeBonusesByCard.set(wb.card_id, existing);
  });

  // Group spend bonuses by card
  const spendBonusesByCard = new Map<string, SpendBonusInput[]>();
  spendBonuses.forEach((sb) => {
    const existing = spendBonusesByCard.get(sb.card_id) ?? [];
    existing.push(sb);
    spendBonusesByCard.set(sb.card_id, existing);
  });

  // Filter to only cards in wallet that have bonuses
  const cardsWithBonuses = walletCards.filter(
    (wc) => welcomeBonusesByCard.has(wc.card_id) || spendBonusesByCard.has(wc.card_id)
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

  const handleToggleWelcomeBonusActive = (cardId: string, isActive: boolean) => {
    const settings = welcomeBonusSettings.get(cardId);
    startTransition(async () => {
      await onUpdateWelcomeBonusSettings(
        cardId,
        isActive,
        settings?.spend_requirement_override ?? null,
        settings?.time_period_override ?? null
      );
    });
  };

  const formatBonusValue = (wb: WelcomeBonusInput) => {
    if (wb.component_type === "points") {
      return `${wb.points_amount?.toLocaleString()} points`;
    } else if (wb.component_type === "cash") {
      return `$${((wb.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
    } else {
      return wb.benefit_description ?? "Benefit";
    }
  };

  const formatSpendBonusValue = (sb: SpendBonusInput) => {
    if (sb.bonus_type === "threshold") {
      if (sb.reward_type === "points") {
        return `${sb.points_amount?.toLocaleString()} points`;
      } else if (sb.reward_type === "cash") {
        return `$${((sb.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
      } else {
        return sb.benefit_description ?? "Benefit";
      }
    } else {
      return `1 ${sb.elite_unit_name} per $${((sb.per_spend_cents ?? 0) / 100).toFixed(0)}`;
    }
  };

  if (cardsWithBonuses.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-white">Bonus Settings</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Configure welcome bonuses and spend bonuses for your cards
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

          {/* Per-Card Settings */}
          <div className="space-y-4">
            {cardsWithBonuses.map((card) => {
              const cardWelcomeBonuses = welcomeBonusesByCard.get(card.card_id) ?? [];
              const cardSpendBonuses = spendBonusesByCard.get(card.card_id) ?? [];
              const settings = welcomeBonusSettings.get(card.card_id);
              const isActive = settings?.is_active ?? false;

              return (
                <div key={card.card_id} className="border border-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">{card.card_name}</h4>

                  {/* Welcome Bonus Section */}
                  {cardWelcomeBonuses.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-400">Welcome Bonus</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => handleToggleWelcomeBonusActive(card.card_id, e.target.checked)}
                            disabled={isPending}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                          />
                          <span className="text-sm text-zinc-300">Active</span>
                        </label>
                      </div>
                      
                      <div className="bg-zinc-800/50 rounded p-3 space-y-2">
                        {cardWelcomeBonuses.map((wb) => (
                          <div key={wb.id} className="flex items-center justify-between text-sm">
                            <span className={`${isActive ? "text-emerald-400" : "text-zinc-500"}`}>
                              {formatBonusValue(wb)}
                            </span>
                            {wb.component_type === "benefit" && (
                              <BenefitValueEditor
                                bonusId={wb.id}
                                defaultValue={wb.default_benefit_value_cents ?? 0}
                                currentValue={welcomeBonusValueOverrides.get(wb.id)}
                                onUpdate={onUpdateWelcomeBonusValueOverride}
                                disabled={isPending}
                              />
                            )}
                          </div>
                        ))}
                        <div className="text-xs text-zinc-500 pt-1 border-t border-zinc-700">
                          Spend ${((cardWelcomeBonuses[0]?.spend_requirement_cents ?? 0) / 100).toLocaleString()} in {cardWelcomeBonuses[0]?.time_period_months} months
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Spend Bonus Section */}
                  {cardSpendBonuses.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-zinc-400 block mb-2">Spend Bonuses</span>
                      <div className="space-y-2">
                        {cardSpendBonuses.map((sb) => (
                          <div key={sb.id} className="bg-zinc-800/50 rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm text-white">{sb.name}</span>
                                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                                  sb.bonus_type === "threshold" 
                                    ? "bg-purple-700/50 text-purple-300" 
                                    : "bg-amber-700/50 text-amber-300"
                                }`}>
                                  {sb.bonus_type === "threshold" ? "Threshold" : "Elite"}
                                </span>
                              </div>
                              <span className="text-sm text-emerald-400">{formatSpendBonusValue(sb)}</span>
                            </div>
                            
                            {/* Value editor for benefits or elite earning */}
                            {(sb.reward_type === "benefit" || sb.bonus_type === "elite_earning") && (
                              <div className="mt-2 pt-2 border-t border-zinc-700">
                                <SpendBonusValueEditor
                                  bonusId={sb.id}
                                  bonusType={sb.bonus_type}
                                  defaultValue={sb.bonus_type === "threshold" ? (sb.default_value_cents ?? 0) : (sb.default_unit_value_cents ?? 0)}
                                  currentValue={spendBonusValues.get(sb.id)}
                                  onUpdate={onUpdateSpendBonusValue}
                                  disabled={isPending}
                                />
                              </div>
                            )}
                            
                            <div className="text-xs text-zinc-500 mt-2">
                              {sb.bonus_type === "threshold" 
                                ? `Spend $${((sb.spend_threshold_cents ?? 0) / 100).toLocaleString()} ${sb.period === "year" ? "per year" : sb.period === "calendar_year" ? "per calendar year" : "once"}`
                                : sb.cap_amount ? `Max ${sb.cap_amount.toLocaleString()} ${sb.elite_unit_name} per ${sb.cap_period}` : "No cap"
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Benefit value editor component
function BenefitValueEditor({
  bonusId,
  defaultValue,
  currentValue,
  onUpdate,
  disabled,
}: {
  bonusId: string;
  defaultValue: number;
  currentValue: number | undefined;
  onUpdate: (bonusId: string, valueCents: number | null) => Promise<void>;
  disabled: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(((currentValue ?? defaultValue) / 100).toString());
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const cents = Math.round(parseFloat(value) * 100);
    if (cents === defaultValue) {
      startTransition(async () => {
        await onUpdate(bonusId, null);
        setIsEditing(false);
      });
    } else {
      startTransition(async () => {
        await onUpdate(bonusId, cents);
        setIsEditing(false);
      });
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-zinc-400 hover:text-zinc-300"
      >
        Value: ${((currentValue ?? defaultValue) / 100).toLocaleString()}
        {currentValue !== undefined && currentValue !== defaultValue && (
          <span className="text-blue-400 ml-1">(custom)</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400">$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 px-2 py-1 text-xs rounded border border-zinc-600 bg-zinc-700 text-white"
        disabled={disabled || isPending}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || isPending}
        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
      >
        {isPending ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="text-xs text-zinc-400 hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}

// Spend bonus value editor component
function SpendBonusValueEditor({
  bonusId,
  bonusType,
  defaultValue,
  currentValue,
  onUpdate,
  disabled,
}: {
  bonusId: string;
  bonusType: "threshold" | "elite_earning";
  defaultValue: number;
  currentValue: number | undefined;
  onUpdate: (bonusId: string, valueCents: number | null) => Promise<void>;
  disabled: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(((currentValue ?? defaultValue) / 100).toString());
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const cents = Math.round(parseFloat(value) * 100);
    if (cents === defaultValue) {
      startTransition(async () => {
        await onUpdate(bonusId, null);
        setIsEditing(false);
      });
    } else {
      startTransition(async () => {
        await onUpdate(bonusId, cents);
        setIsEditing(false);
      });
    }
  };

  const label = bonusType === "threshold" ? "Your value" : "Value per unit";

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-zinc-400 hover:text-zinc-300"
      >
        {label}: {bonusType === "threshold" ? "$" : ""}{((currentValue ?? defaultValue) / 100).toLocaleString()}{bonusType === "elite_earning" ? "¢" : ""}
        {currentValue !== undefined && currentValue !== defaultValue && (
          <span className="text-blue-400 ml-1">(custom)</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400">{label}:</span>
      {bonusType === "threshold" && <span className="text-xs text-zinc-400">$</span>}
      <input
        type="number"
        step={bonusType === "elite_earning" ? "0.01" : "1"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 px-2 py-1 text-xs rounded border border-zinc-600 bg-zinc-700 text-white"
        disabled={disabled || isPending}
      />
      {bonusType === "elite_earning" && <span className="text-xs text-zinc-400">¢</span>}
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || isPending}
        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
      >
        {isPending ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="text-xs text-zinc-400 hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}
