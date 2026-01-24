"use client";

import { useTransition } from "react";

interface BonusCalculationTogglesProps {
  includeWelcomeBonuses: boolean;
  includeSpendBonuses: boolean;
  onUpdateSettings: (includeWelcome: boolean, includeSpend: boolean) => Promise<void>;
}

export function BonusCalculationToggles({
  includeWelcomeBonuses,
  includeSpendBonuses,
  onUpdateSettings,
}: BonusCalculationTogglesProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggleWelcome = () => {
    startTransition(async () => {
      await onUpdateSettings(!includeWelcomeBonuses, includeSpendBonuses);
    });
  };

  const handleToggleSpend = () => {
    startTransition(async () => {
      await onUpdateSettings(includeWelcomeBonuses, !includeSpendBonuses);
    });
  };

  return (
    <div className="mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Include in Calculations</h3>
        <a
          href="/wallet"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Manage bonuses →
        </a>
      </div>
      
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <span className="text-sm text-zinc-300">Welcome Bonuses</span>
            <p className="text-xs text-zinc-500">Sign-up bonuses from active cards</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeWelcomeBonuses}
            disabled={isPending}
            onClick={handleToggleWelcome}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeWelcomeBonuses ? "bg-blue-600" : "bg-zinc-700"
            } ${isPending ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeWelcomeBonuses ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <span className="text-sm text-zinc-300">Spend Bonuses</span>
            <p className="text-xs text-zinc-500">Threshold bonuses and elite earning</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeSpendBonuses}
            disabled={isPending}
            onClick={handleToggleSpend}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeSpendBonuses ? "bg-blue-600" : "bg-zinc-700"
            } ${isPending ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeSpendBonuses ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>

      {(includeWelcomeBonuses || includeSpendBonuses) && (
        <p className="mt-3 text-xs text-zinc-500">
          Bonuses are included in the projected returns above.
        </p>
      )}
    </div>
  );
}
