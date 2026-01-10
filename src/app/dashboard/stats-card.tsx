"use client";

import Link from "next/link";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  href: string;
  icon: "cards" | "fees" | "credits" | "earnings";
  highlight?: boolean;
}

const icons = {
  cards: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  fees: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  credits: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  earnings: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
