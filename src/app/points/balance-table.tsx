"use client";

import { useState, useTransition, useMemo, useRef, useCallback } from "react";
import { BalanceEditPopover } from "./balance-edit-popover";

// Fixed-position tooltip that escapes overflow containers (like compare table)
function Tooltip({ children, text, multiline }: { children: React.ReactNode; text: string; multiline?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, showBelow: false });
  const ref = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const showBelow = rect.top < 80;
      setCoords({
        top: showBelow ? rect.bottom + 4 : rect.top - 4,
        left: rect.left + rect.width / 2,
        showBelow,
      });
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    updatePosition();
    setIsVisible(true);
  }, [updatePosition]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <span 
      ref={ref}
      className="inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <span 
          className={`fixed px-2 py-1.5 text-xs text-white bg-zinc-800 border border-zinc-600 rounded shadow-lg z-[9999] pointer-events-none -translate-x-1/2 ${multiline ? "whitespace-pre-line text-left min-w-[180px]" : "whitespace-nowrap"}`}
          style={{
            top: coords.showBelow ? coords.top : 'auto',
            bottom: coords.showBelow ? 'auto' : `calc(100vh - ${coords.top}px)`,
            left: coords.left,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

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
  balancePageUrls?: Record<string, string>;
  onUpdateBalance: (currencyId: string, playerNumber: number, balance: number, expirationDate: string | null, notes: string | null) => Promise<void>;
  onDeleteBalance: (currencyId: string, playerNumber: number) => Promise<void>;
  showAlliance?: boolean;
  canArchive?: (currency: Currency) => boolean;
  onArchiveCurrency?: (currencyId: string) => Promise<void>;
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
  balancePageUrls = {},
  onUpdateBalance,
  onDeleteBalance,
  showAlliance = false,
  canArchive,
  onArchiveCurrency,
}: BalanceTableProps) {
  const [editingCell, setEditingCell] = useState<{ currencyId: string; playerNumber: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortField, setSortField] = useState<SortField>("currency");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const editingCellRef = useRef<HTMLTableCellElement | null>(null);

  const handleArchive = (currencyId: string) => {
    if (onArchiveCurrency) {
      startTransition(async () => {
        await onArchiveCurrency(currencyId);
      });
    }
  };

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
      <div className="overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
              <th 
                className="px-4 py-3 font-medium sticky left-0 top-0 z-30 bg-zinc-900 w-[240px] min-w-[240px] cursor-pointer hover:text-white transition-colors border-r border-zinc-700"
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
                  className="sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-medium text-center cursor-pointer hover:text-white transition-colors min-w-[90px]"
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
                className="sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-medium text-right min-w-[100px] cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("total")}
              >
                <span className="inline-flex items-center justify-end">
                  Total
                  <SortIndicator active={sortField === "total"} direction={sortDirection} />
                </span>
              </th>
              <th 
                className="sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-medium text-right min-w-[80px] cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("value")}
              >
                <span className="inline-flex items-center justify-end">
                  Point Value
                  <SortIndicator active={sortField === "value"} direction={sortDirection} />
                </span>
              </th>
              <th 
                className="sticky top-0 z-20 bg-zinc-900 px-3 py-3 font-medium text-right min-w-[100px] cursor-pointer hover:text-white transition-colors"
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
                        {balancePageUrls[currency.code] ? (
                          <a
                            href={balancePageUrls[currency.code]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white font-medium truncate hover:text-blue-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {currency.name}
                          </a>
                        ) : (
                          <span className="text-white font-medium truncate">{currency.name}</span>
                        )}
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
                      {/* Archive button - only show when balance is 0 */}
                      {canArchive && canArchive(currency) && onArchiveCurrency && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(currency.id);
                          }}
                          disabled={isPending}
                          className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors shrink-0"
                          title="Hide program"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
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
                      <td 
                        key={player.player_number} 
                        className="px-3 py-3 text-center relative"
                        ref={isEditing ? editingCellRef : undefined}
                      >
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
                            anchorRef={editingCellRef}
                          />
                        ) : (
                          (() => {
                            // Determine if synced via tampermonkey
                            const isSynced = balance?.last_update_source === "tampermonkey";
                            
                            // Build tooltip text
                            const tooltipLines: string[] = [];
                            if (hasExpiration) {
                              tooltipLines.push(`Expire: ${new Date(balance.expiration_date!).toLocaleDateString()}`);
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

                            // Determine text color based on expiration
                            const getBalanceColor = () => {
                              if (!balance || balance.balance <= 0) return "";
                              if (expired) return "text-red-400";
                              if (expiringSoon) return "text-red-400";
                              return "";
                            };

                            const buttonContent = (
                              <button
                                onClick={() => setEditingCell({ currencyId: currency.id, playerNumber: player.player_number })}
                                className={`text-center w-full ${getStyle()}`}
                              >
                                <span className={getBalanceColor()}>
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
