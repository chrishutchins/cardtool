"use client";

import { useState } from "react";
import { parseLocalDate } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ClosedCardDisplay {
  id: string;
  card_id: string;
  card_name: string;
  custom_name: string | null;
  approval_date: string | null;
  closed_date: string | null;
  closed_reason: "product_change" | "closed" | null;
  product_changed_to_id: string | null;
  product_changed_to_name: string | null;
  player_number: number | null;
  issuer_name: string | null;
}

interface ClosedCardsSectionProps {
  closedCards: ClosedCardDisplay[];
  playerCount: number;
}

// ============================================================================
// Component
// ============================================================================

export function ClosedCardsSection({
  closedCards,
  playerCount,
}: ClosedCardsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (closedCards.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    return parseLocalDate(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getReasonBadge = (reason: string | null) => {
    switch (reason) {
      case "product_change":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Product Changed
          </span>
        );
      case "closed":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-sm font-medium">
          Closed Cards ({closedCards.length})
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 rounded-lg border border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Card
                </th>
                {playerCount > 1 && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                    P#
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase hidden md:table-cell">
                  Issuer
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                  Closed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {closedCards.map((card) => {
                const displayName = card.custom_name ?? card.card_name;

                return (
                  <tr key={card.id} className="bg-zinc-900/30">
                    {/* Card Name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-400">
                        {displayName}
                      </div>
                      {card.custom_name && (
                        <div className="text-xs text-zinc-500">
                          {card.card_name}
                        </div>
                      )}
                      {card.approval_date && (
                        <div className="text-xs text-zinc-600 mt-0.5">
                          Opened {formatDate(card.approval_date)}
                        </div>
                      )}
                    </td>

                    {/* Player */}
                    {playerCount > 1 && (
                      <td className="px-4 py-3 text-center">
                        <span className="text-zinc-500">
                          P{card.player_number ?? 1}
                        </span>
                      </td>
                    )}

                    {/* Issuer */}
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                      {card.issuer_name}
                    </td>

                    {/* Closed Date */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-zinc-400">
                        {formatDate(card.closed_date)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getReasonBadge(card.closed_reason)}
                        {card.closed_reason === "product_change" &&
                          card.product_changed_to_name && (
                            <div className="text-xs text-zinc-500">
                              → {card.product_changed_to_name}
                            </div>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


