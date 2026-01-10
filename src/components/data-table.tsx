"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ============================================================================
// Tooltip Components (reusable)
// ============================================================================

export function Tooltip({ children, text, wide }: { children: React.ReactNode; text: string; wide?: boolean }) {
  const [position, setPosition] = useState<"above" | "below">("above");
  const ref = useRef<HTMLSpanElement>(null);

  const positionClasses = position === "above" 
    ? "bottom-full mb-1" 
    : "top-full mt-1";

  // Use fixed positioning to escape overflow containers
  const widthClass = wide ? "min-w-[200px] max-w-sm" : "whitespace-nowrap";

  return (
    <span 
      ref={ref}
      className="relative group/tooltip inline-flex"
      onMouseEnter={() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setPosition(rect.top < 60 ? "below" : "above");
        }
      }}
    >
      {children}
      <span className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${positionClasses} px-3 py-2 text-xs text-white bg-zinc-800 border border-zinc-600 rounded shadow-lg ${widthClass} z-[9999] transition-opacity duration-75 opacity-0 group-hover/tooltip:opacity-100`}>
        {text}
      </span>
    </span>
  );
}

export function RichTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const ref = useRef<HTMLSpanElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition(rect.top < 80 ? "below" : "above");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchend", handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchend", handleClickOutside);
    };
  }, [isOpen]);

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      justOpenedRef.current = true;
    }
    setIsOpen(!isOpen);
  }, [isOpen]);

  const positionClasses = position === "above" 
    ? "bottom-full mb-1" 
    : "top-full mt-1";

  return (
    <span 
      ref={ref}
      className="relative group/richtooltip inline-flex cursor-help"
      onClick={handleClick}
      onMouseEnter={() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setPosition(rect.top < 80 ? "below" : "above");
        }
      }}
    >
      {children}
      <span className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${positionClasses} px-3 py-2 text-xs bg-zinc-800 border border-zinc-600 rounded shadow-lg z-[9999] whitespace-nowrap transition-opacity duration-75 ${isOpen ? "opacity-100" : "opacity-0 group-hover/richtooltip:opacity-100"}`}>
        {content}
      </span>
    </span>
  );
}

// ============================================================================
// Types
// ============================================================================

export interface DataTableColumn<T> {
  id: string;
  label: string;
  // Optional abbreviated label for column header (uses label if not provided)
  headerLabel?: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  sortAccessor?: (row: T) => number | string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  width?: string;
  minWidth?: string;
  hidden?: boolean;
  // Hide from column picker (for actions columns like settings)
  hideFromPicker?: boolean;
  // For color scaling
  colorScale?: boolean;
  colorAccessor?: (row: T) => number;
  // Custom cell renderer
  render?: (row: T, value: unknown) => React.ReactNode;
  // Header click handler (for custom column sorting)
  onHeaderClick?: () => void;
  // Icon to show in header (e.g., "link" for Plaid-synced columns)
  headerIcon?: "link";
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyAccessor: (row: T) => string;
  // Filter/search
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  // Column visibility
  visibleColumnIds?: string[];
  onColumnVisibilityChange?: (columnIds: string[]) => void;
  showColumnSelector?: boolean;
  // Sorting
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  // Row styling
  rowClassName?: (row: T) => string;
  // Empty state
  emptyMessage?: string;
  // Additional controls slot
  controls?: React.ReactNode;
  // Click handlers
  onRowClick?: (row: T) => void;
  // Persistence
  storageKey?: string; // If provided, persists column visibility and sort to localStorage
}

type SortConfig = {
  columnId: string;
  direction: "asc" | "desc";
};

// ============================================================================
// DraggableItem Component for reorderable lists
// ============================================================================

