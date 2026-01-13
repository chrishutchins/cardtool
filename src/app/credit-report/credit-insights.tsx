"use client";

import { Calendar, Clock, Search, CreditCard, Percent } from "lucide-react";

interface CreditAccount {
  id: string;
  account_name: string;
  creditor_name: string | null;
  date_opened: string | null;
}

interface InquiryCountByBureau {
  equifax: number;
  experian: number;
  transunion: number;
}

interface CreditInsightsProps {
  utilization: number;
  totalBalance: number;
  totalCreditLimit: number;
  avgAgeMonths: number;
  oldestAccount: CreditAccount | null;
  activeInquiryCounts: InquiryCountByBureau;
  openAccountCount: number;
  closedAccountCount: number;
}

// Scroll to a section by ID
function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatAge(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = Math.round(months % 12);

  if (years === 0) {
    return `${remainingMonths} mo`;
  }
  if (remainingMonths === 0) {
    return `${years} yr`;
  }
  return `${years} yr ${remainingMonths} mo`;
}

function getUtilizationColor(util: number): string {
  if (util <= 10) return "text-emerald-400";
  if (util <= 30) return "text-green-400";
  if (util <= 50) return "text-yellow-400";
  if (util <= 75) return "text-orange-400";
  return "text-red-400";
}

function getUtilizationLabel(util: number): string {
  if (util <= 10) return "Excellent";
  if (util <= 30) return "Good";
  if (util <= 50) return "Fair";
  if (util <= 75) return "High";
  return "Very High";
}

export function CreditInsights({
  utilization,
  totalBalance,
  totalCreditLimit,
  avgAgeMonths,
  oldestAccount,
  activeInquiryCounts,
  openAccountCount,
  closedAccountCount,
}: CreditInsightsProps) {
  const oldestAccountAge = oldestAccount?.date_opened
    ? (() => {
        const opened = new Date(oldestAccount.date_opened);
        const now = new Date();
        return (now.getFullYear() - opened.getFullYear()) * 12 + (now.getMonth() - opened.getMonth());
      })()
    : 0;

  // Max inquiries on any single bureau (what impacts your score)
  const maxInquiries = Math.max(
    activeInquiryCounts.equifax,
    activeInquiryCounts.experian,
    activeInquiryCounts.transunion
  );

  const totalAccounts = openAccountCount + closedAccountCount;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Credit Utilization - includes balance/limit */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-zinc-400">Utilization</p>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 flex-shrink-0">
            <Percent className="h-4 w-4" />
          </div>
        </div>
        <div className={`text-2xl font-bold ${getUtilizationColor(utilization)}`}>
          {utilization.toFixed(1)}%
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {getUtilizationLabel(utilization)}
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          {formatCurrency(totalBalance)} / {formatCurrency(totalCreditLimit)}
        </p>
      </div>

      {/* Accounts - clickable to jump to section */}
      <button
        onClick={() => scrollToSection("accounts-section")}
        className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-left hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-zinc-400">Accounts</p>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 flex-shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white">
          {totalAccounts}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          <span className="text-emerald-400">{openAccountCount} open</span>
          {closedAccountCount > 0 && (
            <span className="text-zinc-500"> · {closedAccountCount} closed</span>
          )}
        </p>
      </button>

      {/* Active Inquiries - clickable to jump to section */}
      <button
        onClick={() => scrollToSection("inquiries-section")}
        className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-left hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-zinc-400">Inquiries</p>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 flex-shrink-0">
            <Search className="h-4 w-4" />
          </div>
        </div>
        <p className={`text-2xl font-bold ${maxInquiries <= 2 ? "text-emerald-400" : maxInquiries <= 5 ? "text-yellow-400" : "text-red-400"}`}>
          {maxInquiries}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Active (max/bureau)
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          EQ:{activeInquiryCounts.equifax} · EX:{activeInquiryCounts.experian} · TU:{activeInquiryCounts.transunion}
        </p>
      </button>

      {/* Average Account Age */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-zinc-400">Avg Age</p>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 flex-shrink-0">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white">
          {formatAge(avgAgeMonths)}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {openAccountCount} open accounts
        </p>
      </div>

      {/* Oldest Account */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-zinc-400">Oldest</p>
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 flex-shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white">
          {oldestAccount ? formatAge(oldestAccountAge) : "—"}
        </p>
        {oldestAccount && (
          <p className="text-xs text-zinc-500 mt-1 truncate" title={oldestAccount.creditor_name ?? oldestAccount.account_name}>
            {oldestAccount.creditor_name ?? oldestAccount.account_name}
          </p>
        )}
      </div>
    </div>
  );
}
