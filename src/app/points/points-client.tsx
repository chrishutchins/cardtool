"use client";

import { useState, useMemo } from "react";
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
  onUpdateBalance: (currencyId: string, playerNumber: number, balance: number, expirationDate: string | null, notes: string | null) => Promise<void>;
  onDeleteBalance: (currencyId: string, playerNumber: number) => Promise<void>;
}

export function PointsClient({
  currencies,
  balances,
  players,
  currencyValues,
  onUpdateBalance,
  onDeleteBalance,
}: PointsClientProps) {
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

  // Group currencies by type - only include those with balances
  // Banks = everything that's not airlines or hotels (includes transferable, non-transferable, cash back, crypto)
  const bankCurrencies = currencies
    .filter(c => c.currency_type !== "airline_miles" && c.currency_type !== "hotel_points")
    .filter(currencyHasBalance);
  
  const hotelPoints = currencies
    .filter(c => c.currency_type === "hotel_points")
    .filter(currencyHasBalance);
  
  const airlineMiles = currencies
    .filter(c => c.currency_type === "airline_miles")
    .filter(currencyHasBalance);

  // Sort airline miles by alliance
  const sortedAirlineMiles = [...airlineMiles].sort((a, b) => {
    const allianceOrder: Record<string, number> = { star_alliance: 0, oneworld: 1, skyteam: 2 };
    const aOrder = a.alliance ? (allianceOrder[a.alliance] ?? 3) : 3;
    const bOrder = b.alliance ? (allianceOrder[b.alliance] ?? 3) : 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
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
        />
      )}
    </div>
  );
}
