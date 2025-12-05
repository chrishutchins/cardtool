"use client";

import { useState, useMemo } from "react";
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
}

interface CardsTableProps {
  cards: Card[];
  onDelete: (id: string) => Promise<void>;
}

type SortField = "name" | "issuer_name" | "product_type" | "annual_fee" | "default_earn_rate";
type SortDir = "asc" | "desc";

export function CardsTable({ cards, onDelete }: CardsTableProps) {
  const [search, setSearch] = useState("");
  const [issuerFilter, setIssuerFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("issuer_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
      if (aVal === null) return sortDir === "asc" ? 1 : -1;
      if (bVal === null) return sortDir === "asc" ? -1 : 1;

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
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-zinc-600 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const formatFee = (fee: number | null) => {
    if (!fee) return "Free";
    return `$${fee}`;
  };

  const productTypeColors: Record<string, string> = {
    personal: "bg-blue-500/20 text-blue-300",
    business: "bg-amber-500/20 text-amber-300",
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={issuerFilter}
          onChange={(e) => setIssuerFilter(e.target.value)}
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
          onChange={(e) => setTypeFilter(e.target.value)}
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
          onChange={(e) => setCurrencyFilter(e.target.value)}
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
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort("name")}
              >
                Card <SortIcon field="name" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort("issuer_name")}
              >
                Issuer <SortIcon field="issuer_name" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Currency
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort("product_type")}
              >
                Type <SortIcon field="product_type" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort("annual_fee")}
              >
                Annual Fee <SortIcon field="annual_fee" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort("default_earn_rate")}
              >
                Default Rate <SortIcon field="default_earn_rate" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredCards.map((card, index) => (
              <tr
                key={card.id ?? `card-${index}`}
                className="hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{card.name}</span>
                    <span className="text-zinc-500 text-xs font-mono">
                      {card.slug}
                    </span>
                  </div>
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
                <td className="px-6 py-4 text-zinc-400">
                  {formatFee(card.annual_fee)}
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {card.default_earn_rate}x
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/cards/${card.id}`}
                      className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                      Edit
                    </Link>
                    {card.id && (
                      <button
                        onClick={() => card.id && onDelete(card.id)}
                        className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                      >
                        Delete
                      </button>
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

