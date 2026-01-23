"use client";

import { useState, useMemo, useTransition, Fragment, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, Link2, Unlink } from "lucide-react";
import {
  groupAccountsAcrossBureaus,
  getAccountForBureau,
  type CreditAccount,
  type AccountGroup,
} from "./account-matching";

type CreditBureau = "equifax" | "experian" | "transunion";

interface WalletCard {
  id: string;
  name: string;
  issuer_name: string | null;
  approval_date?: string | null;
  credit_limit_cents?: number | null;
}

interface AccountsTableProps {
  accounts: CreditAccount[];
  walletCards: WalletCard[];
  accountLinks: Map<string, string | null>;
  displayNames: Map<string, string>;
  onLinkAccount: (creditAccountId: string, walletCardId: string | null) => Promise<void>;
  onSetDisplayName: (creditAccountId: string, displayName: string | null) => Promise<void>;
}

const BUREAUS: CreditBureau[] = ["equifax", "experian", "transunion"];

const BUREAU_LABELS: Record<CreditBureau, string> = {
  equifax: "EQ",
  experian: "EX",
  transunion: "TU",
};

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatResponsibility(responsibility: string): string {
  const labels: Record<string, string> = {
    individual: "Primary",
    joint: "Joint",
    authorized_user: "Authorized User",
    cosigner: "Cosigner",
    unknown: "Unknown",
  };
  return labels[responsibility] || responsibility;
}

function isAuthorizedUser(group: AccountGroup): boolean {
  // Check if any account in the group is an authorized user
  for (const accounts of group.byBureau.values()) {
    for (const acct of accounts) {
      if (acct.responsibility === "authorized_user") {
        return true;
      }
    }
  }
  return false;
}

function calculateUtilization(balance: number | null, limit: number | null): string | null {
  if (!limit || limit === 0) return null;
  if (!balance) return "0%";
  const util = (balance / limit) * 100;
  return `${util.toFixed(0)}%`;
}

function getUtilizationColor(balance: number | null, limit: number | null): string {
  if (!limit || limit === 0 || !balance) return "text-zinc-400";
  const util = (balance / limit) * 100;
  if (util <= 10) return "text-emerald-400";
  if (util <= 30) return "text-green-400";
  if (util <= 50) return "text-yellow-400";
  if (util <= 75) return "text-orange-400";
  return "text-red-400";
}

type SortColumn = "account" | "opened" | "utilization" | "equifax" | "experian" | "transunion";
type SortDirection = "asc" | "desc";

// Get max utilization for a group across all bureaus
function getMaxUtilization(group: AccountGroup): number {
  let maxUtil = 0;
  for (const bureau of BUREAUS) {
    const accounts = group.byBureau.get(bureau);
    if (accounts) {
      for (const acct of accounts) {
        if (acct.credit_limit_cents && acct.credit_limit_cents > 0 && acct.balance_cents) {
          const util = (acct.balance_cents / acct.credit_limit_cents) * 100;
          if (util > maxUtil) maxUtil = util;
        }
      }
    }
  }
  return maxUtil;
}

// Get utilization for a specific bureau (returns -1 if not present)
function getBureauUtilization(group: AccountGroup, bureau: CreditBureau): number {
  const accounts = group.byBureau.get(bureau);
  if (!accounts || accounts.length === 0) return -1;
  
  let maxUtil = -1;
  for (const acct of accounts) {
    if (acct.credit_limit_cents && acct.credit_limit_cents > 0 && acct.balance_cents !== null) {
      const util = (acct.balance_cents / acct.credit_limit_cents) * 100;
      if (util > maxUtil) maxUtil = util;
    } else if (maxUtil === -1) {
      // Account exists but no utilization (charge card) - treat as 0
      maxUtil = 0;
    }
  }
  return maxUtil;
}

