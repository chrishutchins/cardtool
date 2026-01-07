"use client";

import { useState, useTransition, useMemo } from "react";
import { parseLocalDate } from "@/lib/utils";

interface WalletCard {
  id: string;
  card_id: string;
  custom_name: string | null;
  added_at: string | null;
  approval_date: string | null;
  player_number: number | null;
  cards: {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    issuers: { name: string } | null;
    primary_currency: { name: string; code: string; currency_type: string } | null;
    secondary_currency: { name: string; code: string; currency_type: string } | null;
  } | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

interface WalletCardListProps {
  walletCards: WalletCard[];
  enabledSecondaryCards: Set<string>;
  perksMap: Map<string, number>;
  debitPayMap?: Map<string, number>;
  debitPayEnabled?: boolean;
  onRemove: (walletId: string) => Promise<void>;
  onUpdatePerks: (walletCardId: string, perksValue: number) => Promise<void>;
  onUpdateDebitPay?: (walletCardId: string, percent: number) => Promise<void>;
  onUpdateCustomName?: (walletId: string, customName: string | null) => Promise<void>;
  onUpdateApprovalDate?: (walletId: string, date: string | null) => Promise<void>;
  players?: Player[];
  playerCount?: number;
  onUpdatePlayerNumber?: (walletId: string, playerNumber: number) => Promise<void>;
}

type SortField = "name" | "issuer" | "currency" | "annual_fee" | "perks" | "net_fee" | "debit_pay" | "player";
type SortDirection = "asc" | "desc";

const currencyTypeConfig: Record<string, { label: string; className: string }> = {
  airline_miles: { 
    label: "✈️ Airline Miles", 
    className: "bg-sky-500/20 text-sky-300 border border-sky-500/30" 
  },
  hotel_points: { 
    label: "🏨 Hotel Points", 
    className: "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
  },
  transferable_points: { 
    label: "🔄 Transferable", 
    className: "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
  },
  non_transferable_points: { 
    label: "📍 Non-Transferable", 
    className: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
  },
  cash_back: { 
    label: "💵 Cash Back", 
    className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
  },
  crypto: { 
    label: "₿ Crypto", 
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30" 
  },
  other: { 
    label: "Other", 
    className: "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30" 
  },
  // Legacy types
  points: { 
    label: "Points", 
    className: "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
  },
  cash: { 
    label: "Cash", 
    className: "bg-green-500/20 text-green-300 border border-green-500/30" 
  },
  miles: { 
    label: "Miles", 
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
  },
};

export function WalletCardList({
  walletCards,
  enabledSecondaryCards,
  perksMap,
  debitPayMap = new Map(),
  debitPayEnabled = false,
  onRemove,
  onUpdatePerks,
  onUpdateDebitPay,
  onUpdateCustomName,
  onUpdateApprovalDate,
  players = [],
  playerCount = 1,
  onUpdatePlayerNumber,
}: WalletCardListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingPerksId, setEditingPerksId] = useState<string | null>(null);
  const [editPerksValue, setEditPerksValue] = useState<string>("");
  const [editingDebitPayId, setEditingDebitPayId] = useState<string | null>(null);
  const [editDebitPayValue, setEditDebitPayValue] = useState<string>("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [editingApprovalDateId, setEditingApprovalDateId] = useState<string | null>(null);
  const [editApprovalDateValue, setEditApprovalDateValue] = useState<string>("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  // Optimistic custom names - immediately show updated names while server action runs
  const [optimisticNames, setOptimisticNames] = useState<Map<string, string | null>>(new Map());
  // Optimistic player numbers
  const [optimisticPlayers, setOptimisticPlayers] = useState<Map<string, number>>(new Map());
  const [isPending, startTransition] = useTransition();
  
  // Build player description map
  const playerDescriptions = useMemo(() => {
    const map = new Map<number, string>();
    players.forEach(p => {
      map.set(p.player_number, p.description || `Player ${p.player_number}`);
    });
    return map;
  }, [players]);
  
  // Show player column if playerCount > 1
  const showPlayerColumn = playerCount > 1;
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [issuerFilter, setIssuerFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Get unique issuers and currency types for filters
  const { issuers, currencyTypes } = useMemo(() => {
    const issuerSet = new Set<string>();
    const currencySet = new Set<string>();
    
    walletCards.forEach((wc) => {
      if (wc.cards?.issuers?.name) issuerSet.add(wc.cards.issuers.name);
      const activeCurrency = enabledSecondaryCards.has(wc.cards?.id ?? "") && wc.cards?.secondary_currency
        ? wc.cards.secondary_currency
        : wc.cards?.primary_currency;
      if (activeCurrency?.currency_type) currencySet.add(activeCurrency.currency_type);
    });
    
    return {
      issuers: Array.from(issuerSet).sort(),
      currencyTypes: Array.from(currencySet).sort(),
    };
  }, [walletCards, enabledSecondaryCards]);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let result = walletCards.filter((wc) => {
      if (!wc.cards) return false;
      const card = wc.cards;
      
      // Search filter - include custom_name in search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const optimisticName = optimisticNames.get(wc.id);
        const effectiveCustomName = optimisticName !== undefined ? optimisticName : wc.custom_name;
        const displayName = effectiveCustomName ?? card.name;
        const matchesName = displayName.toLowerCase().includes(query);
        const matchesCardName = card.name.toLowerCase().includes(query);
        const matchesIssuer = card.issuers?.name.toLowerCase().includes(query);
        if (!matchesName && !matchesCardName && !matchesIssuer) return false;
      }
      
      // Issuer filter
      if (issuerFilter && card.issuers?.name !== issuerFilter) return false;
      
      // Currency filter
      if (currencyFilter) {
        const activeCurrency = enabledSecondaryCards.has(card.id) && card.secondary_currency
          ? card.secondary_currency
          : card.primary_currency;
        if (activeCurrency?.currency_type !== currencyFilter) return false;
      }
      
      return true;
    });
    
    // Sort
    result.sort((a, b) => {
      if (!a.cards || !b.cards) return 0;
      
      // perksMap is now keyed by wallet entry ID (a.id), not card type ID (a.cards.id)
      const aPerks = perksMap.get(a.id) ?? 0;
      const bPerks = perksMap.get(b.id) ?? 0;
      const aNet = a.cards.annual_fee - aPerks;
      const bNet = b.cards.annual_fee - bPerks;
      const aActiveCurrency = enabledSecondaryCards.has(a.cards.id) && a.cards.secondary_currency
        ? a.cards.secondary_currency
        : a.cards.primary_currency;
      const bActiveCurrency = enabledSecondaryCards.has(b.cards.id) && b.cards.secondary_currency
        ? b.cards.secondary_currency
        : b.cards.primary_currency;
      
      // debitPayMap is now keyed by wallet entry ID (a.id), not card type ID (a.cards.id)
      const aDebitPay = debitPayMap.get(a.id) ?? 0;
      const bDebitPay = debitPayMap.get(b.id) ?? 0;
      
      // Use optimistic name, then custom_name, then card name
      const aOptimistic = optimisticNames.get(a.id);
      const bOptimistic = optimisticNames.get(b.id);
      const aEffective = aOptimistic !== undefined ? aOptimistic : a.custom_name;
      const bEffective = bOptimistic !== undefined ? bOptimistic : b.custom_name;
      const aDisplayName = aEffective ?? a.cards.name;
      const bDisplayName = bEffective ?? b.cards.name;
      
      // Get player number (use optimistic if available)
      const aPlayer = optimisticPlayers.get(a.id) ?? a.player_number ?? 1;
      const bPlayer = optimisticPlayers.get(b.id) ?? b.player_number ?? 1;
      
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = aDisplayName.localeCompare(bDisplayName);
          break;
        case "issuer":
          comparison = (a.cards.issuers?.name ?? "").localeCompare(b.cards.issuers?.name ?? "");
          break;
        case "currency":
          comparison = (aActiveCurrency?.currency_type ?? "").localeCompare(bActiveCurrency?.currency_type ?? "");
          break;
        case "annual_fee":
          comparison = a.cards.annual_fee - b.cards.annual_fee;
          break;
        case "perks":
          comparison = aPerks - bPerks;
          break;
        case "net_fee":
          comparison = aNet - bNet;
          break;
        case "debit_pay":
          comparison = aDebitPay - bDebitPay;
          break;
        case "player":
          comparison = aPlayer - bPlayer;
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [walletCards, searchQuery, issuerFilter, currencyFilter, sortField, sortDirection, perksMap, debitPayMap, enabledSecondaryCards, optimisticNames, optimisticPlayers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg className="w-4 h-4 ml-1 text-blue-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === "asc" ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  const formatFee = (fee: number) => {
    return `$${fee}`;
  };

  const handleEditPerks = (walletCardId: string, currentValue: number) => {
    setEditingPerksId(walletCardId);
    setEditPerksValue(currentValue.toString());
  };

  const handleSavePerks = (walletCardId: string) => {
    const value = parseInt(editPerksValue) || 0;
    startTransition(async () => {
      await onUpdatePerks(walletCardId, value);
      setEditingPerksId(null);
    });
  };

  const handleCancelPerks = () => {
    setEditingPerksId(null);
    setEditPerksValue("");
  };

  const handleEditDebitPay = (walletCardId: string, currentValue: number) => {
    setEditingDebitPayId(walletCardId);
    setEditDebitPayValue(currentValue.toString());
  };

  const handleSaveDebitPay = (walletCardId: string) => {
    const value = parseFloat(editDebitPayValue) || 0;
    if (onUpdateDebitPay) {
      startTransition(async () => {
        await onUpdateDebitPay(walletCardId, value);
        setEditingDebitPayId(null);
      });
    }
  };

  const handleCancelDebitPay = () => {
    setEditingDebitPayId(null);
    setEditDebitPayValue("");
  };

  const handleEditName = (walletId: string, currentName: string) => {
    setEditingNameId(walletId);
    setEditNameValue(currentName);
  };

  const handleSaveName = (walletId: string) => {
    const trimmedValue = editNameValue.trim();
    if (onUpdateCustomName) {
      // Optimistically update the name immediately
      const newValue = trimmedValue || null;
      setOptimisticNames(prev => {
        const next = new Map(prev);
        next.set(walletId, newValue);
        return next;
      });
      setEditingNameId(null);
      
      startTransition(async () => {
        // If empty, clear the custom name (will show card name instead)
        await onUpdateCustomName(walletId, newValue);
        // Clear optimistic state after server confirms (revalidatePath will update props)
        setOptimisticNames(prev => {
          const next = new Map(prev);
          next.delete(walletId);
          return next;
        });
      });
    }
  };

  const handleCancelName = () => {
    setEditingNameId(null);
    setEditNameValue("");
  };

  const handleEditApprovalDate = (walletId: string, currentDate: string | null) => {
    setEditingApprovalDateId(walletId);
    setEditApprovalDateValue(currentDate ?? "");
  };

  const handleSaveApprovalDate = (walletId: string) => {
    if (onUpdateApprovalDate) {
      const dateValue = editApprovalDateValue || null;
      startTransition(async () => {
        await onUpdateApprovalDate(walletId, dateValue);
        setEditingApprovalDateId(null);
      });
    }
  };

  const handleCancelApprovalDate = () => {
    setEditingApprovalDateId(null);
    setEditApprovalDateValue("");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none w-48"
        />
        <select
          value={issuerFilter}
          onChange={(e) => setIssuerFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Issuers</option>
          {issuers.map((issuer) => (
            <option key={issuer} value={issuer}>{issuer}</option>
          ))}
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Currencies</option>
          {currencyTypes.map((type) => (
            <option key={type} value={type}>
              {currencyTypeConfig[type]?.label ?? type}
            </option>
          ))}
        </select>
        {(searchQuery || issuerFilter || currencyFilter) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setIssuerFilter("");
              setCurrencyFilter("");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-700">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-700">
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort("name")}
              >
                <span className="inline-flex items-center">Card<SortIcon field="name" /></span>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap hidden md:table-cell"
                onClick={() => handleSort("issuer")}
              >
                <span className="inline-flex items-center">Issuer<SortIcon field="issuer" /></span>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap hidden sm:table-cell"
                onClick={() => handleSort("currency")}
              >
                <span className="inline-flex items-center">Currency<SortIcon field="currency" /></span>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap hidden lg:table-cell"
                onClick={() => handleSort("annual_fee")}
              >
                <span className="inline-flex items-center justify-end">Fee<SortIcon field="annual_fee" /></span>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap hidden lg:table-cell"
                onClick={() => handleSort("perks")}
              >
                <span className="inline-flex items-center justify-end">Perks<SortIcon field="perks" /></span>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort("net_fee")}
              >
                <span className="inline-flex items-center justify-end">Net<SortIcon field="net_fee" /></span>
              </th>
              {debitPayEnabled && (
                <th 
                  className="px-4 py-3 text-right text-xs font-medium text-pink-400/70 uppercase cursor-pointer hover:text-pink-400 whitespace-nowrap hidden lg:table-cell"
                  onClick={() => handleSort("debit_pay")}
                  title="Extra % bonus from debit pay"
                >
                  <span className="inline-flex items-center justify-end">Debit +%<SortIcon field="debit_pay" /></span>
                </th>
              )}
              {showPlayerColumn && (
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-white whitespace-nowrap hidden lg:table-cell"
                  onClick={() => handleSort("player")}
                >
                  <span className="inline-flex items-center">Player<SortIcon field="player" /></span>
                </th>
              )}
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase whitespace-nowrap hidden xl:table-cell">
                Opened
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase w-20">
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {filteredAndSortedCards.map((wc) => {
              if (!wc.cards) return null;
              const card = wc.cards;
              const hasSecondaryEnabled = enabledSecondaryCards.has(card.id);
              const activeCurrency = hasSecondaryEnabled && card.secondary_currency
                ? card.secondary_currency
                : card.primary_currency;
              
              // perksMap is now keyed by wallet entry ID (wc.id), not card type ID (card.id)
              const perksValue = perksMap.get(wc.id) ?? 0;
              const netFee = card.annual_fee - perksValue;
              const currencyConfig = currencyTypeConfig[activeCurrency?.currency_type ?? "other"] ?? currencyTypeConfig.other;

              // Check optimistic name first, then fall back to server data
              const optimisticName = optimisticNames.get(wc.id);
              const effectiveCustomName = optimisticName !== undefined ? optimisticName : wc.custom_name;
              const displayName = effectiveCustomName ?? card.name;
              const hasCustomName = !!effectiveCustomName;

              return (
                <tr key={wc.id} className="hover:bg-zinc-800/30">
                  {/* Card Name */}
                  <td className="px-4 py-3">
                    {editingNameId === wc.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          placeholder={card.name}
                          className="w-40 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveName(wc.id);
                            if (e.key === "Escape") handleCancelName();
                          }}
                        />
                        <button
                          onClick={() => handleSaveName(wc.id)}
                          disabled={isPending}
                          className="px-1.5 py-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelName}
                          disabled={isPending}
                          className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditName(wc.id, displayName)}
                        className="text-left group"
                        title="Click to edit name"
                      >
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {displayName}
                          <span className="ml-1 text-zinc-600 group-hover:text-zinc-400 text-xs">✎</span>
                        </div>
                        {hasCustomName && (
                          <div className="text-xs text-zinc-500">{card.name}</div>
                        )}
                      </button>
                    )}
                    {hasSecondaryEnabled && card.secondary_currency && card.primary_currency && (
                      <div className="text-xs text-amber-400 mt-0.5">
                        ↑ {card.secondary_currency.name}
                      </div>
                    )}
                    {/* Mobile: show issuer below name */}
                    <div className="text-zinc-500 text-sm md:hidden">{card.issuers?.name}</div>
                  </td>

                  {/* Issuer */}
                  <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                    {card.issuers?.name}
                  </td>

                  {/* Currency Badge */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${currencyConfig.className}`}>
                      {currencyConfig.label}
                    </span>
                  </td>

                  {/* Annual Fee */}
                  <td className="px-4 py-3 text-right text-zinc-400 hidden lg:table-cell">
                    {formatFee(card.annual_fee)}
                  </td>

                  {/* Perks Value (editable) */}
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {editingPerksId === wc.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-zinc-500">$</span>
                        <input
                          type="number"
                          value={editPerksValue}
                          onChange={(e) => setEditPerksValue(e.target.value)}
                          className="w-16 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSavePerks(wc.id);
                            if (e.key === "Escape") handleCancelPerks();
                          }}
                        />
                        <button
                          onClick={() => handleSavePerks(wc.id)}
                          disabled={isPending}
                          className="px-1.5 py-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelPerks}
                          disabled={isPending}
                          className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditPerks(wc.id, perksValue)}
                        className="text-zinc-400 hover:text-white transition-colors group"
                        title="Click to edit perks value"
                      >
                        {perksValue > 0 ? (
                          <span className="text-emerald-400">-${perksValue}</span>
                        ) : (
                          <span className="text-zinc-600 group-hover:text-zinc-400">$0</span>
                        )}
                        <span className="ml-1 text-zinc-600 group-hover:text-zinc-400 text-xs">✎</span>
                      </button>
                    )}
                  </td>

                  {/* Net Fee */}
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${netFee < 0 ? "text-emerald-400" : "text-zinc-300"}`}>
                      {netFee < 0 ? `-$${Math.abs(netFee)}` : `$${netFee}`}
                    </span>
                  </td>

                  {/* Debit Pay (only if enabled) */}
                  {debitPayEnabled && (
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {editingDebitPayId === wc.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={editDebitPayValue}
                            onChange={(e) => setEditDebitPayValue(e.target.value)}
                            className="w-16 rounded border border-pink-600/50 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-pink-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveDebitPay(wc.id);
                              if (e.key === "Escape") handleCancelDebitPay();
                            }}
                          />
                          <span className="text-pink-400/70">%</span>
                          <button
                            onClick={() => handleSaveDebitPay(wc.id)}
                            disabled={isPending}
                            className="px-1.5 py-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelDebitPay}
                            disabled={isPending}
                            className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditDebitPay(wc.id, debitPayMap.get(wc.id) ?? 0)}
                          className="text-zinc-400 hover:text-pink-400 transition-colors group"
                          title="Click to edit debit pay bonus"
                        >
                          {(debitPayMap.get(wc.id) ?? 0) > 0 ? (
                            <span className="text-pink-400">+{debitPayMap.get(wc.id)}%</span>
                          ) : (
                            <span className="text-zinc-600 group-hover:text-zinc-400">0%</span>
                          )}
                          <span className="ml-1 text-zinc-600 group-hover:text-zinc-400 text-xs">✎</span>
                        </button>
                      )}
                    </td>
                  )}

                  {/* Player Number */}
                  {showPlayerColumn && (() => {
                    // Get player number, clamping to valid range (handles orphaned cards from decreased player count)
                    const rawPlayerNum = optimisticPlayers.get(wc.id) ?? wc.player_number ?? 1;
                    const effectivePlayerNum = Math.min(Math.max(1, rawPlayerNum), playerCount);
                    
                    return (
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {editingPlayerId === wc.id ? (
                          <select
                            value={effectivePlayerNum}
                            onChange={(e) => {
                              const newPlayer = parseInt(e.target.value);
                              setOptimisticPlayers(prev => new Map(prev).set(wc.id, newPlayer));
                              setEditingPlayerId(null);
                              startTransition(async () => {
                                if (onUpdatePlayerNumber) {
                                  await onUpdatePlayerNumber(wc.id, newPlayer);
                                }
                              });
                            }}
                            onBlur={() => setEditingPlayerId(null)}
                            autoFocus
                            className="w-24 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                          >
                            {Array.from({ length: playerCount }, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>
                                P{num}: {playerDescriptions.get(num) || `Player ${num}`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingPlayerId(wc.id)}
                            className="text-zinc-400 hover:text-white transition-colors group"
                            title="Click to change player"
                          >
                            <span className="text-zinc-300">
                              P{effectivePlayerNum}
                            </span>
                            <span className="ml-1 text-zinc-600 group-hover:text-zinc-400 text-xs">✎</span>
                          </button>
                        )}
                      </td>
                    );
                  })()}

                  {/* Approval Date */}
                  <td className="px-4 py-3 text-center hidden xl:table-cell">
                    {editingApprovalDateId === wc.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="date"
                          value={editApprovalDateValue}
                          onChange={(e) => setEditApprovalDateValue(e.target.value)}
                          className="w-32 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveApprovalDate(wc.id);
                            if (e.key === "Escape") handleCancelApprovalDate();
                          }}
                        />
                        <button
                          onClick={() => handleSaveApprovalDate(wc.id)}
                          disabled={isPending}
                          className="px-1.5 py-1 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelApprovalDate}
                          disabled={isPending}
                          className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditApprovalDate(wc.id, wc.approval_date)}
                        className="text-zinc-400 hover:text-white transition-colors group"
                        title="Click to set approval date"
                      >
                        {wc.approval_date ? (
                          <span className="text-zinc-300">
                            {parseLocalDate(wc.approval_date).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}
                          </span>
                        ) : (
                          <span className="text-zinc-600 group-hover:text-zinc-400">Set date</span>
                        )}
                        <span className="ml-1 text-zinc-600 group-hover:text-zinc-400 text-xs">✎</span>
                      </button>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    {removingId === wc.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={async () => {
                            await onRemove(wc.id);
                            setRemovingId(null);
                          }}
                          className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setRemovingId(null)}
                          className="px-2 py-1 rounded text-xs text-zinc-400 hover:bg-zinc-700 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRemovingId(wc.id)}
                        className="px-2 py-1 rounded text-xs text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAndSortedCards.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            No cards match your filters
          </div>
        )}
      </div>
    </div>
  );
}
