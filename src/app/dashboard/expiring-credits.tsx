"use client";

import Link from "next/link";

interface ExpiringCredit {
  creditId: string;
  creditName: string;
  cardName: string;
  expiresAt: Date;
  value: number;
  isValueBased: boolean;
  unitName: string | null;
}

interface ExpiringCreditsProps {
  credits: ExpiringCredit[];
}

export function ExpiringCredits({ credits }: ExpiringCreditsProps) {
  const formatDaysUntil = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatValue = (credit: ExpiringCredit) => {
    if (credit.isValueBased) {
      return `$${credit.value}`;
    }
    if (credit.unitName) {
      return `${credit.value} ${credit.unitName}`;
    }
    return `${credit.value}`;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Use Soon</h2>
        <Link href="/credits" className="text-sm text-blue-400 hover:text-blue-300">
          View all →
        </Link>
      </div>

      {credits.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-zinc-400">
            No credits expiring in the next 30 days
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map((credit, index) => {
            const daysUntil = getDaysUntil(credit.expiresAt);
            const isUrgent = daysUntil <= 7;
            
            return (
              <div
                key={`${credit.creditId}-${index}`}
                className={`
                  p-3 rounded-lg border
                  ${isUrgent 
                    ? "bg-amber-950/30 border-amber-700/50" 
                    : "bg-zinc-800/30 border-zinc-700/50"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isUrgent ? "text-amber-200" : "text-white"}`}>
                      {credit.creditName}
                    </p>
                    <p className="text-sm text-zinc-500 truncate">{credit.cardName}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className={`text-sm font-medium ${isUrgent ? "text-amber-400" : "text-emerald-400"}`}>
                      {formatValue(credit)}
                    </p>
                    <p className={`text-xs ${isUrgent ? "text-amber-400/70" : "text-zinc-500"}`}>
                      {formatDaysUntil(credit.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {credits.length >= 5 && (
            <Link
              href="/credits"
              className="block text-center text-sm text-zinc-400 hover:text-zinc-300 py-2"
            >
              View all expiring credits
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

