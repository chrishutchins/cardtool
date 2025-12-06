"use client";

import { useState, useTransition } from "react";

interface Tier {
  id: string;
  name: string;
  multiplier: number;
  requirements: string | null;
  sort_order: number | null;
  has_cap: boolean | null;
  cap_amount: number | null;
  cap_period: string | null;
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  tiers: Tier[];
}

interface UserTierSelection {
  program_id: string;
  tier_id: string | null;
}

interface MultiplierSelectorProps {
  programs: Program[];
  userSelections: UserTierSelection[];
  onSelectTier: (programId: string, tierId: string | null) => Promise<void>;
}

export function MultiplierSelector({
  programs,
  userSelections,
  onSelectTier,
}: MultiplierSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingProgram, setPendingProgram] = useState<string | null>(null);

  const getSelectedTierId = (programId: string) => {
    const selection = userSelections.find((s) => s.program_id === programId);
    return selection?.tier_id ?? null;
  };

  const handleSelect = (programId: string, tierId: string | null) => {
    setPendingProgram(programId);
    startTransition(async () => {
      await onSelectTier(programId, tierId);
      setPendingProgram(null);
    });
  };

  if (programs.length === 0) return null;

  return (
    <div className="space-y-4">
      {programs.map((program) => {
        const sortedTiers = [...program.tiers].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        const selectedTierId = getSelectedTierId(program.id);
        const selectedTier = sortedTiers.find((t) => t.id === selectedTierId);
        const isLoading = isPending && pendingProgram === program.id;

        return (
          <div
            key={program.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-medium text-white">{program.name}</h3>
                {program.description && (
                  <p className="text-xs text-zinc-500 mt-0.5">{program.description}</p>
                )}
              </div>
              {selectedTier && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-sm font-medium">
                    {selectedTier.name}
                  </span>
                  <span className="text-purple-400 font-mono text-sm">
                    {selectedTier.multiplier}x
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSelect(program.id, null)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !selectedTierId
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                } disabled:opacity-50`}
              >
                Not Enrolled
              </button>
              {sortedTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => handleSelect(program.id, tier.id)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTierId === tier.id
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  } disabled:opacity-50`}
                  title={tier.requirements || undefined}
                >
                  {tier.name}
                  <span className="text-xs ml-1.5 opacity-75">{tier.multiplier}x</span>
                  {tier.has_cap && (
                    <span className="text-xs ml-1 opacity-60">
                      (${tier.cap_amount?.toLocaleString()}/{tier.cap_period === "month" ? "mo" : tier.cap_period === "quarter" ? "qtr" : "yr"})
                    </span>
                  )}
                </button>
              ))}
            </div>
            {isLoading && (
              <p className="text-xs text-zinc-500 mt-2">Saving...</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