// Normalize issuer/creditor names for wallet matching
function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*(bank|card|cards|credit|cbna|na|n\.a\.|financial|services|usa|corp|inc|llc|consumer|group)\s*/g, " ")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Calculate match confidence between account group and wallet card
function calculateWalletMatchConfidence(
  group: AccountGroup,
  card: WalletCard
): number {
  let confidence = 0;

  // Get issuer from group
  const groupIssuer = normalizeForMatch(group.displayName);
  const cardIssuer = normalizeForMatch(card.issuer_name ?? card.name);

  // Issuer name match (40% weight)
  if (cardIssuer && groupIssuer) {
    if (groupIssuer.includes(cardIssuer) || cardIssuer.includes(groupIssuer)) {
      confidence += 40;
    } else if (
      groupIssuer.slice(0, 4) === cardIssuer.slice(0, 4) &&
      groupIssuer.length > 3 &&
      cardIssuer.length > 3
    ) {
      confidence += 20;
    }
  }

  // Date opened match (35% weight)
  if (group.dateOpened && card.approval_date) {
    const groupDate = new Date(group.dateOpened);
    const cardDate = new Date(card.approval_date);
    const daysDiff = Math.abs(groupDate.getTime() - cardDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 7) {
      confidence += 35;
    } else if (daysDiff <= 30) {
      confidence += 25;
    } else if (daysDiff <= 60) {
      confidence += 10;
    }
  }

  // Credit limit match (25% weight)
  const groupLimits = group.accounts
    .map((a) => a.credit_limit_cents)
    .filter((l): l is number => l !== null && l > 0);

  if (groupLimits.length > 0 && card.credit_limit_cents) {
    const avgLimit = groupLimits.reduce((a, b) => a + b, 0) / groupLimits.length;
    const ratio = Math.min(avgLimit, card.credit_limit_cents) / Math.max(avgLimit, card.credit_limit_cents);

    if (ratio >= 0.95) {
      confidence += 25;
    } else if (ratio >= 0.8) {
      confidence += 15;
    }
  }

  return confidence;
}

// Get best suggested card for a group
function getSuggestedCard(group: AccountGroup, walletCards: WalletCard[]): WalletCard | null {
  let bestCard: WalletCard | null = null;
  let bestConfidence = 0;

  for (const card of walletCards) {
    const confidence = calculateWalletMatchConfidence(group, card);
    if (confidence > bestConfidence && confidence >= 50) {
      bestConfidence = confidence;
      bestCard = card;
    }
  }

  return bestCard;
}

