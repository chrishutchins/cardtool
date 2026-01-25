"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { DataTable, DataTableColumn, Badge } from "@/components/data-table";

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
  created_by_user_id: string | null;
  is_approved: boolean | null;
  network: string | null;
}

interface CardsTableProps {
  cards: Card[];
  submitterEmails?: Record<string, string>; // user_id -> email for user-submitted cards
  onDelete: (id: string) => Promise<void>;
  onUpdatePerksValue: (id: string, value: number | null) => Promise<void>;
  onToggleExcludeRecommendations: (id: string, exclude: boolean) => Promise<void>;
  onApproveCard?: (id: string, currentName: string) => Promise<void>;
}

export function CardsTable({ cards, submitterEmails = {}, onDelete, onUpdatePerksValue, onToggleExcludeRecommendations, onApproveCard }: CardsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Initialize state from URL params
  const [issuerFilter, setIssuerFilter] = useState<string>(searchParams.get("issuer") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") ?? "");
  const [currencyFilter, setCurrencyFilter] = useState<string>(searchParams.get("currency") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  
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
    const params = new URLSearchParams(searchParams.toString());
    return params.toString();
  }, [searchParams]);

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

  // Filter cards based on dropdowns
  const filteredCards = useMemo(() => {
    let result = cards;

    if (issuerFilter) {
      result = result.filter((c) => c.issuer_name === issuerFilter);
    }

    if (typeFilter) {
      result = result.filter((c) => c.product_type === typeFilter);
    }

    if (currencyFilter) {
      result = result.filter((c) => c.primary_currency_name === currencyFilter);
    }

    if (statusFilter === "pending") {
      result = result.filter((c) => c.created_by_user_id && !c.is_approved);
    } else if (statusFilter === "user-submitted") {
      result = result.filter((c) => c.created_by_user_id);
    } else if (statusFilter === "system") {
      result = result.filter((c) => !c.created_by_user_id);
    }

    return result;
  }, [cards, issuerFilter, typeFilter, currencyFilter, statusFilter]);

  const productTypeColors: Record<string, "info" | "warning"> = {
    personal: "info",
    business: "warning",
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

  const clearFilters = () => {
    setIssuerFilter("");
    setTypeFilter("");
    setCurrencyFilter("");
    setStatusFilter("");
    router.replace(pathname, { scroll: false });
  };

  const handleApprove = async (card: Card) => {
    if (!card.id || !card.name || !onApproveCard) return;
    setApprovingId(card.id);
    try {
      await onApproveCard(card.id, card.name);
    } finally {
      setApprovingId(null);
    }
  };

  const columns: DataTableColumn<Card>[] = [
    {
      id: "name",
      label: "Card",
      accessor: "name",
      sticky: true,
      render: (row) => <span className="text-white font-medium">{row.name}</span>,
    },
    {
      id: "issuer_name",
      label: "Issuer",
      accessor: "issuer_name",
      render: (row) => <span className="text-zinc-400">{row.issuer_name}</span>,
    },
    {
      id: "currency",
      label: "Currency",
      accessor: "primary_currency_name",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="text-zinc-300 text-sm">{row.primary_currency_name}</span>
          {row.secondary_currency_name && (
            <span className="text-zinc-500 text-xs">→ {row.secondary_currency_name}</span>
          )}
        </div>
      ),
    },
    {
      id: "product_type",
      label: "Type",
      accessor: "product_type",
      render: (row) => (
        <Badge variant={productTypeColors[row.product_type ?? "personal"] ?? "default"}>
          {row.product_type}
        </Badge>
      ),
    },
    {
      id: "status",
      label: "Status",
      accessor: "is_approved",
      render: (row) => {
        if (!row.created_by_user_id) {
          return <span className="text-zinc-500 text-xs">System</span>;
        }
        const email = submitterEmails[row.created_by_user_id];
        if (!row.is_approved) {
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning">Pending</Badge>
                {onApproveCard && (
                  <button
                    onClick={() => handleApprove(row)}
                    disabled={approvingId === row.id}
                    className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                  >
                    {approvingId === row.id ? "..." : "Approve"}
                  </button>
                )}
              </div>
              {email && (
                <a 
                  href={`mailto:${email}`} 
                  className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-[150px]"
                  title={email}
                >
                  {email}
                </a>
              )}
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="success">User</Badge>
            {email && (
              <a 
                href={`mailto:${email}`} 
                className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-[150px]"
                title={email}
              >
                {email}
              </a>
            )}
          </div>
        );
      },
    },
    {
      id: "default_perks_value",
      label: "Perks",
      accessor: "default_perks_value",
      align: "right",
      sortAccessor: (row) => row.default_perks_value ?? 0,
      render: (row) => {
        if (editingPerks === row.id) {
          return (
            <div className="flex items-center justify-end gap-1">
              <span className="text-zinc-500">$</span>
              <input
                type="number"
                value={perksInputValue}
                onChange={(e) => setPerksInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePerksSave(row.id!);
                  if (e.key === "Escape") setEditingPerks(null);
                }}
                onBlur={() => handlePerksSave(row.id!)}
                className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-right text-white text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
                disabled={isPending}
              />
            </div>
          );
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePerksEdit(row);
            }}
            className="text-zinc-400 hover:text-white text-sm"
            disabled={!row.id}
          >
            {row.default_perks_value != null ? `$${row.default_perks_value}` : "—"}
          </button>
        );
      },
    },
    {
      id: "exclude",
      label: "Exclude",
      accessor: "exclude_from_recommendations",
      align: "center",
      render: (row) => {
        if (!row.id) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExcludeToggle(row.id!, row.exclude_from_recommendations);
            }}
            disabled={isPending}
            className={`w-5 h-5 rounded border transition-colors ${
              row.exclude_from_recommendations
                ? "bg-red-500/20 border-red-500 text-red-400"
                : "border-zinc-600 hover:border-zinc-400"
            }`}
            title={row.exclude_from_recommendations ? "Excluded from recommendations" : "Click to exclude from recommendations"}
          >
            {row.exclude_from_recommendations && (
              <svg className="w-full h-full p-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      accessor: () => null,
      sortable: false,
      hideFromPicker: true,
      align: "right",
      render: (row) => {
        if (!row.id) return null;
        return (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/admin/cards/${row.id}${filterQueryString ? `?${filterQueryString}` : ""}`}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.id!);
              }}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  // Filter controls as DataTable controls slot
  const filterControls = (
    <>
      <select
        value={issuerFilter}
        onChange={(e) => {
          setIssuerFilter(e.target.value);
          updateUrl({ issuer: e.target.value });
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Issuer</option>
        {issuers.map((issuer) => (
          <option key={issuer} value={issuer}>{issuer}</option>
        ))}
      </select>
      <select
        value={typeFilter}
        onChange={(e) => {
          setTypeFilter(e.target.value);
          updateUrl({ type: e.target.value });
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Type</option>
        {productTypes.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          updateUrl({ status: e.target.value });
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Status</option>
        <option value="pending">Pending Approval</option>
        <option value="user-submitted">User Submitted</option>
        <option value="system">System</option>
      </select>
      <select
        value={currencyFilter}
        onChange={(e) => {
          setCurrencyFilter(e.target.value);
          updateUrl({ currency: e.target.value });
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Currency</option>
        {currencies.map((currency) => (
          <option key={currency} value={currency}>{currency}</option>
        ))}
      </select>
      {(issuerFilter || typeFilter || currencyFilter) && (
        <button
          onClick={clearFilters}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          Clear
        </button>
      )}
    </>
  );

  return (
    <DataTable
      data={filteredCards}
      columns={columns}
      keyAccessor={(row) => row.id ?? `card-${row.name}`}
      searchPlaceholder="Search cards..."
      searchFilter={(row, query) => {
        const q = query.toLowerCase();
        return (
          row.name?.toLowerCase().includes(q) ||
          row.slug?.toLowerCase().includes(q) ||
          row.issuer_name?.toLowerCase().includes(q) ||
          false
        );
      }}
      showColumnSelector={false}
      defaultSortColumn="issuer_name"
      defaultSortDirection="asc"
      emptyMessage={cards.length === 0 ? "No cards yet. Add one above." : "No cards match your filters."}
      controls={filterControls}
      rowClassName={(row) => row.exclude_from_recommendations ? "opacity-50" : ""}
    />
  );
}
