"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ExpiringCredit,
  ExpiringInventoryItem,
  UpcomingFee,
  ExpiringPoint,
  Player,
} from "./upcoming-client";

type UnifiedItem =
  | { type: "credit"; date: Date; data: ExpiringCredit }
  | { type: "inventory"; date: Date; data: ExpiringInventoryItem }
  | { type: "renewal"; date: Date; data: UpcomingFee }
  | { type: "points"; date: Date; data: ExpiringPoint };

interface UpcomingItemProps {
  item: UnifiedItem;
  showPlayer: boolean;
  players: Player[];
  onMarkCreditUsed: (formData: FormData) => Promise<void>;
  onToggleCreditHidden: (formData: FormData) => Promise<void>;
}

// Icons
const GiftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const ExpiringIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPlayerLabel(playerNumber: number | null, players: Player[]): string | null {
  if (playerNumber === null) return null;
  const player = players.find(p => p.player_number === playerNumber);
  if (player?.description) {
    return player.description.substring(0, 2).toUpperCase();
  }
  return `P${playerNumber}`;
}

// Calculate period start and end for credits
function getCreditPeriod(credit: ExpiringCredit): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let periodStart: Date;
  let periodEnd: Date;

  switch (credit.resetCycle) {
    case "monthly":
      periodStart = new Date(year, month, 1);
      periodEnd = new Date(year, month + 1, 0);
      break;
    case "quarterly": {
      const q = Math.floor(month / 3);
      periodStart = new Date(year, q * 3, 1);
      periodEnd = new Date(year, (q + 1) * 3, 0);
      break;
    }
    case "semiannual": {
      const h = month < 6 ? 0 : 1;
      periodStart = new Date(year, h * 6, 1);
      periodEnd = new Date(year, (h + 1) * 6, 0);
      break;
    }
    case "annual":
      periodStart = new Date(year, 0, 1);
      periodEnd = new Date(year, 11, 31);
      break;
    default:
      periodStart = new Date(year, 0, 1);
      periodEnd = new Date(year, 11, 31);
  }

  return {
    start: periodStart.toISOString().split("T")[0],
    end: periodEnd.toISOString().split("T")[0],
  };
}

export function UpcomingItem({
  item,
  showPlayer,
  players,
  onMarkCreditUsed,
  onToggleCreditHidden,
}: UpcomingItemProps) {
  const [isPending, startTransition] = useTransition();

  if (item.type === "credit") {
    const credit = item.data;
    const playerLabel = showPlayer ? getPlayerLabel(credit.playerNumber, players) : null;
    const { start, end } = getCreditPeriod(credit);

    const handleMarkUsed = () => {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("user_wallet_id", credit.walletCardId);
        formData.set("credit_id", credit.creditId);
        formData.set("period_start", start);
        formData.set("period_end", end);
        formData.set("amount_used", credit.value.toString());
        await onMarkCreditUsed(formData);
      });
    };

    const handleToggleHidden = () => {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("user_wallet_id", credit.walletCardId);
        formData.set("credit_id", credit.creditId);
        formData.set("is_hidden", "true");
        await onToggleCreditHidden(formData);
      });
    };

    return (
      <div className={`px-4 py-3 ${credit.isUsed ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 flex-shrink-0">
              <GiftIcon />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-medium ${credit.isUsed ? "text-zinc-400 line-through" : "text-white"}`}>
                  {credit.creditName}
                </span>
                {playerLabel && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                    {playerLabel}
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-500 truncate">{credit.cardName}</div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-xs text-zinc-500 hidden sm:block">
              Expires {formatDate(credit.expiresAt)}
            </div>
            <div className="text-sm font-medium text-white min-w-[60px] text-right">
              {credit.isValueBased ? formatCurrency(credit.value) : `${credit.value} ${credit.unitName || ""}`}
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/credits"
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Go to Credits"
              >
                <SettingsIcon />
              </Link>
              <button
                onClick={handleToggleHidden}
                disabled={isPending}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                title="Hide credit"
              >
                <EyeOffIcon />
              </button>
              {/* Mark Used Button */}
              {credit.isUsed ? (
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckIcon />
                </div>
              ) : (
                <button
                  onClick={handleMarkUsed}
                  disabled={isPending}
                  className="w-7 h-7 rounded-lg border-2 border-zinc-600 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-all group disabled:opacity-50"
                  title="Mark as used"
                >
                  <span className="text-zinc-500 group-hover:text-emerald-400">
                    <CheckIcon />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "inventory") {
    const inv = item.data;
    const playerLabel = showPlayer ? getPlayerLabel(inv.playerNumber, players) : null;

    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="p-1.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">
              <PackageIcon />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">{inv.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {inv.typeName}
                </span>
                {playerLabel && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                    {playerLabel}
                  </span>
                )}
              </div>
              {inv.brand && <div className="text-sm text-zinc-500 truncate">{inv.brand}</div>}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-xs text-zinc-500 hidden sm:block">
              Expires {formatDate(inv.expirationDate)}
            </div>
            <div className="text-sm font-medium text-white min-w-[60px] text-right">
              {inv.value > 0 ? formatCurrency(inv.value) : ""}
            </div>
            <Link
              href="/inventory"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="View in Inventory"
            >
              <SearchIcon />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "renewal") {
    const fee = item.data;
    const playerLabel = showPlayer ? getPlayerLabel(fee.playerNumber, players) : null;

    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 flex-shrink-0">
              <CreditCardIcon />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">Annual Fee</span>
                {playerLabel && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                    {playerLabel}
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-500 truncate">{fee.cardName}</div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-xs text-zinc-500 hidden sm:block">
              {formatDate(fee.anniversaryDate)}
            </div>
            <div className="text-sm font-medium text-white min-w-[60px] text-right">
              {formatCurrency(fee.annualFee)}
            </div>
            <Link
              href="/wallet"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="View in Wallet"
            >
              <SettingsIcon />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "points") {
    const point = item.data;
    const playerLabel = showPlayer ? getPlayerLabel(point.playerNumber, players) : null;

    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="p-1.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">
              <ExpiringIcon />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">Expiring Points</span>
                {playerLabel && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                    {playerLabel}
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-500 truncate">{point.currencyName}</div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-xs text-zinc-500 hidden sm:block">
              Expires {formatDate(point.expirationDate)}
            </div>
            <div className="text-sm font-medium text-white min-w-[60px] text-right">
              {point.balance.toLocaleString()}
            </div>
            <Link
              href="/balances"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="View in Balances"
            >
              <SearchIcon />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