// Suggestion button with split hover behavior
function SuggestionButton({
  cardName,
  onLink,
  onDismiss,
}: {
  cardName: string;
  onLink: () => void;
  onDismiss: () => void;
}) {
  const [dismissHover, setDismissHover] = useState(false);
  const [linkHover, setLinkHover] = useState(false);
  
  return (
    <div 
      className={`flex items-center rounded transition-colors ${
        dismissHover ? "bg-zinc-700/50" : ""
      }`}
    >
      <button
        onClick={onLink}
        onMouseEnter={() => setLinkHover(true)}
        onMouseLeave={() => setLinkHover(false)}
        className={`flex items-center gap-1 text-xs transition-colors px-1.5 py-0.5 rounded ${
          dismissHover 
            ? "text-zinc-400" 
            : linkHover
              ? "text-amber-400 bg-amber-500/10"
              : "text-amber-500"
        }`}
        title={`Link to ${cardName}`}
      >
        <Link2 className="h-3 w-3" />
        <span className="truncate max-w-[180px]">
          Link {cardName}
        </span>
      </button>
      <button
        onClick={onDismiss}
        onMouseEnter={() => setDismissHover(true)}
        onMouseLeave={() => setDismissHover(false)}
        className={`p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded ${
          linkHover ? "opacity-0" : "opacity-100"
        }`}
        title="Dismiss suggestion"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Link popup component - uses portal to escape table overflow
function LinkPopup({
  isOpen,
  onClose,
  currentCardId,
  currentCustomName,
  originalName,
  walletCards,
  onSaveLink,
  onSaveCustomName,
  anchorRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentCardId: string | null;
  currentCustomName: string | null;
  originalName: string;
  walletCards: WalletCard[];
  onSaveLink: (cardId: string | null) => void;
  onSaveCustomName: (name: string | null) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [customNameValue, setCustomNameValue] = useState(currentCustomName || "");
  const [isPending, startTransition] = useTransition();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const customNameInputRef = useRef<HTMLInputElement>(null);

  // Calculate position based on anchor element
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupHeight = 400; // approximate max height
      const viewportHeight = window.innerHeight;
      
      // Position above if there's not enough space below
      let top = rect.bottom + 4;
      if (top + popupHeight > viewportHeight && rect.top > popupHeight) {
        top = rect.top - popupHeight - 4;
      }
      
      setPosition({
        top: Math.max(8, top),
        left: rect.left,
      });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (isOpen) {
      setSearchValue("");
      setCustomNameValue(currentCustomName || "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, currentCustomName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Handle Enter key - select card if in search, save custom name if in custom name field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Enter") {
        // Check if custom name input is focused
        if (document.activeElement === customNameInputRef.current) {
          e.preventDefault();
          if (customNameValue.trim()) {
            handleSaveCustomName();
          }
          return;
        }
        
        // Otherwise select first matching card (if in search input)
        if (document.activeElement === inputRef.current) {
          e.preventDefault();
          const filtered = walletCards.filter((card) => {
            if (!searchValue) return true;
            const search = searchValue.toLowerCase();
            return (
              card.name.toLowerCase().includes(search) ||
              (card.issuer_name?.toLowerCase().includes(search) ?? false)
            );
          });
          if (filtered.length > 0) {
            handleSelectCard(filtered[0]);
          }
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchValue, customNameValue, walletCards, onClose]);

  const filteredCards = walletCards.filter((card) => {
    if (!searchValue) return true;
    const search = searchValue.toLowerCase();
    return (
      card.name.toLowerCase().includes(search) ||
      (card.issuer_name?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleSelectCard = (card: WalletCard) => {
    startTransition(() => {
      onSaveLink(card.id);
      onClose();
    });
  };

  const handleSaveCustomName = () => {
    if (customNameValue.trim()) {
      startTransition(() => {
        onSaveCustomName(customNameValue.trim());
        onClose();
      });
    }
  };

  const handleUnlink = () => {
    startTransition(() => {
      onSaveLink(null);
      onSaveCustomName(null);
      onClose();
    });
  };

  const handleClearCustomName = () => {
    startTransition(() => {
      onSaveCustomName(null);
      onClose();
    });
  };

  if (!isOpen) return null;

  const popupContent = (
    <div
      ref={popupRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-[100] w-72 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-[70vh] overflow-y-auto"
    >
      <div className="p-3 border-b border-zinc-700">
        <div className="text-xs text-zinc-400 mb-2">Original: {originalName}</div>
        
        {/* Show current state and actions */}
        {currentCardId && (
          <div className="flex items-center justify-between mb-3 p-2 bg-zinc-700/50 rounded">
            <span className="text-sm text-zinc-200">
              Linked to: {walletCards.find((c) => c.id === currentCardId)?.name}
            </span>
            <button
              onClick={handleUnlink}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Unlink className="h-3 w-3" />
              Unlink
            </button>
          </div>
        )}
        
        {currentCustomName && !currentCardId && (
          <div className="flex items-center justify-between mb-3 p-2 bg-zinc-700/50 rounded">
            <span className="text-sm text-zinc-200">Custom: {currentCustomName}</span>
            <button
              onClick={handleClearCustomName}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Search cards */}
        <input
          ref={inputRef}
          type="search"
          name="card-search"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search wallet cards..."
          className="w-full bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm rounded px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>

      {/* Card list */}
      <div className="max-h-48 overflow-auto">
        {filteredCards.length > 0 ? (
          filteredCards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleSelectCard(card)}
              disabled={isPending}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                currentCardId === card.id ? "bg-amber-500/10 border-l-2 border-amber-500" : ""
              }`}
            >
              <div className="font-medium text-zinc-200">{card.name}</div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mt-0.5">
                {card.issuer_name && <span>{card.issuer_name}</span>}
                {card.approval_date && (
                  <>
                    {card.issuer_name && <span>•</span>}
                    <span>{formatDate(card.approval_date)}</span>
                  </>
                )}
                {card.credit_limit_cents && (
                  <>
                    <span>•</span>
                    <span>{formatCurrency(card.credit_limit_cents)}</span>
                  </>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-zinc-500 text-sm">No matching cards</div>
        )}
      </div>

      {/* Custom name section */}
      <div className="p-3 border-t border-zinc-700">
        <div className="text-xs text-zinc-400 mb-2">Or set a custom name:</div>
        <div className="flex gap-2">
          <input
            ref={customNameInputRef}
            type="text"
            name="custom-display-name"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            value={customNameValue}
            onChange={(e) => setCustomNameValue(e.target.value)}
            placeholder="Custom name..."
            className="flex-1 bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm rounded px-2 py-1.5 focus:ring-amber-500 focus:border-amber-500"
          />
          <button
            onClick={handleSaveCustomName}
            disabled={isPending || !customNameValue.trim()}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside table's overflow constraints
  return createPortal(popupContent, document.body);
}

export function AccountsTable({
  accounts,
  walletCards,
  accountLinks,
  displayNames,
  onLinkAccount,
  onSetDisplayName,
}: AccountsTableProps) {
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [linkPopupGroupId, setLinkPopupGroupId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "other">("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("utilization");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const linkButtonRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [localLinks, setLocalLinks] = useState<Map<string, string | null>>(accountLinks);
  const [localDisplayNames, setLocalDisplayNames] = useState<Map<string, string>>(displayNames);

  const accountGroups = useMemo(() => {
    return groupAccountsAcrossBureaus(accounts);
  }, [accounts]);

  const openCountsByBureau = useMemo(() => {
    const counts: Record<CreditBureau, number> = {
      equifax: 0,
      experian: 0,
      transunion: 0,
    };
    accountGroups.forEach((group) => {
      if (group.status === "open") {
        BUREAUS.forEach((bureau) => {
          if (group.byBureau.has(bureau)) {
            counts[bureau]++;
          }
        });
      }
    });
    return counts;
  }, [accountGroups]);

  const filteredGroups = useMemo(() => {
    let groups = accountGroups;
    if (statusFilter !== "all") {
      groups = groups.filter((g) => g.status === statusFilter);
    }
    if (typeFilter !== "all") {
      if (typeFilter === "credit") {
        groups = groups.filter((g) => g.loanType === "credit_card");
      } else {
        groups = groups.filter((g) => g.loanType !== "credit_card");
      }
    }
    return groups;
  }, [accountGroups, statusFilter, typeFilter]);

  const sortedGroups = useMemo(() => {
    const sorted = [...filteredGroups];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === "account") {
        const nameA = getDisplayNameForGroup(a, localLinks, localDisplayNames, walletCards);
        const nameB = getDisplayNameForGroup(b, localLinks, localDisplayNames, walletCards);
        comparison = nameA.localeCompare(nameB);
      } else if (sortColumn === "opened") {
        const dateA = a.dateOpened || "";
        const dateB = b.dateOpened || "";
        comparison = dateA.localeCompare(dateB);
      } else if (sortColumn === "utilization") {
        const utilA = getMaxUtilization(a);
        const utilB = getMaxUtilization(b);
        comparison = utilA - utilB;
      } else if (sortColumn === "equifax" || sortColumn === "experian" || sortColumn === "transunion") {
        const utilA = getBureauUtilization(a, sortColumn as CreditBureau);
        const utilB = getBureauUtilization(b, sortColumn as CreditBureau);
        comparison = utilA - utilB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredGroups, sortColumn, sortDirection, localLinks, localDisplayNames, walletCards]);

  const statusCounts = useMemo(() => {
    const open = accountGroups.filter((g) => g.status === "open").length;
    const closed = accountGroups.filter((g) => g.status === "closed").length;
    return { open, closed, total: accountGroups.length };
  }, [accountGroups]);

  const typeCounts = useMemo(() => {
    const credit = accountGroups.filter((g) => g.loanType === "credit_card").length;
    const other = accountGroups.filter((g) => g.loanType !== "credit_card").length;
    return { credit, other, total: accountGroups.length };
  }, [accountGroups]);

  const getGroupLink = (group: AccountGroup): string | null => {
    for (const account of group.accounts) {
      const link = localLinks.get(account.id);
      if (link) return link;
    }
    return null;
  };

  const getGroupCustomName = (group: AccountGroup): string | null => {
    for (const account of group.accounts) {
      const name = localDisplayNames.get(account.id);
      if (name) return name;
    }
    return null;
  };

  const handleLinkChange = (group: AccountGroup, walletCardId: string | null) => {
    const accountIds = group.accounts.map((a) => a.id);
    setLocalLinks((prev) => {
      const next = new Map(prev);
      accountIds.forEach((id) => {
        if (walletCardId) {
          next.set(id, walletCardId);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
    startTransition(async () => {
      for (const accountId of accountIds) {
        await onLinkAccount(accountId, walletCardId);
      }
    });
  };

  const handleDisplayNameChange = (group: AccountGroup, displayName: string | null) => {
    const accountIds = group.accounts.map((a) => a.id);
    setLocalDisplayNames((prev) => {
      const next = new Map(prev);
      accountIds.forEach((id) => {
        if (displayName) {
          next.set(id, displayName);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
    startTransition(async () => {
      for (const accountId of accountIds) {
        await onSetDisplayName(accountId, displayName);
      }
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-zinc-600" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  if (accounts.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center text-zinc-500">
        No credit accounts found. Import your credit report data to see your accounts.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Accounts</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {statusCounts.total} unique accounts ({statusCounts.open} open, {statusCounts.closed} closed)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "credit" | "other")}
                className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm rounded-lg px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All ({typeCounts.total})</option>
                <option value="credit">Credit ({typeCounts.credit})</option>
                <option value="other">Other ({typeCounts.other})</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "closed")}
                className="bg-zinc-700 border border-zinc-600 text-zinc-200 text-sm rounded-lg px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All ({statusCounts.total})</option>
                <option value="open">Open ({statusCounts.open})</option>
                <option value="closed">Closed ({statusCounts.closed})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[320px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
          </colgroup>
          <thead>
            <tr className="bg-zinc-800/50">
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("account")}
              >
                <span className="flex items-center">
                  Account
                  <SortIcon column="account" />
                </span>
              </th>
              <th
                className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("equifax")}
              >
                <span className="flex items-center justify-center">
                  EQ ({openCountsByBureau.equifax})
                  <SortIcon column="equifax" />
                </span>
              </th>
              <th
                className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("experian")}
              >
                <span className="flex items-center justify-center">
                  EX ({openCountsByBureau.experian})
                  <SortIcon column="experian" />
                </span>
              </th>
              <th
                className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("transunion")}
              >
                <span className="flex items-center justify-center">
                  TU ({openCountsByBureau.transunion})
                  <SortIcon column="transunion" />
                </span>
              </th>
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("opened")}
              >
                <span className="flex items-center">
                  Opened
                  <SortIcon column="opened" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedGroups.map((group) => {
              const isExpanded = expandedAccountId === group.id;
              const currentLink = getGroupLink(group);
              const currentCustomName = getGroupCustomName(group);
              const linkedCard = currentLink ? walletCards.find((c) => c.id === currentLink) : null;
              const isDismissed = dismissedSuggestions.has(group.id);
              const suggestedCard = !linkedCard && !currentCustomName && !isDismissed ? getSuggestedCard(group, walletCards) : null;
              
              // Display name priority: linked card name > custom name > original name
              const displayName = linkedCard?.name ?? currentCustomName ?? group.displayName;
              const isLinkedOrCustom = !!linkedCard || !!currentCustomName;

              return (
                <Fragment key={group.id}>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    {/* Account Name with link button */}
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        {/* Expand chevron */}
                        <button
                          onClick={() => setExpandedAccountId(isExpanded ? null : group.id)}
                          className="w-5 flex-shrink-0 pt-0.5"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-500" />
                          )}
                        </button>
                        
                        {/* Name and link inline */}
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                            <button
                              onClick={() => setExpandedAccountId(isExpanded ? null : group.id)}
                              className="font-medium text-zinc-200 text-left"
                            >
                              {displayName}
                            </button>
                            
                            {/* Link button - flows inline after name */}
                            <div 
                              ref={(el) => {
                                if (el) linkButtonRefs.current.set(group.id, el);
                                else linkButtonRefs.current.delete(group.id);
                              }}
                              className="relative flex-shrink-0"
                            >
                              {isLinkedOrCustom ? (
                                // Already linked - grey edit icon
                                <button
                                  onClick={() => setLinkPopupGroupId(linkPopupGroupId === group.id ? null : group.id)}
                                  className="p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 rounded transition-colors"
                                  title="Edit link"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </button>
                              ) : suggestedCard ? (
                                // Show suggestion with auto-link and dismiss
                                <SuggestionButton
                                  cardName={suggestedCard.name}
                                  onLink={() => handleLinkChange(group, suggestedCard.id)}
                                  onDismiss={() => setDismissedSuggestions(prev => new Set(prev).add(group.id))}
                                />
                              ) : (
                                // No suggestion - show "Link Card" button
                                <button
                                  onClick={() => setLinkPopupGroupId(linkPopupGroupId === group.id ? null : group.id)}
                                  className="flex items-center gap-1 text-amber-500 hover:text-amber-400 text-xs transition-colors"
                                  title="Link to wallet card"
                                >
                                  <Link2 className="h-3 w-3" />
                                  <span>Link Card</span>
                                </button>
                              )}
                              
                              <LinkPopup
                                isOpen={linkPopupGroupId === group.id}
                                onClose={() => setLinkPopupGroupId(null)}
                                currentCardId={currentLink}
                                currentCustomName={currentCustomName}
                                originalName={group.displayName}
                                walletCards={walletCards}
                                onSaveLink={(cardId) => handleLinkChange(group, cardId)}
                                onSaveCustomName={(name) => handleDisplayNameChange(group, name)}
                                anchorRef={{ current: linkButtonRefs.current.get(group.id) || null }}
                              />
                            </div>
                          </div>
                          
                          {/* Type and status row */}
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="capitalize">
                              {group.loanType.replace(/_/g, " ")}
                              {isAuthorizedUser(group) && " (AU)"}
                            </span>
                            <span>•</span>
                            <span className={group.status === "open" ? "text-emerald-400" : "text-zinc-500"}>
                              {group.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Bureau columns */}
                    {BUREAUS.map((bureau) => {
                      const acct = getAccountForBureau(group, bureau);
                      
                      if (!acct) {
                        return (
                          <td key={bureau} className="px-2 py-3 text-center">
                            <X className="h-4 w-4 text-zinc-700 mx-auto" />
                          </td>
                        );
                      }

                      const utilization = calculateUtilization(acct.balance_cents, acct.credit_limit_cents);
                      
                      if (utilization === null) {
                        return (
                          <td key={bureau} className="px-2 py-3 text-center" title="No credit limit (charge card)">
                            <span className="text-zinc-500 text-sm">—</span>
                          </td>
                        );
                      }

                      const utilColor = getUtilizationColor(acct.balance_cents, acct.credit_limit_cents);

                      return (
                        <td key={bureau} className="px-2 py-3 text-center">
                          <div className={`text-sm font-medium ${utilColor}`}>
                            {utilization}
                          </div>
                        </td>
                      );
                    })}

                    {/* Opened Date */}
                    <td className="px-3 py-3 text-sm text-zinc-400">
                      {formatDate(group.dateOpened)}
                    </td>
                  </tr>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <tr>
                      <td className="bg-zinc-800/30 px-3 py-3"></td>
                      {BUREAUS.map((bureau) => {
                        const acct = getAccountForBureau(group, bureau);
                        
                        return (
                          <td key={bureau} className="bg-zinc-800/30 px-2 py-3 align-top">
                            {!acct ? (
                              <div className="text-zinc-600 text-xs text-center">—</div>
                            ) : (
                              <div className="space-y-1 text-xs">
                                <div className="text-zinc-400 font-medium truncate mb-2" title={acct.creditor_name || acct.account_name}>
                                  {acct.creditor_name || acct.account_name}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Limit:</span>
                                  <span className="text-zinc-300">{formatCurrency(acct.credit_limit_cents)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Bal:</span>
                                  <span className="text-zinc-300">{formatCurrency(acct.balance_cents)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">High:</span>
                                  <span className="text-zinc-300">{formatCurrency(acct.high_balance_cents)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Opened:</span>
                                  <span className="text-zinc-300">{formatDate(acct.date_opened)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Updated:</span>
                                  <span className="text-zinc-300">{formatDate(acct.date_updated)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Type:</span>
                                  <span className="text-zinc-300">{formatResponsibility(acct.responsibility)}</span>
                                </div>
                                {(acct.direct_account_number_masked || acct.account_number_masked) && (
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">#:</span>
                                    <span className="text-zinc-300 truncate">
                                      {/* Prefer direct bureau account number (less masking) over myFICO's */}
                                      {acct.direct_account_number_masked || acct.account_number_masked}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="bg-zinc-800/30 px-3 py-3"></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper function to get display name for sorting
function getDisplayNameForGroup(
  group: AccountGroup,
  localLinks: Map<string, string | null>,
  localDisplayNames: Map<string, string>,
  walletCards: WalletCard[]
): string {
  // Check for linked card
  for (const account of group.accounts) {
    const link = localLinks.get(account.id);
    if (link) {
      const card = walletCards.find((c) => c.id === link);
      if (card) return card.name;
    }
  }
  // Check for custom name
  for (const account of group.accounts) {
    const name = localDisplayNames.get(account.id);
    if (name) return name;
  }
  // Fall back to original
  return group.displayName;
}
