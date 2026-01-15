"use client";

import Link from "next/link";

interface PointsByType {
  bank: number;
  airline: number;
  hotel: number;
}

interface PointsSummaryProps {
  totalPoints: number;
  totalValue: number;
  pointsByType: PointsByType;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Donut chart component
function DonutChart({ bank, airline, hotel }: PointsByType) {
  const total = bank + airline + hotel;
  if (total === 0) return null;
  
  const bankPercent = (bank / total) * 100;
  const airlinePercent = (airline / total) * 100;
  const hotelPercent = (hotel / total) * 100;
  
  const circumference = 2 * Math.PI * 40;
  const bankDash = (bankPercent / 100) * circumference;
  const airlineDash = (airlinePercent / 100) * circumference;
  const hotelDash = (hotelPercent / 100) * circumference;
  
  const bankOffset = 0;
  const airlineOffset = bankDash;
  const hotelOffset = bankDash + airlineDash;
  
  return (
    <svg width="64" height="64" viewBox="0 0 100 100" className="transform -rotate-90 flex-shrink-0">
      {bank > 0 && (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="12"
          strokeDasharray={`${bankDash} ${circumference - bankDash}`}
          strokeDashoffset={-bankOffset}
        />
      )}
      {airline > 0 && (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="12"
          strokeDasharray={`${airlineDash} ${circumference - airlineDash}`}
          strokeDashoffset={-airlineOffset}
        />
      )}
      {hotel > 0 && (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#c084fc"
          strokeWidth="12"
          strokeDasharray={`${hotelDash} ${circumference - hotelDash}`}
          strokeDashoffset={-hotelOffset}
        />
      )}
    </svg>
  );
}

export function PointsSummary({ totalPoints, totalValue, pointsByType }: PointsSummaryProps) {
  const hasPoints = totalPoints > 0;

  return (
    <Link
      href="/balances"
      className="block p-5 rounded-xl border transition-all duration-200 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-zinc-400">Points & Miles</p>
        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      </div>
      
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-3xl font-bold text-white">
          {hasPoints ? formatNumber(totalPoints) : "—"}
        </span>
        {hasPoints && totalValue > 0 && (
          <span className="text-lg text-emerald-400">
            ≈ {formatCurrency(totalValue)}
          </span>
        )}
      </div>
      
      {hasPoints && (
        <div className="flex items-center gap-4 pt-3 border-t border-zinc-800">
          <div className="flex flex-col gap-2 text-sm flex-1">
            {pointsByType.bank > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-zinc-400 w-12">Bank</span>
                <span className="text-white font-medium">{formatNumber(pointsByType.bank)}</span>
              </div>
            )}
            {pointsByType.airline > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-zinc-400 w-12">Airline</span>
                <span className="text-white font-medium">{formatNumber(pointsByType.airline)}</span>
              </div>
            )}
            {pointsByType.hotel > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-zinc-400 w-12">Hotel</span>
                <span className="text-white font-medium">{formatNumber(pointsByType.hotel)}</span>
              </div>
            )}
          </div>
          <DonutChart {...pointsByType} />
        </div>
      )}
    </Link>
  );
}
