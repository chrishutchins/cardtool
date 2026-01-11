"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

type Currency = {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  program_name?: string | null;
  alliance?: string | null;
  is_transferable?: boolean | null;
  transfer_increment?: number | null;
};

type TransferPartner = {
  id: string;
  source_currency_id: string;
  destination_currency_id: string;
  source_units: number;
  destination_units: number;
  transfer_timing: string | null;
  notes: string | null;
  is_active: boolean;
};

interface TransfersClientProps {
  transferableCurrencies: Currency[];
  destinationCurrencies: Currency[];
  transferPartners: TransferPartner[];
}

// Tooltip component matching the rest of the app
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, showBelow: false });
  const ref = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const showBelow = rect.top < 60;
      setCoords({
        top: showBelow ? rect.bottom + 4 : rect.top - 4,
        left: rect.left,
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
          className="fixed px-2 py-1 text-xs text-white bg-zinc-800 border border-zinc-600 rounded shadow-lg max-w-xs z-[9999] pointer-events-none text-left"
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

const allianceLabels: Record<string, { label: string; color: string }> = {
  star_alliance: { label: "SA", color: "text-amber-400" },
  oneworld: { label: "OW", color: "text-emerald-400" },
  skyteam: { label: "ST", color: "text-sky-400" },
};

// Default column order
const DEFAULT_COLUMN_ORDER = ["MR", "UR", "C1", "TYP", "BILT", "WF", "USB", "ROVE", "MB", "BREX", "RAMP"];

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

export function TransfersClient({
  transferableCurrencies,
  destinationCurrencies,
  transferPartners,
}: TransfersClientProps) {
  const [filterType, setFilterType] = useState<string>("");
  const [filterAlliance, setFilterAlliance] = useState<string>("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Column visibility and order state
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  
  // Drag state for reordering
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Initialize column order based on default order and available currencies
  useEffect(() => {
    const sortedCurrencies = [...transferableCurrencies].sort((a, b) => {
      const aIndex = DEFAULT_COLUMN_ORDER.indexOf(a.code);
      const bIndex = DEFAULT_COLUMN_ORDER.indexOf(b.code);
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    setColumnOrder(sortedCurrencies.map(c => c.id));
  }, [transferableCurrencies]);

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return columnOrder
      .filter(id => !hiddenColumns.has(id))
      .map(id => transferableCurrencies.find(c => c.id === id))
      .filter((c): c is Currency => c !== undefined);
  }, [columnOrder, hiddenColumns, transferableCurrencies]);

  // Build a lookup map: destinationId -> sourceId -> TransferPartner
  const transferMap = useMemo(() => {
    const map = new Map<string, Map<string, TransferPartner>>();
    transferPartners.forEach(tp => {
      if (!map.has(tp.destination_currency_id)) {
        map.set(tp.destination_currency_id, new Map());
      }
      map.get(tp.destination_currency_id)!.set(tp.source_currency_id, tp);
    });
    return map;
  }, [transferPartners]);

  // Filter destinations - hide rows that have no visible transfers
  const filteredDestinations = useMemo(() => {
    const visibleColumnIds = new Set(visibleColumns.map(c => c.id));
    
    return destinationCurrencies
      .filter(dest => {
        // Must have at least one transfer partner in a visible column
        const destPartners = transferMap.get(dest.id);
        if (!destPartners) return false;
        
        // Check if any visible column has a transfer to this destination
        let hasVisibleTransfer = false;
        for (const sourceId of destPartners.keys()) {
          if (visibleColumnIds.has(sourceId)) {
            hasVisibleTransfer = true;
            break;
          }
        }
        if (!hasVisibleTransfer) return false;
        
        // Type filter
        if (filterType && dest.currency_type !== filterType) return false;
        // Alliance filter
        if (filterAlliance && dest.alliance !== filterAlliance) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by type first, then by sort config
        const aType = a.currency_type;
        const bType = b.currency_type;
        if (aType !== bType) {
          // Airlines first, then hotels
          if (aType === "airline_miles") return -1;
          if (bType === "airline_miles") return 1;
          return aType.localeCompare(bType);
        }

        // Then by sort config
        if (sortConfig.key === "name") {
          const compare = a.name.localeCompare(b.name);
          return sortConfig.direction === "asc" ? compare : -compare;
        }
        
        // Sort by transfer availability for a specific source
        if (sortConfig.key.startsWith("source_")) {
          const sourceId = sortConfig.key.replace("source_", "");
          const aHas = transferMap.get(a.id)?.has(sourceId) ? 1 : 0;
          const bHas = transferMap.get(b.id)?.has(sourceId) ? 1 : 0;
          
          if (aHas !== bHas) {
            return sortConfig.direction === "asc" ? bHas - aHas : aHas - bHas;
          }
          
          // If both have transfers, sort by ratio (higher ratio = better)
          const aPartner = transferMap.get(a.id)?.get(sourceId);
          const bPartner = transferMap.get(b.id)?.get(sourceId);
          if (aPartner && bPartner) {
            const aRatio = aPartner.destination_units / aPartner.source_units;
            const bRatio = bPartner.destination_units / bPartner.source_units;
            return sortConfig.direction === "asc" ? bRatio - aRatio : aRatio - bRatio;
          }
        }
        
        return 0;
      });
  }, [destinationCurrencies, transferMap, filterType, filterAlliance, sortConfig, visibleColumns]);

  // Group by currency type
  const groupedDestinations = useMemo(() => {
    const groups: Record<string, Currency[]> = {
      airline_miles: [],
      hotel_points: [],
    };
    filteredDestinations.forEach(dest => {
      if (groups[dest.currency_type]) {
        groups[dest.currency_type].push(dest);
      }
    });
    return groups;
  }, [filteredDestinations]);

  // Get unique alliances for filter
  const alliances = useMemo(() => {
    const set = new Set<string>();
    destinationCurrencies.forEach(d => {
      if (d.alliance && d.alliance !== "none") set.add(d.alliance);
    });
    return Array.from(set).sort();
  }, [destinationCurrencies]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleColumnVisibility = (id: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleColumnDragStart = (id: string) => {
    setDraggedColumn(id);
  };

  const handleColumnDragOver = (id: string) => {
    if (draggedColumn && draggedColumn !== id) {
      setDragOverColumn(id);
    }
  };

  const handleColumnDragEnd = () => {
    if (draggedColumn && dragOverColumn && draggedColumn !== dragOverColumn) {
      setColumnOrder(prev => {
        const newOrder = [...prev];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(dragOverColumn);
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumn);
        return newOrder;
      });
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const renderRatioCell = (dest: Currency, source: Currency) => {
    const partner = transferMap.get(dest.id)?.get(source.id);
    
    if (!partner) {
      return (
        <td key={source.id} className="px-3 py-2 text-center">
          <span className="text-zinc-700">&nbsp;</span>
        </td>
      );
    }

    const ratio = `${partner.source_units}:${partner.destination_units}`;
    const hasFee = !!partner.notes;
    
    // Build tooltip content (only notes, not timing)
    const tooltipText = partner.notes || "";

    const content = (
      <span className="font-mono text-sm text-white">
        {ratio}
        {hasFee && <span className="text-amber-500 ml-0.5">†</span>}
      </span>
    );

    return (
      <td key={source.id} className="px-3 py-2 text-center">
        {tooltipText ? (
          <Tooltip text={tooltipText}>
            <span className="cursor-help">{content}</span>
          </Tooltip>
        ) : (
          content
        )}
      </td>
    );
  };

  const renderSortArrow = (key: string) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return (
      <svg 
        className={`w-3 h-3 ml-1 inline-block ${sortConfig.direction === "desc" ? "rotate-180" : ""}`}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  const renderSection = (type: string, label: string, destinations: Currency[]) => {
    if (destinations.length === 0) return null;
    
    const isCollapsed = collapsedSections.has(type);

    return (
      <div key={type} className="mb-6">
        <button
          onClick={() => toggleSection(type)}
          className="flex items-center gap-2 mb-3 text-lg font-semibold text-white hover:text-zinc-300 transition-colors"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {label}
          <span className="text-sm font-normal text-zinc-500">({destinations.length})</span>
        </button>

        {!isCollapsed && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                  <th 
                    className="sticky left-0 z-10 bg-zinc-900 px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors w-[240px] min-w-[240px] border-r border-zinc-700"
                    onClick={() => handleSort("name")}
                    style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}
                  >
                    <span className="flex items-center">
                      Program
                      {renderSortArrow("name")}
                    </span>
                  </th>
                  {visibleColumns.map(source => (
                    <th 
                      key={source.id}
                      className="px-3 py-3 font-medium text-center cursor-pointer hover:text-white transition-colors min-w-[70px]"
                      onClick={() => handleSort(`source_${source.id}`)}
                    >
                      <Tooltip text={source.name}>
                        <span className="flex items-center justify-center">
                          {source.code}
                          {renderSortArrow(`source_${source.id}`)}
                        </span>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {destinations.map(dest => (
                  <tr key={dest.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td 
                      className="sticky left-0 z-10 bg-zinc-900 px-4 py-2 border-r border-zinc-700 w-[240px] min-w-[240px]"
                      style={{ boxShadow: '2px 0 8px -2px rgba(0,0,0,0.4)' }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-baseline gap-2 min-w-0 flex-1">
                          <span className="text-white font-medium truncate">{dest.name}</span>
                          {dest.program_name && (
                            <span className="text-xs text-zinc-500 truncate">{dest.program_name}</span>
                          )}
                        </div>
                        {/* Alliance badge - at end */}
                        <span className="w-6 text-center shrink-0">
                          {dest.alliance && allianceLabels[dest.alliance] ? (
                            <span className={`text-xs font-medium ${allianceLabels[dest.alliance].color}`}>
                              {allianceLabels[dest.alliance].label}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    {visibleColumns.map(source => renderRatioCell(dest, source))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Type:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType("")}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                !filterType
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("airline_miles")}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterType === "airline_miles"
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Airlines
            </button>
            <button
              onClick={() => setFilterType("hotel_points")}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterType === "hotel_points"
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Hotels
            </button>
          </div>
        </div>

        {/* Alliance filter */}
        {alliances.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Alliance:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterAlliance("")}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  !filterAlliance
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                All
              </button>
              {alliances.map(alliance => (
                <button
                  key={alliance}
                  onClick={() => setFilterAlliance(alliance)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    filterAlliance === alliance
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                  } ${allianceLabels[alliance]?.color ?? ""}`}
                >
                  {allianceLabels[alliance]?.label ?? alliance}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Column selector */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white hover:border-zinc-600 transition-colors"
          >
            <span>Sources ({visibleColumns.length})</span>
            <svg
              className={`w-4 h-4 transition-transform ${showColumnSelector ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showColumnSelector && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-[9999]">
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-2 flex gap-2">
                <button
                  onClick={() => setHiddenColumns(new Set())}
                  className="flex-1 px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                >
                  All
                </button>
                <button
                  onClick={() => setHiddenColumns(new Set(columnOrder))}
                  className="flex-1 px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                >
                  None
                </button>
              </div>
              <div className="p-1 text-[10px] text-zinc-500 text-center border-b border-zinc-800">
                Drag handles to reorder columns
              </div>
              <div className="p-2">
                {columnOrder.map(id => {
                  const currency = transferableCurrencies.find(c => c.id === id);
                  if (!currency) return null;
                  const isHidden = hiddenColumns.has(id);
                  const isDragging = draggedColumn === id;
                  const isDragOver = dragOverColumn === id;
                  
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => handleColumnDragStart(id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleColumnDragOver(id);
                      }}
                      onDragEnd={handleColumnDragEnd}
                      className={`
                        transition-all duration-150
                        ${isDragging ? "opacity-50" : ""}
                        ${isDragOver ? "border-t-2 border-blue-500" : ""}
                      `}
                    >
                      <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleColumnVisibility(id)}
                          className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-zinc-300 flex-1">
                          {currency.code} - {currency.name}
                        </span>
                        <span 
                          className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 shrink-0"
                          title="Drag to reorder"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Click outside to close dropdown */}
        {showColumnSelector && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowColumnSelector(false)}
          />
        )}
      </div>

      {/* Legend - commented out for now
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-emerald-400">1:2</span>
          <span>Bonus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-white">1:1</span>
          <span>Even</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-amber-400">2:1</span>
          <span>Penalty</span>
        </div>
        <span className="text-zinc-700">|</span>
        <div className="flex items-center gap-1">
          <span className="text-amber-500">†</span>
          <span>Has fee</span>
        </div>
      </div>
      */}

      {/* Tables by type */}
      {renderSection("airline_miles", "Airlines", groupedDestinations.airline_miles)}
      {renderSection("hotel_points", "Hotels", groupedDestinations.hotel_points)}

      {/* Summary */}
      <div className="text-sm text-zinc-500 pt-4 border-t border-zinc-800">
        Showing {filteredDestinations.length} destination{filteredDestinations.length !== 1 ? "s" : ""} across {visibleColumns.length} source{visibleColumns.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
