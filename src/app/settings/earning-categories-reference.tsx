"use client";

import { useState } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_category_id: number | null;
  excluded_by_default: boolean;
  description?: string | null;
}

interface EarningCategoriesReferenceProps {
  categories: Category[];
}

export function EarningCategoriesReference({ categories }: EarningCategoriesReferenceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Separate parent and child categories
  const parentCategories = categories.filter(c => c.parent_category_id === null);
  const childCategories = categories.filter(c => c.parent_category_id !== null);
  
  // Build a map of children by parent ID
  const childrenByParent = new Map<number, Category[]>();
  childCategories.forEach(child => {
    if (child.parent_category_id) {
      const existing = childrenByParent.get(child.parent_category_id) ?? [];
      existing.push(child);
      childrenByParent.set(child.parent_category_id, existing);
    }
  });

  // Filter categories based on search
  const filteredParentCategories = parentCategories.filter(cat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesSelf = cat.name.toLowerCase().includes(query) || cat.slug.toLowerCase().includes(query);
    const children = childrenByParent.get(cat.id) ?? [];
    const matchesChild = children.some(c => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query));
    return matchesSelf || matchesChild;
  });

  // Sort alphabetically
  const sortedCategories = [...filteredParentCategories].sort((a, b) => a.name.localeCompare(b.name));

  // Count total (included) categories
  const includedCount = categories.filter(c => !c.excluded_by_default).length;
  const excludedCount = categories.filter(c => c.excluded_by_default).length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white">
          Earning Categories Reference
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
        >
          {isExpanded ? "Hide" : "Show"} all categories
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      <p className="text-sm text-zinc-400 mb-4">
        These {includedCount} categories are used to calculate your earnings and compare cards. 
        {excludedCount > 0 && ` ${excludedCount} additional categories are tracked separately.`}
      </p>

      {isExpanded && (
        <div className="space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />

          {/* Categories list */}
          <div className="max-h-96 overflow-y-auto space-y-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
            {sortedCategories.length > 0 ? (
              sortedCategories.map((category) => {
                const children = childrenByParent.get(category.id) ?? [];
                const hasMatchingChildren = searchQuery && children.some(c => 
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  c.slug.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                return (
                  <div key={category.id} className="py-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${category.excluded_by_default ? "text-zinc-500" : "text-zinc-200"}`}>
                          {category.name}
                        </span>
                        {category.excluded_by_default && (
                          <span className="text-xs text-amber-500/70 px-1.5 py-0.5 rounded bg-amber-500/10">
                            excluded
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-600 font-mono">
                        {category.slug}
                      </span>
                    </div>
                    
                    {/* Child categories */}
                    {(children.length > 0 && (hasMatchingChildren || !searchQuery)) && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-zinc-700 pl-3">
                        {children
                          .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.slug.toLowerCase().includes(searchQuery.toLowerCase()))
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((child) => (
                            <div key={child.id} className="flex items-center justify-between py-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${child.excluded_by_default ? "text-zinc-500" : "text-zinc-400"}`}>
                                  {child.name}
                                </span>
                                {child.excluded_by_default && (
                                  <span className="text-xs text-amber-500/70 px-1 py-0 rounded bg-amber-500/10">
                                    excluded
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-700 font-mono">
                                {child.slug}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                No categories match your search.
              </p>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              <span className="text-zinc-200">Name</span> = included in calculations
            </span>
            <span>
              <span className="text-zinc-500">Name</span> + <span className="text-amber-500/70 px-1 rounded bg-amber-500/10">excluded</span> = tracked separately
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


