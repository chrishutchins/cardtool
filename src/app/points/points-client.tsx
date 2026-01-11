"use client";

import { useState, useMemo, useTransition } from "react";
import { SummaryCards } from "./summary-cards";
import { BalanceTable } from "./balance-table";

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

interface PointsClientProps {
  currencies: Currency[];
  balances: PointBalance[];
  players: Player[];
  currencyValues: Record<string, number>;
  walletCurrencyIds: string[];
  trackedCurrencyIds: string[];
  archivedCurrencyIds: string[];
  onUpdateBalance: (currencyId: string, playerNumber: number, balance: number, expirationDate: string | null, notes: string | null) => Promise<void>;
  onDeleteBalance: (currencyId: string, playerNumber: number) => Promise<void>;
  onTrackCurrency: (currencyId: string) => Promise<void>;
  onArchiveCurrency: (currencyId: string) => Promise<void>;
}

export function PointsClient({
  currencies,
  balances,
  players,
  currencyValues,
  walletCurrencyIds,
  trackedCurrencyIds,
  archivedCurrencyIds,
  onUpdateBalance,
  onDeleteBalance,
  onTrackCurrency,
  onArchiveCurrency,
}: PointsClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Convert to Sets for O(1) lookup
  const walletCurrencySet = useMemo(() => new Set(walletCurrencyIds), [walletCurrencyIds]);
  const trackedCurrencySet = useMemo(() => new Set(trackedCurrencyIds), [trackedCurrencyIds]);
  const archivedCurrencySet = useMemo(() => new Set(archivedCurrencyIds), [archivedCurrencyIds]);
  // If no players defined, default to player 1
  const effectivePlayers = players.length > 0 ? players : [{ player_number: 1, description: null }];
  
  // Create balance lookup map
  const balanceMap = useMemo(() => {
    const map: Record<string, PointBalance> = {};
    balances.forEach(b => {
      map[`${b.currency_id}-${b.player_number}`] = b;
    });
    return map;
  }, [balances]);

  // Helper to check if currency has any balance
  const currencyHasBalance = (currency: Currency): boolean => {
    return effectivePlayers.some(player => {
      const balance = balanceMap[`${currency.id}-${player.player_number}`];
      return balance && balance.balance > 0;
    });
  };

  // Determine if a currency should be visible
  // Show if: (has balance > 0 OR earned by wallet card OR explicitly tracked) AND NOT archived
  const shouldShowCurrency = (currency: Currency): boolean => {
    if (archivedCurrencySet.has(currency.id)) return false;
    return currencyHasBalance(currency) || walletCurrencySet.has(currency.id) || trackedCurrencySet.has(currency.id);
  };

  // Check if currency can be archived (only if total balance is 0)
  const canArchive = (currency: Currency): boolean => {
    return !currencyHasBalance(currency);
  };

  // Calculate summaries
  const summary = useMemo(() => {
    let totalPoints = 0;
    let totalValue = 0;
    
    // "banks" groups transferable_points, cash_back, and crypto
    const byType: Record<string, { points: number; value: number }> = {
      banks: { points: 0, value: 0 },
      hotel_points: { points: 0, value: 0 },
      airline_miles: { points: 0, value: 0 },
    };

    const byAlliance: Record<string, { points: number; value: number }> = {
      star_alliance: { points: 0, value: 0 },
      oneworld: { points: 0, value: 0 },
      skyteam: { points: 0, value: 0 },
      none: { points: 0, value: 0 },
    };

    // Per-player totals
    const byPlayer: Record<number, { points: number; value: number; label: string }> = {};
    effectivePlayers.forEach(player => {
      byPlayer[player.player_number] = {
        points: 0,
        value: 0,
        label: player.description?.substring(0, 2).toUpperCase() || `P${player.player_number}`,
      };
    });

    currencies.forEach(currency => {
      const valueCents = currencyValues[currency.id] ?? 1; // Default 1 cent per point
      
      effectivePlayers.forEach(player => {
        const balance = balanceMap[`${currency.id}-${player.player_number}`];
        if (balance && balance.balance > 0) {
          const points = Number(balance.balance);
          const value = (points * valueCents) / 100; // Convert cents to dollars

          totalPoints += points;
          totalValue += value;

          // By player
          byPlayer[player.player_number].points += points;
          byPlayer[player.player_number].value += value;

          // By type - banks = everything that's not airlines or hotels
          const type = currency.currency_type;
          if (type === "airline_miles") {
            byType.airline_miles.points += points;
            byType.airline_miles.value += value;
          } else if (type === "hotel_points") {
            byType.hotel_points.points += points;
            byType.hotel_points.value += value;
          } else {
            // Everything else goes to banks (transferable, non-transferable, cash_back, crypto)
            byType.banks.points += points;
            byType.banks.value += value;
          }

          // By alliance (for airline miles)
          if (currency.currency_type === "airline_miles") {
            const alliance = currency.alliance || "none";
            if (byAlliance[alliance]) {
              byAlliance[alliance].points += points;
              byAlliance[alliance].value += value;
            } else {
              byAlliance.none.points += points;
              byAlliance.none.value += value;
            }
          }
        }
      });
    });

    return { totalPoints, totalValue, byType, byAlliance, byPlayer };
  }, [currencies, balanceMap, currencyValues, effectivePlayers]);

  // Group currencies by type - using visibility rules
  // Banks = everything that's not airlines or hotels (includes transferable, non-transferable, cash back, crypto)
  const bankCurrencies = currencies
    .filter(c => c.currency_type !== "airline_miles" && c.currency_type !== "hotel_points")
    .filter(shouldShowCurrency);
  
  const hotelPoints = currencies
    .filter(c => c.currency_type === "hotel_points")
    .filter(shouldShowCurrency);
  
  const airlineMiles = currencies
    .filter(c => c.currency_type === "airline_miles")
    .filter(shouldShowCurrency);

  // Sort airline miles by alliance
  const sortedAirlineMiles = [...airlineMiles].sort((a, b) => {
    const allianceOrder: Record<string, number> = { star_alliance: 0, oneworld: 1, skyteam: 2 };
    const aOrder = a.alliance ? (allianceOrder[a.alliance] ?? 3) : 3;
    const bOrder = b.alliance ? (allianceOrder[b.alliance] ?? 3) : 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  // Currencies available to add (not already visible and not archived)
  const addableCurrencies = useMemo(() => {
    return currencies.filter(c => !shouldShowCurrency(c) && !archivedCurrencySet.has(c.id));
  }, [currencies, shouldShowCurrency, archivedCurrencySet]);

  // Filter addable currencies by search
  const filteredAddable = useMemo(() => {
    if (!addSearch.trim()) return addableCurrencies;
    const search = addSearch.toLowerCase();
    return addableCurrencies.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.code.toLowerCase().includes(search) ||
      (c.program_name?.toLowerCase().includes(search))
    );
  }, [addableCurrencies, addSearch]);

  const handleTrackCurrency = (currencyId: string) => {
    startTransition(async () => {
      await onTrackCurrency(currencyId);
      setShowAddModal(false);
      setAddSearch("");
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Points Balances</h1>
          <p className="text-zinc-400 mt-1">Track your points and miles across all currencies</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Program
        </button>
      </div>

      {/* Add Program Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add Program to Track</h2>
              <button
                onClick={() => { setShowAddModal(false); setAddSearch(""); }}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800">
              <input
                type="text"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Search programs..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filteredAddable.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">
                  {addSearch ? "No matching programs found" : "All programs are already being tracked"}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredAddable.map(currency => (
                    <button
                      key={currency.id}
                      onClick={() => handleTrackCurrency(currency.id)}
                      disabled={isPending}
                      className="w-full px-3 py-2 rounded-lg text-left hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-white font-medium">{currency.name}</span>
                        {currency.program_name && (
                          <span className="text-zinc-500 text-sm ml-2">{currency.program_name}</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 uppercase">{currency.currency_type.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Banks (Transferable Points + Cash Back + Crypto) */}
      {bankCurrencies.length > 0 && (
        <BalanceTable
          title="Banks"
          currencies={bankCurrencies}
          players={effectivePlayers}
          balanceMap={balanceMap}
          currencyValues={currencyValues}
          onUpdateBalance={onUpdateBalance}
          onDeleteBalance={onDeleteBalance}
          canArchive={canArchive}
          onArchiveCurrency={onArchiveCurrency}
        />
      )}

      {/* Airlines (Airline Miles) */}
      {sortedAirlineMiles.length > 0 && (
        <BalanceTable
          title="Airlines"
          currencies={sortedAirlineMiles}
          players={effectivePlayers}
          balanceMap={balanceMap}
          currencyValues={currencyValues}
          onUpdateBalance={onUpdateBalance}
          onDeleteBalance={onDeleteBalance}
          showAlliance
          canArchive={canArchive}
          onArchiveCurrency={onArchiveCurrency}
        />
      )}

      {/* Hotel Points */}
      {hotelPoints.length > 0 && (
        <BalanceTable
          title="Hotels"
          currencies={hotelPoints}
          players={effectivePlayers}
          balanceMap={balanceMap}
          currencyValues={currencyValues}
          onUpdateBalance={onUpdateBalance}
          onDeleteBalance={onDeleteBalance}
          canArchive={canArchive}
          onArchiveCurrency={onArchiveCurrency}
        />
      )}

      {/* Empty state */}
      {bankCurrencies.length === 0 && sortedAirlineMiles.length === 0 && hotelPoints.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-4">No programs being tracked yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            Add Your First Program
          </button>
        </div>
      )}
    </div>
  );
}