interface DraggableItemProps {
  id: string;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

function DraggableItem({ id, onDragStart, onDragOver, onDragEnd, children }: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
        onDragOver(id);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      className={`
        transition-all duration-150
        ${isDragging ? "opacity-50" : ""}
        ${isDragOver ? "border-t-2 border-blue-500" : ""}
      `}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DataTable<T>({
  data,
  columns,
  keyAccessor,
  searchPlaceholder = "Search...",
  searchFilter,
  visibleColumnIds,
  onColumnVisibilityChange,
  showColumnSelector = true,
  defaultSortColumn,
  defaultSortDirection = "asc",
  rowClassName,
  emptyMessage = "No data found",
  controls,
  onRowClick,
  storageKey,
}: DataTableProps<T>) {
  // Load persisted settings from localStorage
  const getPersistedSettings = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(`datatable-${storageKey}`);
      if (stored) {
        return JSON.parse(stored) as {
          visibleColumns?: string[];
          columnOrder?: string[];
          sortColumn?: string;
          sortDirection?: "asc" | "desc";
        };
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, [storageKey]);

  // Initialize state with persisted or default values
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(() => {
    const persisted = getPersistedSettings();
    if (persisted?.sortColumn) {
      return { columnId: persisted.sortColumn, direction: persisted.sortDirection ?? "asc" };
    }
    return defaultSortColumn ? { columnId: defaultSortColumn, direction: defaultSortDirection } : null;
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [localVisibleColumns, setLocalVisibleColumns] = useState<Set<string>>(() => {
    const persisted = getPersistedSettings();
    if (persisted?.visibleColumns) {
      return new Set(persisted.visibleColumns);
    }
    return new Set(visibleColumnIds ?? columns.filter(c => !c.hidden).map(c => c.id));
  });
  
  // Column order state - ordered array of column IDs
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const persisted = getPersistedSettings();
    if (persisted?.columnOrder && persisted.columnOrder.length > 0) {
      // Merge persisted order with any new columns that might have been added
      const persistedSet = new Set(persisted.columnOrder);
      const allColumnIds = columns.map(c => c.id);
      const newColumns = allColumnIds.filter(id => !persistedSet.has(id));
      return [...persisted.columnOrder.filter(id => allColumnIds.includes(id)), ...newColumns];
    }
    return columns.map(c => c.id);
  });
  

  // Persist settings to localStorage when they change
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    
    const settings = {
      visibleColumns: Array.from(localVisibleColumns),
      columnOrder: columnOrder,
      sortColumn: sortConfig?.columnId,
      sortDirection: sortConfig?.direction,
    };
    
    try {
      localStorage.setItem(`datatable-${storageKey}`, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, localVisibleColumns, columnOrder, sortConfig]);

  // Sync with external visibility state (only if no storageKey - let persisted take precedence)
  useEffect(() => {
    if (visibleColumnIds && !storageKey) {
      setLocalVisibleColumns(new Set(visibleColumnIds));
    }
  }, [visibleColumnIds, storageKey]);

  // Get column by ID
  const getColumnById = useCallback((id: string) => columns.find(c => c.id === id), [columns]);

  // Visible columns in order
  const visibleColumns = useMemo(() => {
    // Filter to visible columns, maintaining the custom order
    const visibleInOrder = columnOrder
      .map(id => getColumnById(id))
      .filter((c): c is DataTableColumn<T> => c != null && localVisibleColumns.has(c.id));
    return visibleInOrder;
  }, [columns, localVisibleColumns, columnOrder, getColumnById]);
  
  // All pickable columns in order (for the column picker dropdown)
  const orderedPickableColumns = useMemo(() => {
    return columnOrder
      .map(id => getColumnById(id))
      .filter((c): c is DataTableColumn<T> => c != null && !c.hideFromPicker);
  }, [columnOrder, getColumnById]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchFilter) return data;
    return data.filter(row => searchFilter(row, searchQuery));
  }, [data, searchQuery, searchFilter]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    
    const column = columns.find(c => c.id === sortConfig.columnId);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (column.sortAccessor) {
        aVal = column.sortAccessor(a);
        bVal = column.sortAccessor(b);
      } else if (typeof column.accessor === "function") {
        aVal = column.accessor(a);
        bVal = column.accessor(b);
      } else {
        aVal = a[column.accessor];
        bVal = b[column.accessor];
      }

      // Handle nulls
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare
      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortConfig, columns]);

  // Color scaling
  const colorStats = useMemo(() => {
    const stats: Record<string, { min: number; max: number }> = {};
    
    for (const column of visibleColumns) {
      if (!column.colorScale || !column.colorAccessor) continue;
      
      const values = sortedData.map(row => column.colorAccessor!(row));
      if (values.length === 0) continue;
      
      stats[column.id] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
    
    return stats;
  }, [visibleColumns, sortedData]);

  const getColorClass = (columnId: string, value: number): string => {
    const stats = colorStats[columnId];
    if (!stats || stats.min === stats.max) {
      return "text-zinc-400";
    }

    const position = (value - stats.min) / (stats.max - stats.min);
    
    if (position >= 0.9) {
      return "bg-emerald-500/40 text-emerald-200";
    } else if (position >= 0.7) {
      return "bg-emerald-500/25 text-emerald-300";
    } else if (position >= 0.5) {
      return "bg-emerald-500/15 text-emerald-400";
    } else if (position >= 0.3) {
      return "bg-emerald-500/8 text-zinc-300";
    } else {
      return "text-zinc-400";
    }
  };

  // Handlers
  const handleSort = (columnId: string) => {
    setSortConfig(prev => {
      if (prev?.columnId === columnId) {
        return { columnId, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { columnId, direction: "desc" };
    });
  };

  const toggleColumn = (columnId: string) => {
    setLocalVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      onColumnVisibilityChange?.(Array.from(next));
      return next;
    });
  };
  
  // Reorder columns via drag and drop
  // We use column IDs instead of indices to avoid issues with filtered arrays
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  
  const handleColumnDragStart = useCallback((columnId: string) => {
    setDragColumnId(columnId);
  }, []);
  
  const handleColumnDragOver = useCallback((targetColumnId: string) => {
    if (dragColumnId === null || dragColumnId === targetColumnId) return;
    
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const dragIndex = newOrder.indexOf(dragColumnId);
      const targetIndex = newOrder.indexOf(targetColumnId);
      
      if (dragIndex === -1 || targetIndex === -1) return prev;
      
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);
      return newOrder;
    });
  }, [dragColumnId]);
  
  const handleColumnDragEnd = useCallback(() => {
    setDragColumnId(null);
  }, []);

  // Get cell value
  const getCellValue = (row: T, column: DataTableColumn<T>): unknown => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  // Sort indicator
  const SortIndicator = ({ columnId }: { columnId: string }) => {
    if (sortConfig?.columnId !== columnId) return null;
    return (
      <svg className="w-4 h-4 ml-1 text-blue-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortConfig.direction === "asc" ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        {searchFilter && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none w-48"
          />
        )}

        {/* Custom controls */}
        {controls}

        {/* Column Selector */}
        {showColumnSelector && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white hover:border-zinc-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Columns ({localVisibleColumns.size})</span>
            </button>

            {showColumnPicker && (
              <div className="absolute top-full right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-[9999]">
                {/* All / Defaults / None buttons */}
                <div className="flex items-center gap-1 p-2 border-b border-zinc-800">
                  <button
                    onClick={() => {
                      const pickable = columns.filter(c => !c.hideFromPicker).map(c => c.id);
                      setLocalVisibleColumns(new Set(pickable));
                      onColumnVisibilityChange?.(pickable);
                    }}
                    className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      const defaults = visibleColumnIds ?? columns.filter(c => !c.hidden).map(c => c.id);
                      setLocalVisibleColumns(new Set(defaults));
                      onColumnVisibilityChange?.(defaults);
                      // Reset order to default
                      setColumnOrder(columns.map(c => c.id));
                    }}
                    className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    Defaults
                  </button>
                  <button
                    onClick={() => {
                      // Keep at least the first column (usually card name)
                      const first = columns[0]?.id;
                      const minimal = first ? [first] : [];
                      setLocalVisibleColumns(new Set(minimal));
                      onColumnVisibilityChange?.(minimal);
                    }}
                    className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    None
                  </button>
                </div>
                <div className="p-1 text-[10px] text-zinc-500 text-center border-b border-zinc-800">
                  Drag handles to reorder columns
                </div>
                <div className="p-2">
                  {orderedPickableColumns
                    .filter(column => !column.sticky) // Exclude fixed columns like Card
                    .map((column) => (
                      <DraggableItem
                        key={column.id}
                        id={column.id}
                        onDragStart={handleColumnDragStart}
                        onDragOver={handleColumnDragOver}
                        onDragEnd={handleColumnDragEnd}
                      >
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localVisibleColumns.has(column.id)}
                            onChange={() => toggleColumn(column.id)}
                            className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-zinc-300 flex-1">{column.label || column.id}</span>
                          {/* Drag handle on the right */}
                          <span 
                            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 shrink-0"
                            title="Drag to reorder"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </span>
                        </label>
                      </DraggableItem>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data count */}
        <span className="text-sm text-zinc-500">
          {sortedData.length} item{sortedData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-auto max-h-[calc(100vh-200px)]">
        <table className="border-collapse" style={{ width: 'max-content', minWidth: '100%' }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-zinc-800">
                {visibleColumns.map((column, index) => {
                  const isSticky = column.sticky || index === 0;
                  return (
                    <th
                      key={column.id}
                      onClick={() => {
                        if (column.onHeaderClick) {
                          column.onHeaderClick();
                        } else if (column.sortable !== false) {
                          handleSort(column.id);
                        }
                      }}
                      className={`
                        px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap bg-zinc-800
                        ${column.sortable !== false ? "cursor-pointer hover:text-white" : ""}
                        ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}
                        ${isSticky ? "sticky left-0 top-0 z-40 border-r border-zinc-700" : ""}
                      `}
                      style={{ 
                        minWidth: column.minWidth,
                        width: column.width,
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {column.headerIcon === "link" && (
                          <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Synced from linked accounts">
                            <title>Synced from linked accounts</title>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                        {column.headerLabel || column.label}
                        {column.sortable !== false && <SortIndicator columnId={column.id} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sortedData.map((row) => {
                const key = keyAccessor(row);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      hover:bg-zinc-800/30
                      ${onRowClick ? "cursor-pointer" : ""}
                      ${rowClassName?.(row) ?? ""}
                    `}
                  >
                    {visibleColumns.map((column, index) => {
                      const isSticky = column.sticky || index === 0;
                      const value = getCellValue(row, column);
                      
                      // Color scaling
                      let colorClass = "";
                      if (column.colorScale && column.colorAccessor) {
                        const numValue = column.colorAccessor(row);
                        colorClass = getColorClass(column.id, numValue);
                      }
                      
                      return (
                        <td
                          key={column.id}
                          className={`
                            px-4 py-3 text-sm
                            ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}
                            ${isSticky ? "sticky left-0 z-10 bg-zinc-900 border-r border-zinc-700" : ""}
                            ${colorClass}
                          `}
                          style={{ 
                            minWidth: column.minWidth,
                            width: column.width,
                          }}
                        >
                          {column.render ? column.render(row, value) : (value as React.ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
        </table>

        {sortedData.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Click outside to close column picker */}
      {showColumnPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnPicker(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helper Components for Common Patterns
// ============================================================================

// Currency formatter
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Percentage formatter
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Date formatter
export function formatDate(dateStr: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr + "T00:00:00"); // Parse as local date
  return date.toLocaleDateString("en-US", options ?? { month: "numeric", day: "numeric", year: "2-digit" });
}

// Badge component for status/type indicators
export function Badge({ 
  children, 
  variant = "default" 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "error" | "info"; 
}) {
  const variantClasses = {
    default: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
    info: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}

// Clickable cell that triggers a popup/modal
export function ClickableCell({ 
  children, 
  onClick,
  tooltip,
}: { 
  children: React.ReactNode; 
  onClick: () => void;
  tooltip?: string;
}) {
  const content = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
    >
      {children}
    </button>
  );

  if (tooltip) {
    return <Tooltip text={tooltip}>{content}</Tooltip>;
  }

  return content;
}

