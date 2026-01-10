"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatRate } from "@/lib/earning-calculator";

export interface EarningRule {
  id: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  rate: number;
  has_cap: boolean;
  cap_amount: number | null;
  cap_period: "month" | "quarter" | "year" | "lifetime" | null;
  cap_unit: "spend" | "points" | null;
  post_cap_rate: number | null;
  booking_method: "any" | "portal" | "brand";
  brand_name: string | null;
}

export interface CategoryBonus {
  id: string;
  cap_type: string;
  cap_amount: number | null;
  cap_period: string | null;
  elevated_rate: number;
  post_cap_rate: number | null;
  category_ids: number[];
  category_names: string[];
}

interface BonusCategoriesPopupProps {
  cardName: string;
  earningRules: EarningRule[];
  categoryBonuses: CategoryBonus[];
  defaultEarnRate: number;
  currencyType?: string;
  currencyName?: string;
  trigger?: React.ReactNode;
}

// Format cap period
function formatCapPeriod(period: string | null): string {
  switch (period) {
    case "month":
      return "/mo";
    case "quarter":
      return "/qtr";
    case "year":
      return "/yr";
    case "lifetime":
      return "";
    default:
      return "";
  }
}

// Format cap type
function formatCapType(capType: string): string {
  switch (capType) {
    case "top_category":
      return "Top spending category";
    case "top_two_categories":
      return "Top 2 spending categories";
    case "top_three_categories":
      return "Top 3 spending categories";
    case "selected_category":
      return "Selected category";
    case "second_top_category":
      return "2nd top spending category";
    case "all_categories":
      return "All purchases";
    case "combined_categories":
      return "Combined categories";
    case "rotating_categories":
      return "Rotating categories";
    case "first_year":
      return "First year";
    case "intro_offer":
      return "Intro offer";
    default:
      // Convert snake_case to Title Case
      return capType.split("_").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ");
  }
}

// Format booking method
function formatBookingMethod(method: "any" | "portal" | "brand", brandName: string | null): string {
  switch (method) {
    case "any":
      return "Direct booking";
    case "portal":
      return "Portal booking";
    case "brand":
      return brandName ? `${brandName} booking` : "Brand booking";
    default:
      return "";
  }
}

export function BonusCategoriesPopup({
  cardName,
  earningRules,
  categoryBonuses,
  defaultEarnRate,
  currencyType,
  currencyName,
  trigger,
}: BonusCategoriesPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("below");
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Sort earning rules by rate (highest first)
  const sortedRules = [...earningRules].sort((a, b) => b.rate - a.rate);
  
  // Separate rules with elevated rates (bonuses) vs base rates
  const bonusRules = sortedRules.filter(r => r.rate > defaultEarnRate);
  const hasBonuses = bonusRules.length > 0 || categoryBonuses.length > 0;

  // Check position on open
  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // If less than 300px from bottom, show above
      setPosition(viewportHeight - rect.bottom < 300 ? "above" : "below");
    }
  }, [isOpen]);

  // Close on outside click - use mousedown for immediate response
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside the popup content
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Use mousedown for immediate response (before click event)
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  }, [isOpen]);

  const positionClasses = position === "above" 
    ? "bottom-full mb-2" 
    : "top-full mt-2";

  // Default trigger - green for interactive, no underline
  const defaultTrigger = hasBonuses ? (
    <span className="text-emerald-400 hover:text-emerald-300 transition-colors">
      {bonusRules.length + categoryBonuses.length}
    </span>
  ) : (
    <span className="text-zinc-500 hover:text-zinc-400 transition-colors">
      {earningRules.length}
    </span>
  );

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={handleClick} className="cursor-pointer">
        {trigger ?? defaultTrigger}
      </div>
      
      {isOpen && (
        <div 
          ref={popupRef}
          className={`absolute left-0 ${positionClasses} w-72 max-h-96 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-[9999]`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-zinc-800 border-b border-zinc-700 px-3 py-2 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-white text-left">{cardName}</h3>
              {currencyName && (
                <p className="text-xs text-zinc-400">{currencyName}</p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors p-1 -mr-1 -mt-1"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-2">
            {/* Category Bonuses (special earning structures like top categories) */}
            {categoryBonuses.map((bonus) => (
              <div key={bonus.id} className="rounded bg-zinc-800/50 p-2 border border-zinc-700/50 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white text-left">{formatCapType(bonus.cap_type)}</span>
                  <span className="text-sm font-mono text-emerald-400 ml-4">
                    {formatRate(bonus.elevated_rate, currencyType as never)}
                  </span>
                </div>
                {bonus.category_names.length > 0 && bonus.cap_type !== "all_categories" && (
                  <div className="text-xs text-zinc-400 mt-1 text-left">
                    On: {bonus.category_names.join(", ")}
                  </div>
                )}
                {bonus.cap_amount && (
                  <div className="text-xs text-zinc-500 mt-1 text-left">
                    Cap: ${bonus.cap_amount.toLocaleString()}{formatCapPeriod(bonus.cap_period)}
                    {bonus.post_cap_rate != null && (
                      <span> → {formatRate(bonus.post_cap_rate, currencyType as never)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Regular Bonus Categories - sorted by rate descending */}
            {bonusRules.map((rule) => (
              <div key={rule.id} className="flex items-center py-1.5 px-2 rounded hover:bg-zinc-800/50">
                <div className="flex-1 text-left">
                  <span className="text-sm text-white">{rule.category_name}</span>
                  {rule.booking_method !== "any" && (
                    <span className="ml-2 text-xs text-purple-400">
                      ({formatBookingMethod(rule.booking_method, rule.brand_name)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <span className="text-sm font-mono text-emerald-400">
                    {formatRate(rule.rate, currencyType as never)}
                  </span>
                  {rule.has_cap && rule.cap_amount && (
                    <span 
                      className="text-xs text-amber-500 cursor-help group/cap relative"
                      title={`Cap: $${rule.cap_amount.toLocaleString()}${formatCapPeriod(rule.cap_period)}${rule.post_cap_rate != null ? ` → ${formatRate(rule.post_cap_rate, currencyType as never)} after` : ''}`}
                    >
                      †
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Everything Else - same style but white rate */}
            <div className="flex items-center py-1.5 px-2 rounded hover:bg-zinc-800/50">
              <span className="flex-1 text-sm text-white text-left">Everything Else</span>
              <span className="text-sm font-mono text-zinc-300 ml-4">
                {formatRate(defaultEarnRate, currencyType as never)}
              </span>
            </div>

            {/* Empty state */}
            {earningRules.length === 0 && categoryBonuses.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">
                No bonus categories configured for this card.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
