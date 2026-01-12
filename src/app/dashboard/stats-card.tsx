"use client";

import Link from "next/link";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  href: string;
  icon: "cards" | "fees" | "credits" | "earnings" | "points" | "creditline" | "perks";
  highlight?: boolean;
}

const icons = {
  cards: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  fees: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  credits: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  earnings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  points: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  creditline: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  perks: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
};

export function StatsCard({ title, value, subtitle, subtitleColor, href, icon, highlight }: StatsCardProps) {
  return (
    <Link
      href={href}
      className="block p-5 rounded-xl border transition-all duration-200 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${highlight ? "text-amber-400" : "text-white"}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-sm mt-1 ${subtitleColor || "text-zinc-500"}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${highlight ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}>
          {icons[icon]}
        </div>
      </div>
    </Link>
  );
}

// Cards in Wallet - 3 stats across
interface WalletSummaryCardProps {
  cardCount: number;
  totalFees: number;
  perksValue: number;
  netFees: number;
}

export function WalletSummaryCard({ cardCount, totalFees, perksValue, netFees }: WalletSummaryCardProps) {
  return (
    <Link
      href="/wallet"
      className="block p-5 rounded-xl border transition-all duration-200 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">Cards in Wallet</p>
          <p className="text-3xl font-bold text-white">{cardCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
          {icons.cards}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Annual Fees</p>
          <p className="text-lg font-semibold text-white">${totalFees.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Perks Value</p>
          <p className="text-lg font-semibold text-emerald-400">${perksValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Net Fees</p>
          <p className={`text-lg font-semibold ${netFees < 0 ? "text-emerald-400" : "text-white"}`}>
            {netFees < 0 ? `-$${Math.abs(netFees).toLocaleString()}` : `$${netFees.toLocaleString()}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
