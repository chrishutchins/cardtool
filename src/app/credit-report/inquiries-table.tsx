"use client";

import { useState, useMemo, useTransition, Fragment, useRef } from "react";
import { Check, X, ChevronDown, ChevronUp, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Unlink } from "lucide-react";

type CreditBureau = "equifax" | "experian" | "transunion";

interface CreditInquiry {
  id: string;
  bureau: CreditBureau;
  company_name: string;
  inquiry_date: string;
  inquiry_type: string | null;
  last_seen_snapshot_id: string | null;
  snapshot_id: string | null;
  player_number: number;
}

interface WalletCard {
  id: string;
  name: string;
  issuer_name: string | null;
}

interface InquiryGroupData {
  groupId: string;
  relatedCardId: string | null;
  relatedNote: string | null;
}

interface InquiriesTableProps {
  inquiries: CreditInquiry[];
  latestSnapshotIds: Map<string, string>;
  inquiryToGroupMap: Map<string, string>;
  groupNamesMap: Map<string, string | null>;
  groupDataMap: Map<string, InquiryGroupData>;
  walletCards: WalletCard[];
  onCreateGroup: (inquiryIds: string[], groupName: string | null) => Promise<void>;
  onAddToGroup: (groupId: string, inquiryId: string) => Promise<void>;
  onRemoveFromGroup: (inquiryId: string) => Promise<void>;
  onUpdateGroupName: (groupId: string, groupName: string | null) => Promise<void>;
  onUpdateRelatedApplication: (groupId: string, cardId: string | null, note: string | null) => Promise<void>;
  onCreateGroupWithRelatedApp: (inquiryIds: string[], cardId: string | null, note: string | null) => Promise<void>;
}

const BUREAUS: CreditBureau[] = ["equifax", "experian", "transunion"];

const BUREAU_LABELS: Record<CreditBureau, string> = {
  equifax: "EQ",
  experian: "EX",
  transunion: "TU",
};

// Normalize company names for auto-grouping
function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(BANK|FINANCIAL|SERVICES|CORP|CORPORATION|INC|LLC|NA|USA)/g, "")
    .trim();
}

// Check if two inquiries should be auto-grouped
function shouldAutoGroup(a: CreditInquiry, b: CreditInquiry): boolean {
  // Within 14 days
  const dateA = new Date(a.inquiry_date);
  const dateB = new Date(b.inquiry_date);
  const daysDiff = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 14) return false;

  // Similar company name
  const nameA = normalizeCompanyName(a.company_name);
  const nameB = normalizeCompanyName(b.company_name);

  // Check prefix match (at least 5 chars)
  if (nameA.length >= 5 && nameB.length >= 5) {
    const prefix = Math.min(nameA.length, nameB.length, 8);
    if (nameA.slice(0, prefix) === nameB.slice(0, prefix)) {
      return true;
    }
  }

  return nameA === nameB;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInquiryAge(dateStr: string): { days: number; display: string } {
  const inquiryDate = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Always show in months
  const months = Math.floor(days / 30);
  return { days, display: `${months}mo` };
}

interface GroupedInquiry {
  id: string;
  company_name: string;
  displayName: string; // The name to show (may come from linked card)
  inquiry_date: string;
  bureaus: Set<CreditBureau>;
  inquiries: CreditInquiry[];
  groupId: string | null;
  groupName: string | null;
  relatedCardId: string | null;
  relatedNote: string | null;
  isDropped: boolean;
}

type SortColumn = "company" | "date" | "age";
type SortDirection = "asc" | "desc";

