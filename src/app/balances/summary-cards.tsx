"use client";

interface SummaryProps {
  summary: {
    totalPoints: number;
    totalValue: number;
    byType: Record<string, { points: number; value: number }>;
    byAlliance: Record<string, { points: number; value: number }>;
    byPlayer: Record<number, { points: number; value: number; label: string }>;
  };
}

// Order matters for display
const typeOrder = ["banks", "airline_miles", "hotel_points"];

const typeLabels: Record<string, { label: string }> = {
  banks: { label: "Banks" },
  airline_miles: { label: "Airlines" },
  hotel_points: { label: "Hotels" },
};

const allianceLabels: Record<string, { label: string; color: string }> = {
  star_alliance: { label: "SA", color: "text-amber-400" },
  oneworld: { label: "OW", color: "text-emerald-400" },
  skyteam: { label: "ST", color: "text-sky-400" },
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + "K";
  }
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function SummaryCards({ summary }: SummaryProps) {
  const hasAirlineMiles = summary.byType.airline_miles?.points > 0;

  // Build type breakouts that have values, in order
  const typeBreakouts = typeOrder
    .filter((type) => summary.byType[type]?.points > 0)
    .map((type) => ({
      type,
      label: typeLabels[type]?.label ?? type,
      points: summary.byType[type].points,
      value: summary.byType[type].value,
    }));

  // Build alliance breakouts for airlines (exclude "none"/non-alliance)
  const allianceBreakouts = hasAirlineMiles
    ? Object.entries(allianceLabels)
        .filter(([alliance]) => summary.byAlliance[alliance]?.points > 0)
        .map(([alliance, config]) => ({
          alliance,
          label: config.label,
          color: config.color,
          points: summary.byAlliance[alliance].points,
        }))
    : [];

  // Build player breakouts
  const playerBreakouts = Object.entries(summary.byPlayer)
    .filter(([, data]) => data.points > 0)
    .map(([playerNum, data]) => ({
      playerNum: Number(playerNum),
      label: data.label,
      points: data.points,
      value: data.value,
    }))
    .sort((a, b) => a.playerNum - b.playerNum);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-7 gap-y-3">
        {/* Total Points & Value - stacked */}
        <div className="flex-shrink-0">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total</div>
          <div className="text-2xl font-bold text-white">{formatNumber(summary.totalPoints)}</div>
          <div className="text-base text-blue-400 font-medium">{formatCurrency(summary.totalValue)}</div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-[70px] bg-zinc-700" />

        {/* Type breakouts */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {typeBreakouts.map(({ type, label, points, value }) => (
            <div key={type}>
              <div className="text-sm text-zinc-500">{label}</div>
              <div className="text-lg font-semibold text-white">{formatNumber(points)}</div>
              <div className="text-sm text-zinc-400">{formatCurrency(value)}</div>
            </div>
          ))}
        </div>

        {/* Player breakouts (if multiple players) */}
        {playerBreakouts.length > 1 && (
          <>
            <div className="hidden sm:block w-px h-[70px] bg-zinc-700" />
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {playerBreakouts.map(({ playerNum, label, points, value }) => (
                <div key={playerNum}>
                  <div className="text-sm text-zinc-500">{label}</div>
                  <div className="text-lg font-semibold text-white">{formatNumber(points)}</div>
                  <div className="text-sm text-zinc-400">{formatCurrency(value)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Alliance breakouts (if any airline miles) */}
        {allianceBreakouts.length > 0 && (
          <>
            <div className="hidden sm:block w-px h-[70px] bg-zinc-700" />
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {allianceBreakouts.map(({ alliance, label, color, points }) => (
                <div key={alliance}>
                  <div className={`text-sm ${color}`}>{label}</div>
                  <div className="text-lg font-semibold text-white">{formatNumber(points)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
