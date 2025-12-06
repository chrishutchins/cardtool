"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface Card {
  id: string | null;
  name: string | null;
  slug: string | null;
  issuer_name: string | null;
  primary_currency_name: string | null;
  secondary_currency_name: string | null;
  product_type: string | null;
  annual_fee: number | null;
  default_earn_rate: number | null;
  default_perks_value: number | null;
  exclude_from_recommendations: boolean | null;
}

interface CardsTableProps {
  cards: Card[];
  onDelete: (id: string) => Promise<void>;
  onUpdatePerksValue: (id: string, value: number | null) => Promise<void>;
  onToggleExcludeRecommendations: (id: string, exclude: boolean) => Promise<void>;
}

type SortField = "name" | "issuer_name" | "product_type" | "default_perks_value";
type SortDir = "asc" | "desc";

export function CardsTable({ cards, onDelete, onUpdatePerksValue, onToggleExcludeRecommendations }: CardsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Initialize state from URL params
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [issuerFilter, setIssuerFilter] = useState<string>(searchParams.get("issuer") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") ?? "");
  const [currencyFilter, setCurrencyFilter] = useState<string>(searchParams.get("currency") ?? "");
  const [sortField, setSortField] = useState<SortField>((searchParams.get("sort") as SortField) || "issuer_name");
  const [sortDir, setSortDir] = useState<SortDir>((searchParams.get("dir") as SortDir) || "asc");
  
  // Track which cells are being edited
  const [editingPerks, setEditingPerks] = useState<string | null>(null);
  const [perksInputValue, setPerksInputValue] = useState<string>("");

  // Update URL when filters change
  const updateUrl = useCallback((newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  // Build query string for links
  const filterQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (issuerFilter) params.set("issuer", issuerFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (currencyFilter) params.set("currency", currencyFilter);
    if (sortField !== "issuer_name") params.set("sort", sortField);
    if (sortDir !== "asc") params.set("dir", sortDir);
    return params.toString();
  }, [search, issuerFilter, typeFilter, currencyFilter, sortField, sortDir]);

  // Get unique values for filter dropdowns
  const issuers = useMemo(() => {
    const set = new Set(cards.map((c) => c.issuer_name).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [cards]);

  const productTypes = useMemo(() => {
    const set = new Set(cards.map((c) => c.product_type).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [cards]);

  const currencies = useMemo(() => {
    const set = new Set(cards.map((c) => c.primary_currency_name).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [cards]);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let result = cards;

    // Search filter
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(lower) ||
          c.slug?.toLowerCase().includes(lower) ||
          c.issuer_name?.toLowerCase().includes(lower)
      );
    }

    // Issuer filter
    if (issuerFilter) {
      result = result.filter((c) => c.issuer_name === issuerFilter);
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((c) => c.product_type === typeFilter);
    }

    // Currency filter
    if (currencyFilter) {
      result = result.filter((c) => c.primary_currency_name === currencyFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nulls
      if (aVal === null || aVal === undefined) return sortDir === "asc" ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDir === "asc" ? -1 : 1;

      // String comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Number comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [cards, search, issuerFilter, typeFilter, currencyFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    const newDir = sortField === field ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    if (sortField === field) {
      setSortDir(newDir);
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    updateUrl({ 
      sort: field !== "issuer_name" ? field : "", 
      dir: newDir !== "asc" ? newDir : "" 
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg className="w-4 h-4 ml-1 text-blue-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDir === "asc" ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  const productTypeColors: Record<string, string> = {
    personal: "bg-blue-500/20 text-blue-300",
    business: "bg-amber-500/20 text-amber-300",
  };

  const handlePerksEdit = (card: Card) => {
    if (!card.id) return;
    setEditingPerks(card.id);
    setPerksInputValue(card.default_perks_value?.toString() ?? "");
  };

  const handlePerksSave = async (cardId: string) => {
    const value = perksInputValue.trim() === "" ? null : parseFloat(perksInputValue);
    if (value !== null && isNaN(value)) {
      setEditingPerks(null);
      return;
    }
    startTransition(async () => {
      await onUpdatePerksValue(cardId, value);
      setEditingPerks(null);
    });
  };

  const handleExcludeToggle = (cardId: string, currentValue: boolean | null) => {
    startTransition(async () => {
      await onToggleExcludeRecommendations(cardId, !currentValue);
    });
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            updateUrl({ q: e.target.value });
          }}
          className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={issuerFilter}
          onChange={(e) => {
            setIssuerFilter(e.target.value);
            updateUrl({ issuer: e.target.value });
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Issuer</option>
          {issuers.map((issuer) => (
            <option key={issuer} value={issuer}>
              {issuer}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            updateUrl({ type: e.target.value });
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Type</option>
          {productTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => {
            setCurrencyFilter(e.target.value);
            updateUrl({ currency: e.target.value });
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Currency</option>
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        {(search || issuerFilter || typeFilter || currencyFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setIssuerFilter("");
              setTypeFilter("");
              setCurrencyFilter("");
              router.replace(pathname, { scroll: false });
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-zinc-500 mb-2">
        Showing {filteredCards.length} of {cards.length} cards
      </p>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort("name")}
              >
                <span className="inline-flex items-center">Card<SortIcon field="name" /></span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort("issuer_name")}
              >
                <span className="inline-flex items-center">Issuer<SortIcon field="issuer_name" /></span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                Currency
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort("product_type")}
              >
                <span className="inline-flex items-center">Type<SortIcon field="product_type" /></span>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white whitespace-nowrap"
                onClick={() => handleSort("default_perks_value")}
              >
                <span className="inline-flex items-center justify-end">Perks<SortIcon field="default_perks_value" /></span>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                Exclude
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredCards.map((card, index) => (
              <tr
                key={card.id ?? `card-${index}`}
                className={`hover:bg-zinc-800/50 transition-colors ${card.exclude_from_recommendations ? "opacity-50" : ""}`}
              >
                <td className="px-6 py-4">
                  <span className="text-white font-medium">{card.name}</span>
                </td>
                <td className="px-6 py-4 text-zinc-400">{card.issuer_name}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-300 text-sm">
                      {card.primary_currency_name}
                    </span>
                    {card.secondary_currency_name && (
                      <span className="text-zinc-500 text-xs">
                        → {card.secondary_currency_name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      productTypeColors[card.product_type ?? "personal"]
                    }`}
                  >
                    {card.product_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {editingPerks === card.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-zinc-500">$</span>
                      <input
                        type="number"
                        value={perksInputValue}
                        onChange={(e) => setPerksInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handlePerksSave(card.id!);
                          if (e.key === "Escape") setEditingPerks(null);
                        }}
                        onBlur={() => handlePerksSave(card.id!)}
                        className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-blue-500 focus:outline-none"
                        autoFocus
                        disabled={isPending}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePerksEdit(card)}
                      className="text-zinc-400 hover:text-white text-sm"
                      disabled={!card.id}
                    >
                      {card.default_perks_value != null ? `$${card.default_perks_value}` : "—"}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {card.id && (
                    <button
                      onClick={() => handleExcludeToggle(card.id!, card.exclude_from_recommendations)}
                      disabled={isPending}
                      className={`w-5 h-5 rounded border transition-colors ${
                        card.exclude_from_recommendations
                          ? "bg-red-500/20 border-red-500 text-red-400"
                          : "border-zinc-600 hover:border-zinc-400"
                      }`}
                      title={card.exclude_from_recommendations ? "Excluded from recommendations" : "Click to exclude from recommendations"}
                    >
                      {card.exclude_from_recommendations && (
                        <svg className="w-full h-full p-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {card.id && (
                      <>
                        <Link
                          href={`/admin/cards/${card.id}${filterQueryString ? `?${filterQueryString}` : ""}`}
                          className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => onDelete(card.id!)}
                          className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCards.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            {cards.length === 0
              ? "No cards yet. Add one above."
              : "No cards match your filters."}
          </div>
        )}
      </div>
    </div>
  );
}