// Autocomplete component for Related Application
function RelatedApplicationInput({
  groupId,
  currentCardId,
  currentNote,
  walletCards,
  onSave,
}: {
  groupId: string;
  currentCardId: string | null;
  currentNote: string | null;
  walletCards: WalletCard[];
  onSave: (cardId: string | null, note: string | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  // Get display value for linked card or note
  const displayValue = useMemo(() => {
    if (currentCardId) {
      const card = walletCards.find((c) => c.id === currentCardId);
      if (card) {
        return card.name;
      }
    }
    return currentNote || null;
  }, [currentCardId, currentNote, walletCards]);

  // Filter wallet cards based on input
  const filteredCards = useMemo(() => {
    if (!inputValue) return walletCards.slice(0, 5);
    const search = inputValue.toLowerCase();
    return walletCards.filter((card) => {
      const cardName = card.name.toLowerCase();
      const issuerName = card.issuer_name?.toLowerCase() || "";
      return cardName.includes(search) || issuerName.includes(search);
    }).slice(0, 5);
  }, [inputValue, walletCards]);

  const handleSelect = (card: WalletCard | null) => {
    startTransition(() => {
      if (card) {
        onSave(card.id, null);
      } else {
        // Custom note
        onSave(null, inputValue || null);
      }
      setIsOpen(false);
      setIsEditing(false);
      setInputValue("");
    });
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setIsEditing(false);
        setInputValue("");
      }
    }, 150);
  };

  const handleClear = () => {
    startTransition(() => {
      onSave(null, null);
      setIsEditing(false);
      setInputValue("");
    });
  };

  const startEditing = () => {
    setIsEditing(true);
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Check if dropdown should open upward when opened
  const checkDropdownDirection = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200; // approximate max height
      setOpenUpward(spaceBelow < dropdownHeight);
    }
  };

  // If we have a linked value, show it as text with clear button
  if (displayValue && !isEditing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-zinc-400 truncate" title={displayValue}>
          {displayValue}
        </span>
        <button
          onClick={handleClear}
          disabled={isPending}
          className="text-zinc-500 hover:text-red-400 p-0.5 flex-shrink-0 disabled:opacity-50"
          title="Clear"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Show input field for editing/adding
  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          checkDropdownDirection();
          setIsOpen(true);
        }}
        onBlur={handleBlur}
        placeholder="Link to card..."
        disabled={isPending}
        className="w-36 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
      />
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-auto right-0 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card)}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                <div className="font-medium">{card.name}</div>
                {card.issuer_name && (
                  <div className="text-zinc-400 text-[10px]">{card.issuer_name}</div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-zinc-500">No matching cards</div>
          )}
          {inputValue && !filteredCards.find((c) => c.name.toLowerCase() === inputValue.toLowerCase()) && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-zinc-700 border-t border-zinc-700"
            >
              Save "{inputValue}" as custom note
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function InquiriesTable({
  inquiries,
  latestSnapshotIds,
  inquiryToGroupMap,
  groupNamesMap,
  groupDataMap,
  walletCards,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onUpdateGroupName,
  onUpdateRelatedApplication,
  onCreateGroupWithRelatedApp,
}: InquiriesTableProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedForGrouping, setSelectedForGrouping] = useState<Set<string>>(new Set());
  const [showDropped, setShowDropped] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editMode, setEditMode] = useState(false);
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState<"all" | "hard" | "soft">("hard");

  // Determine if an inquiry is "active" (still on the report)
  const isInquiryActive = (inquiry: CreditInquiry): boolean => {
    // Use bureau-player key to get the correct snapshot ID
    const latestForBureauAndPlayer = latestSnapshotIds.get(`${inquiry.bureau}-${inquiry.player_number}`);
    // If no tracking data yet, assume active
    if (!latestForBureauAndPlayer || !inquiry.last_seen_snapshot_id) return true;
    // Active if last_seen matches the latest snapshot
    return inquiry.last_seen_snapshot_id === latestForBureauAndPlayer;
  };

  // Helper to check if an inquiry is "soft" (includes account_review, promotional, soft)
  const isSoftInquiry = (type: string | null) => {
    if (!type) return false;
    const t = type.toLowerCase();
    return t === 'soft' || t === 'account_review' || t === 'promotional';
  };

  // Get display name for a group
  const getDisplayName = (
    groupInquiries: CreditInquiry[],
    groupId: string | null,
    relatedCardId: string | null,
    groupName: string | null
  ): string => {
    // If linked to a wallet card, use the card's issuer name
    if (relatedCardId) {
      const card = walletCards.find((c) => c.id === relatedCardId);
      if (card?.issuer_name) {
        return card.issuer_name;
      }
      if (card) {
        return card.name;
      }
    }

    // If has a custom group name, use it
    if (groupName) {
      return groupName;
    }

    // Use the first company name alphabetically for consistency (won't change on refresh)
    const sorted = [...groupInquiries].sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    );
    return sorted[0].company_name;
  };

  // Group inquiries - first by user-defined groups, then auto-group remaining
  const groupedInquiries = useMemo(() => {
    const groups: GroupedInquiry[] = [];
    const processed = new Set<string>();

    // First, handle user-defined groups
    const byGroupId = new Map<string, CreditInquiry[]>();
    inquiries.forEach((inquiry) => {
      const groupId = inquiryToGroupMap.get(inquiry.id);
      if (groupId) {
        if (!byGroupId.has(groupId)) {
          byGroupId.set(groupId, []);
        }
        byGroupId.get(groupId)!.push(inquiry);
        processed.add(inquiry.id);
      }
    });

    byGroupId.forEach((groupInquiries, groupId) => {
      const bureaus = new Set<CreditBureau>();
      groupInquiries.forEach((i) => bureaus.add(i.bureau));

      // Use earliest date
      const sorted = [...groupInquiries].sort((a, b) =>
        a.inquiry_date.localeCompare(b.inquiry_date)
      );

      // Group is dropped if ALL inquiries are dropped
      const allDropped = groupInquiries.every((i) => !isInquiryActive(i));

      const groupData = groupDataMap.get(groupId);
      const relatedCardId = groupData?.relatedCardId ?? null;
      const relatedNote = groupData?.relatedNote ?? null;
      const groupName = groupNamesMap.get(groupId) ?? null;

      const displayName = getDisplayName(groupInquiries, groupId, relatedCardId, groupName);

      groups.push({
        id: groupId,
        company_name: sorted[0].company_name,
        displayName,
        inquiry_date: sorted[0].inquiry_date,
        bureaus,
        inquiries: groupInquiries,
        groupId,
        groupName,
        relatedCardId,
        relatedNote,
        isDropped: allDropped,
      });
    });

    // Then auto-group remaining inquiries
    const remaining = inquiries.filter((i) => !processed.has(i.id));
    remaining.forEach((inquiry) => {
      if (processed.has(inquiry.id)) return;

      // Find all inquiries that should be grouped with this one
      const autoGrouped = remaining.filter(
        (other) =>
          !processed.has(other.id) &&
          (other.id === inquiry.id || shouldAutoGroup(inquiry, other))
      );

      const bureaus = new Set<CreditBureau>();
      autoGrouped.forEach((i) => {
        bureaus.add(i.bureau);
        processed.add(i.id);
      });

      // Group is dropped if ALL inquiries are dropped
      const allDropped = autoGrouped.every((i) => !isInquiryActive(i));

      const displayName = getDisplayName(autoGrouped, null, null, null);

      groups.push({
        id: inquiry.id,
        company_name: inquiry.company_name,
        displayName,
        inquiry_date: inquiry.inquiry_date,
        bureaus,
        inquiries: autoGrouped,
        groupId: null,
        groupName: null,
        relatedCardId: null,
        relatedNote: null,
        isDropped: allDropped,
      });
    });

    return groups;
  }, [inquiries, inquiryToGroupMap, groupNamesMap, groupDataMap, walletCards, latestSnapshotIds]);

  // Sort and filter groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = showDropped
      ? groupedInquiries
      : groupedInquiries.filter((g) => !g.isDropped);

    // Filter by inquiry type
    if (inquiryTypeFilter !== "all") {
      filtered = filtered.filter((g) => {
        // A group matches if ANY of its inquiries match the filter
        return g.inquiries.some((inq) => {
          if (inquiryTypeFilter === "hard") {
            return !isSoftInquiry(inq.inquiry_type);
          } else {
            return isSoftInquiry(inq.inquiry_type);
          }
        });
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "company":
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case "date":
          comparison = a.inquiry_date.localeCompare(b.inquiry_date);
          break;
        case "age":
          comparison = getInquiryAge(a.inquiry_date).days - getInquiryAge(b.inquiry_date).days;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [groupedInquiries, showDropped, sortColumn, sortDirection, inquiryTypeFilter]);

  // Filter groups by inquiry type for counts
  const typeFilteredGroups = useMemo(() => {
    if (inquiryTypeFilter === "all") return groupedInquiries;
    return groupedInquiries.filter((g) => {
      const isSoft = g.inquiries.some((inq) => isSoftInquiry(inq.inquiry_type));
      if (inquiryTypeFilter === "hard") {
        return !isSoft;
      } else {
        return isSoft;
      }
    });
  }, [groupedInquiries, inquiryTypeFilter]);

  const droppedCount = typeFilteredGroups.filter((g) => g.isDropped).length;
  const activeCount = typeFilteredGroups.filter((g) => !g.isDropped).length;

  // Count active (non-dropped) GROUPS per bureau (not individual inquiries)
  const activeCountsByBureau = useMemo(() => {
    const counts: Record<CreditBureau, number> = {
      equifax: 0,
      experian: 0,
      transunion: 0,
    };
    
    typeFilteredGroups.forEach((group) => {
      if (group.isDropped) return;
      // Count each bureau that appears in this group
      group.bureaus.forEach((bureau) => {
        counts[bureau]++;
      });
    });
    
    return counts;
  }, [typeFilteredGroups]);

  const handleCreateGroup = () => {
    if (selectedForGrouping.size < 2) return;

    // Collect ALL inquiry IDs from selected groups (not just the group.id)
    const allInquiryIds: string[] = [];
    selectedForGrouping.forEach((groupId) => {
      const group = groupedInquiries.find((g) => g.id === groupId);
      if (group) {
        group.inquiries.forEach((inq) => allInquiryIds.push(inq.id));
      }
    });

    if (allInquiryIds.length < 2) return;

    startTransition(async () => {
      await onCreateGroup(allInquiryIds, null);
      setSelectedForGrouping(new Set());
      setEditMode(false);
    });
  };

  const handleUnlink = (inquiryId: string) => {
    startTransition(async () => {
      await onRemoveFromGroup(inquiryId);
    });
  };

  const handleUpdateRelatedApplication = (
    groupId: string,
    cardId: string | null,
    note: string | null
  ) => {
    startTransition(async () => {
      await onUpdateRelatedApplication(groupId, cardId, note);
    });
  };

  const handleCreateGroupWithRelatedApp = (
    inquiryIds: string[],
    cardId: string | null,
    note: string | null
  ) => {
    startTransition(async () => {
      await onCreateGroupWithRelatedApp(inquiryIds, cardId, note);
    });
  };

  const toggleSelection = (groupId: string) => {
    setSelectedForGrouping((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "date" || column === "age" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  if (inquiries.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center text-zinc-500">
        No inquiries found in the last 2 years.
      </div>
    );
  }

  // Count soft inquiries
  const softCount = groupedInquiries.filter((g) => 
    g.inquiries.some((inq) => isSoftInquiry(inq.inquiry_type))
  ).length;
  const hardCount = groupedInquiries.filter((g) => 
    g.inquiries.some((inq) => !isSoftInquiry(inq.inquiry_type))
  ).length;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {inquiryTypeFilter === "hard" ? "Hard" : inquiryTypeFilter === "soft" ? "Soft" : "All"} Inquiries
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {activeCount} active
              {droppedCount > 0 && (
                <span className="text-zinc-600"> · {droppedCount} dropped off</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Inquiry type filter */}
            <select
              value={inquiryTypeFilter}
              onChange={(e) => setInquiryTypeFilter(e.target.value as "all" | "hard" | "soft")}
              className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg focus:outline-none focus:border-emerald-500"
            >
              <option value="hard">Hard ({hardCount})</option>
              <option value="soft">Soft ({softCount})</option>
              <option value="all">All ({hardCount + softCount})</option>
            </select>

            {/* Toggle dropped */}
            {droppedCount > 0 && (
              <button
                onClick={() => setShowDropped(!showDropped)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition-colors"
              >
                {showDropped ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Hide dropped
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Show dropped
                  </>
                )}
              </button>
            )}

            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600"
              >
                Group Inquiries
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {selectedForGrouping.size >= 2 && (
                  <button
                    onClick={handleCreateGroup}
                    disabled={isPending}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Group Selected ({selectedForGrouping.size})
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditMode(false);
                    setSelectedForGrouping(new Set());
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <colgroup>
            {editMode && <col className="w-10" />}
            <col className="w-44" />
            <col className="w-48" />
            <col className="w-14" />
            <col className="w-14" />
            <col className="w-14" />
            <col className="w-24" />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="bg-zinc-800/50">
              {editMode && <th className="px-3 py-3"></th>}
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("company")}
              >
                <span className="flex items-center">
                  Company
                  <SortIcon column="company" />
                </span>
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-3">
                Related App
              </th>
              <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-1 py-3">
                EQ ({activeCountsByBureau.equifax})
              </th>
              <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-1 py-3">
                EX ({activeCountsByBureau.experian})
              </th>
              <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-1 py-3">
                TU ({activeCountsByBureau.transunion})
              </th>
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("date")}
              >
                <span className="flex items-center">
                  Date
                  <SortIcon column="date" />
                </span>
              </th>
              <th
                className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-zinc-300"
                onClick={() => handleSort("age")}
              >
                <span className="flex items-center">
                  Age
                  <SortIcon column="age" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredAndSortedGroups.map((group) => {
              const age = getInquiryAge(group.inquiry_date);
              const isExpanded = expandedGroupId === group.id;

              return (
                <Fragment key={group.id}>
                  <tr
                    className={`transition-colors ${
                      group.isDropped
                        ? "bg-zinc-900/50 opacity-60"
                        : selectedForGrouping.has(group.id)
                        ? "bg-emerald-900/20"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    {editMode && (
                      <td className="px-3 py-3">
                        {!group.isDropped && (
                          <input
                            type="checkbox"
                            checked={selectedForGrouping.has(group.id)}
                            onChange={() => toggleSelection(group.id)}
                            className="w-4 h-4 rounded bg-zinc-700 border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 flex-shrink-0">
                          {group.inquiries.length > 1 && (
                            <button
                              onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                              className="p-0.5 text-zinc-500 hover:text-zinc-300"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                        <div>
                          <div className={`font-medium ${group.isDropped ? "text-zinc-500" : "text-zinc-200"}`}>
                            {group.displayName}
                          </div>
                          {group.inquiries.length > 1 && (
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {group.inquiries.length} inquiries grouped
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {!group.isDropped && (
                        <RelatedApplicationInput
                          groupId={group.groupId || group.id}
                          currentCardId={group.relatedCardId}
                          currentNote={group.relatedNote}
                          walletCards={walletCards}
                          onSave={(cardId, note) => {
                            if (group.groupId) {
                              // Update existing group
                              handleUpdateRelatedApplication(group.groupId, cardId, note);
                            } else {
                              // Create a new group with this related app
                              const inquiryIds = group.inquiries.map(i => i.id);
                              handleCreateGroupWithRelatedApp(inquiryIds, cardId, note);
                            }
                          }}
                        />
                      )}
                    </td>
                    {BUREAUS.map((bureau) => (
                      <td key={bureau} className="px-1 py-3 text-center">
                        {group.bureaus.has(bureau) ? (
                          <Check className={`h-4 w-4 mx-auto ${group.isDropped ? "text-zinc-600" : "text-emerald-400"}`} />
                        ) : (
                          <X className="h-4 w-4 text-zinc-700 mx-auto" />
                        )}
                      </td>
                    ))}
                    <td className={`px-3 py-3 text-sm ${group.isDropped ? "text-zinc-600" : "text-zinc-400"}`}>
                      {formatDate(group.inquiry_date)}
                    </td>
                    <td className="px-3 py-3">
                      {group.isDropped ? (
                        <span className="text-zinc-600 text-sm">—</span>
                      ) : (
                        <span className="text-zinc-400 text-sm">
                          {age.display}
                        </span>
                      )}
                    </td>
                  </tr>
                  {/* Expanded view - show individual inquiries */}
                  {isExpanded && group.inquiries.length > 1 && (
                    <tr key={`${group.id}-expanded`}>
                      <td colSpan={editMode ? 8 : 7} className="bg-zinc-800/30 px-8 py-3">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                            Individual Inquiries in Group
                          </div>
                          {group.inquiries.map((inquiry) => {
                            const isActive = isInquiryActive(inquiry);
                            return (
                              <div
                                key={inquiry.id}
                                className={`flex items-center justify-between py-1 ${
                                  !isActive ? "opacity-60" : ""
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <span className={`text-sm ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                                    {inquiry.company_name}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    {formatDate(inquiry.inquiry_date)}
                                  </span>
                                  <span className={`text-xs ${
                                    inquiry.bureau === "equifax" ? "text-blue-400" :
                                    inquiry.bureau === "experian" ? "text-red-400" :
                                    "text-green-400"
                                  }`}>
                                    {BUREAU_LABELS[inquiry.bureau]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isActive && (
                                    <span className="text-xs text-zinc-500">Dropped</span>
                                  )}
                                  {group.groupId && (
                                    <button
                                      onClick={() => handleUnlink(inquiry.id)}
                                      disabled={isPending}
                                      className="p-1 text-zinc-500 hover:text-red-400 rounded text-xs disabled:opacity-50"
                                      title="Remove from group"
                                    >
                                      <Unlink className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
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
