"use client";

import { useState, useTransition, useMemo } from "react";
import { BalanceEditPopover } from "./balance-edit-popover";
import { Tooltip } from "@/components/data-table";

type Currency = {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
  program_name?: string | null;
  alliance?: string | null;
  expiration_policy?: string | null;
  is_transferable?: boolean | null;
  transfer_increment?: number | null;
};

type PointBalance = {
  id: string;
  user_id: string;
  currency_id: string;
  player_number: number;
  balance: number;
  expiration_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_update_source: string | null;
};

type Player = {
  player_number: number;
  description: string | null;
};

interface BalanceTableProps {
  title: string;
  currencies: Currency[];
  players: Player[];
  balanceMap: Record<string, PointBalance>;
  currencyValues: Record<string, number>;
  onUpdateBalance: (currencyId: string, playerNumber: number, balance: number, expirationDate: string | null, notes: string | null) => Promise<void>;
  onDeleteBalance: (currencyId: string, playerNumber: number) => Promise<void>;
  showAlliance?: boolean;
}

const allianceLabels: Record<string, { label: string; color: string; bg: string }> = {
  star_alliance: { label: "SA", color: "text-amber-400", bg: "bg-amber-400/10" },
  oneworld: { label: "OW", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  skyteam: { label: "ST", color: "text-sky-400", bg: "bg-sky-400/10" },
};

// Shared style classes for consistency with wallet table
const STYLES = {
  editable: "text-zinc-400 underline decoration-dashed underline-offset-4 decoration-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer",
  editableEmpty: "text-zinc-500 underline decoration-dashed underline-offset-4 decoration-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer",
  synced: "text-zinc-400 italic hover:text-zinc-300 transition-colors cursor-pointer", // No underline for tampermonkey/synced entries
  readOnly: "text-zinc-400",
  empty: "text-zinc-600",
} as const;

type SortField = "currency" | "total" | "value" | "totalValue" | number; // number for player columns
type SortDirection = "asc" | "desc";

// Sort indicator using SVG arrows (matches compare table)
function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return null;
  return (
    <svg className="w-3.5 h-3.5 ml-1 text-blue-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === "asc" ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function formatNumber(num: number): string {
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

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false;
  const expDate = new Date(date);
  const now = new Date();
  const daysDiff = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff <= 90 && daysDiff >= 0;
}

function isExpired(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function BalanceTable({
  title,
  currencies,
  players,
  balanceMap,
  currencyValues,
  onUpdateBalance,
  onDeleteBalance,
  showAlliance = false,
}: BalanceTableProps) {
  const [editingCell, setEditingCell] = useState<{ currencyId: string; playerNumber: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortField, setSortField] = useState<SortField>("currency");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Calculate totals per currency
  const getTotals = (currency: Currency) => {
    let totalPoints = 0;
    players.forEach(player => {
      const balance = balanceMap[`${currency.id}-${player.player_number}`];
      if (balance) {
        totalPoints += Number(balance.balance);
      }
    });
    const valueCents = currencyValues[currency.id] ?? 1; // Default 1 cent per point
    const totalValue = (totalPoints * valueCents) / 100; // Convert cents to dollars
    return { totalPoints, totalValue, valueCpp: valueCents }; // valueCpp is already in cents
  };

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "currency" ? "asc" : "desc"); // Default desc for numbers
    }
  };

  // Sort currencies
  const sortedCurrencies = useMemo(() => {
    return [...currencies].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "currency") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "total") {
        aVal = getTotals(a).totalPoints;
        bVal = getTotals(b).totalPoints;
      } else if (sortField === "value") {
        aVal = getTotals(a).valueCpp;
        bVal = getTotals(b).valueCpp;
      } else if (sortField === "totalValue") {
        aVal = getTotals(a).totalValue;
        bVal = getTotals(b).totalValue;
      } else if (typeof sortField === "number") {
        // Player column
        const aBalance = balanceMap[`${a.id}-${sortField}`];
        const bBalance = balanceMap[`${b.id}-${sortField}`];
        aVal = aBalance?.balance ?? 0;
        bVal = bBalance?.balance ?? 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [currencies, sortField, sortDirection, balanceMap, currencyValues]);

  const handleSave = async (
    currencyId: string,
    playerNumber: number,
    balance: number,
    expirationDate: string | null,
    notes: string | null
  ) => {
    startTransition(async () => {
      await onUpdateBalance(currencyId, playerNumber, balance, expirationDate, notes);
      setEditingCell(null);
    });
  };

  const handleDelete = async (currencyId: string, playerNumber: number) => {
    startTransition(async () => {
      await onDeleteBalance(currencyId, playerNumber);
      setEditingCell(null);
    });
  };

  // Get player column headers
  const getPlayerLabel = (player: Player) => {
    if (player.description) {
      // Use first 2 chars of description
      return player.description.substring(0, 2).toUpperCase();
    }
    return `P${player.player_number}`;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button 
        className="w-full px-4 py-3 border-b border-zinc-800 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <svg 
            className={`w-4 h-4 text-zinc-500 transition-transform ${isCollapsed ? "" : "rotate-90"}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className="text-sm text-zinc-500">{currencies.length} currencies</span>
      </button>
      
      {!isCollapsed && (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
              <th 
                className="px-4 py-3 font-medium sticky left-0 z-10 bg-zinc-900 w-[240px] min-w-[240px] cursor-pointer hover:text-white transition-colors border-r border-zinc-700"
                onClick={() => handleSort("currency")}
                style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}
              >
                <span className="inline-flex items-center">
                  Program
                  <SortIndicator active={sortField === "currency"} direction={sortDirection} />
                </span>
              </th>
              {players.map(player => (
                <th 
                  key={player.player_number} 
                  className="px-3 py-3 font-medium text-center cursor-pointer hover:text-white transition-colors min-w-[90px]"
                  title={player.description || `Player ${player.player_number}`}
                  onClick={() => handleSort(player.player_number)}
                >
                  <span className="inline-flex items-center justify-center">
                    {getPlayerLabel(player)}
                    <SortIndicator active={sortField === player.player_number} direction={sortDirection} />
                  </span>
                </th>
              ))}
              <th 
                className="px-3 py-3 font-medium text-right min-w-[100px] cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("total")}
              >
                <span className="inline-flex items-center justify-end">
                  Total
                  <SortIndicator active={sortField === "total"} direction={sortDirection} />
                </span>
              </th>
              <th 
                className="px-3 py-3 font-medium text-right min-w-[80px] cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("value")}
              >
                <span className="inline-flex items-center justify-end">
                  Point Value
                  <SortIndicator active={sortField === "value"} direction={sortDirection} />
                </span>
              </th>
              <th 
                className="px-3 py-3 font-medium text-right min-w-[100px] cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("totalValue")}
              >
                <span className="inline-flex items-center justify-end">
                  Total Value
                  <SortIndicator active={sortField === "totalValue"} direction={sortDirection} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sortedCurrencies.map(currency => {
              const totals = getTotals(currency);

              return (
                <tr
                  key={currency.id}
                  className="hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Program name with alliance at end */}
                  <td 
                    className="px-4 py-2 sticky left-0 z-10 bg-zinc-900 w-[240px] min-w-[240px] border-r border-zinc-700"
                    style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        <span className="text-white font-medium truncate">{currency.name}</span>
                        {currency.program_name && (
                          <span className="text-xs text-zinc-500 truncate">{currency.program_name}</span>
                        )}
                      </div>
                      {/* Alliance badge at end - only for airlines */}
                      {showAlliance && (
                        <span className="w-6 text-center shrink-0">
                          {currency.alliance && allianceLabels[currency.alliance] ? (
                            <span className={`text-xs font-medium ${allianceLabels[currency.alliance].color}`}>
                              {allianceLabels[currency.alliance].label}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Player balances */}
                  {players.map(player => {
                    const key = `${currency.id}-${player.player_number}`;
                    const balance = balanceMap[key];
                    const isEditing = editingCell?.currencyId === currency.id && editingCell?.playerNumber === player.player_number;
                    const hasExpiration = balance?.expiration_date;
                    const expiringSoon = isExpiringSoon(balance?.expiration_date ?? null);
                    const expired = isExpired(balance?.expiration_date ?? null);

                    return (
                      <td key={player.player_number} className="px-3 py-3 text-center relative">
                        {isEditing ? (
                          <BalanceEditPopover
                            initialBalance={balance?.balance ?? 0}
                            initialExpiration={balance?.expiration_date ?? null}
                            initialNotes={balance?.notes ?? null}
                            currencyName={currency.name}
                            expirationPolicy={currency.expiration_policy ?? null}
                            onSave={(bal, exp, notes) => handleSave(currency.id, player.player_number, bal, exp, notes)}
                            onDelete={balance ? () => handleDelete(currency.id, player.player_number) : undefined}
                            onClose={() => setEditingCell(null)}
                            isPending={isPending}
                          />
                        ) : (
                          (() => {
                            // Determine if synced via tampermonkey
                            const isSynced = balance?.last_update_source === "tampermonkey";
                            
                            // Build tooltip text
                            const tooltipLines: string[] = [];
                            if (hasExpiration) {
                              tooltipLines.push(`Expires: ${new Date(balance.expiration_date!).toLocaleDateString()}`);
                            }
                            if (balance?.notes) {
                              tooltipLines.push(`Note: ${balance.notes}`);
                            }
                            if (balance?.updated_at) {
                              const sourceLabel = isSynced ? "(synced)" : "(manual)";
                              tooltipLines.push(`Last Updated: ${new Date(balance.updated_at).toLocaleDateString()} ${sourceLabel}`);
                            }
                            const tooltipText = tooltipLines.join("\n");
                            const hasTooltip = tooltipLines.length > 0;

                            // Choose style based on sync source
                            const getStyle = () => {
                              if (!balance || balance.balance <= 0) return STYLES.editableEmpty;
                              return isSynced ? STYLES.synced : STYLES.editable;
                            };

                            const buttonContent = (
                              <button
                                onClick={() => setEditingCell({ currencyId: currency.id, playerNumber: player.player_number })}
                                className={`text-center w-full ${getStyle()}`}
                              >
                                <span>
                                  {balance && balance.balance > 0
                                    ? formatNumber(Number(balance.balance))
                                    : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                                </span>
                                {hasExpiration && (
                                  <span
                                    className={`ml-1 ${
                                      expired ? "text-red-400" : expiringSoon ? "text-amber-400" : "text-zinc-500"
                                    }`}
                                  >
                                    †
                                  </span>
                                )}
                              </button>
                            );

                            return hasTooltip ? (
                              <Tooltip text={tooltipText} multiline>
                                {buttonContent}
                              </Tooltip>
                            ) : buttonContent;
                          })()
                        )}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td className="px-3 py-3 text-right">
                    <span className={totals.totalPoints > 0 ? "text-white font-medium" : STYLES.empty}>
                      {totals.totalPoints > 0 ? formatNumber(totals.totalPoints) : "—"}
                    </span>
                  </td>

                  {/* Point Value */}
                  <td className="px-3 py-3 text-right">
                    <span className="text-zinc-400">
                      {totals.valueCpp.toFixed(2)}¢
                    </span>
                  </td>

                  {/* Total Value */}
                  <td className="px-3 py-3 text-right">
                    <span className={totals.totalValue > 0 ? "text-emerald-400 font-medium" : STYLES.empty}>
                      {totals.totalValue > 0 ? formatCurrency(totals.totalValue) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals footer */}
          <tfoot className="border-t border-zinc-700 bg-zinc-800/50">
            <tr>
              <td 
                className="px-4 py-3 sticky left-0 z-10 bg-zinc-800/50 w-[240px] min-w-[240px] border-r border-zinc-700 font-semibold text-white"
                style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}
              >
                Total
              </td>
              {players.map(player => {
                let playerTotal = 0;
                currencies.forEach(currency => {
                  const balance = balanceMap[`${currency.id}-${player.player_number}`];
                  if (balance) playerTotal += Number(balance.balance);
                });
                return (
                  <td key={player.player_number} className="px-3 py-3 text-center">
                    <span className={playerTotal > 0 ? "text-white font-medium" : STYLES.empty}>
                      {playerTotal > 0 ? formatNumber(playerTotal) : "—"}
                    </span>
                  </td>
                );
              })}
              <td className="px-3 py-3 text-right">
                {(() => {
                  let grandTotal = 0;
                  currencies.forEach(currency => {
                    grandTotal += getTotals(currency).totalPoints;
                  });
                  return (
                    <span className={grandTotal > 0 ? "text-white font-semibold" : STYLES.empty}>
                      {grandTotal > 0 ? formatNumber(grandTotal) : "—"}
                    </span>
                  );
                })()}
              </td>
              <td className="px-3 py-3 text-right">
                <span className="text-zinc-500">—</span>
              </td>
              <td className="px-3 py-3 text-right">
                {(() => {
                  let grandTotalValue = 0;
                  currencies.forEach(currency => {
                    grandTotalValue += getTotals(currency).totalValue;
                  });
                  return (
                    <span className={grandTotalValue > 0 ? "text-emerald-400 font-semibold" : STYLES.empty}>
                      {grandTotalValue > 0 ? formatCurrency(grandTotalValue) : "—"}
                    </span>
                  );
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </div>
  );
}
