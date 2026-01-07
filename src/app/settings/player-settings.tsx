"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";

interface Player {
  player_number: number;
  description: string | null;
}

interface PlayerSettingsProps {
  players: Player[];
  onSavePlayers: (playerCount: number, descriptions: Record<number, string>) => Promise<void>;
}

export function PlayerSettings({ players, onSavePlayers }: PlayerSettingsProps) {
  const [isPending, startTransition] = useTransition();
  
  // Determine current player count from existing players (minimum 1)
  const currentCount = players.length > 0 ? Math.max(...players.map(p => p.player_number)) : 1;
  const [playerCount, setPlayerCount] = useState(currentCount);
  
  // Build descriptions map from existing players
  const initialDescriptions: Record<number, string> = {};
  players.forEach(p => {
    initialDescriptions[p.player_number] = p.description || "";
  });
  const [descriptions, setDescriptions] = useState<Record<number, string>>(initialDescriptions);
  
  const handleCountChange = (newCount: number) => {
    setPlayerCount(newCount);
  };

  const handleDescriptionChange = (playerNum: number, value: string) => {
    setDescriptions(prev => ({ ...prev, [playerNum]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      await onSavePlayers(playerCount, descriptions);
    });
  };

  // Check if there are unsaved changes
  const hasChanges = playerCount !== currentCount || 
    Array.from({ length: Math.max(playerCount, currentCount) }, (_, i) => i + 1).some(num => {
      const existing = players.find(p => p.player_number === num)?.description || "";
      const current = descriptions[num] || "";
      return existing !== current;
    });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Players</h2>
      </div>
      <p className="text-sm text-zinc-400 mb-4">
        Track cards for yourself and family members. Each player&apos;s cards are tracked separately for application rules.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Number of Players
          </label>
          <select
            value={playerCount}
            onChange={(e) => handleCountChange(parseInt(e.target.value))}
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        {playerCount > 1 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-zinc-500">
              Add a description for each player (e.g., name or relationship)
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: playerCount }, (_, i) => i + 1).map(num => (
                <div key={num} className="flex items-center gap-2">
                  <span className="text-zinc-400 font-medium w-8">P{num}</span>
                  <input
                    type="text"
                    value={descriptions[num] || ""}
                    onChange={(e) => handleDescriptionChange(num, e.target.value)}
                    placeholder={num === 1 ? "Me" : `Player ${num}`}
                    maxLength={50}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {hasChanges && (
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Saving..." : "Save Players"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

