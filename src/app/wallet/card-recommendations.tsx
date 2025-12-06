"use client";

import { CardRecommendation } from "@/lib/returns-calculator";

interface CardRecommendationsProps {
  recommendations: CardRecommendation[];
  onAddCard?: (cardId: string) => void;
  variant?: "callout" | "compact";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CardRecommendations({ 
  recommendations, 
  onAddCard,
  variant = "callout" 
}: CardRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-zinc-400">Top Card Recommendations</h4>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div 
              key={rec.card.id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg bg-zinc-800/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{rec.card.name}</div>
                  <div className="text-xs text-zinc-500">
                    +{formatCurrency(rec.improvement)}/yr
                  </div>
                </div>
              </div>
              {onAddCard && (
                <button
                  onClick={() => onAddCard(rec.card.id)}
                  className="shrink-0 px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Callout variant (default)
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-zinc-900 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Boost Your Earnings</h3>
          <p className="text-sm text-zinc-400">
            Based on your spending, these cards could increase your annual return
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec, index) => (
          <div 
            key={rec.card.id}
            className="relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 hover:border-emerald-500/50 transition-colors"
          >
            {/* Rank Badge */}
            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
              {index + 1}
            </div>

            <div className="mb-3">
              <h4 className="font-medium text-white truncate pr-2">{rec.card.name}</h4>
              <p className="text-xs text-zinc-500">
                {rec.card.primary_currency?.name ?? "Unknown Currency"}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {(() => {
                const netFee = rec.card.annual_fee - rec.defaultPerksValue;
                const spendingEarnings = rec.improvement + netFee;
                return (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Spending Earnings</span>
                      <span className="text-zinc-300">
                        +{formatCurrency(spendingEarnings)}/yr
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Net Annual Fee</span>
                      <span className="text-zinc-300">
                        {netFee > 0 ? `-${formatCurrency(netFee)}` : "$0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-zinc-700 pt-2 mt-2">
                      <span className="text-zinc-300 font-medium">Total Earnings</span>
                      <span className="text-emerald-400 font-semibold">
                        +{formatCurrency(rec.improvement)}/yr
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {onAddCard && (
              <button
                onClick={() => onAddCard(rec.card.id)}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Add to Wallet
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

