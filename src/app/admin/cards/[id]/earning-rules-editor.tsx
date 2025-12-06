"use client";

import { useState, useTransition, useMemo } from "react";
import { Tables, Database, Enums } from "@/lib/database.types";
import { formatRate } from "@/lib/earning-calculator";

// Simplified type for the rule as returned from the query
interface EarningRule {
  id: string;
  card_id: string;
  category_id: number;
  rate: number;
  has_cap: boolean;
  cap_amount: number | null;
  cap_unit: Database["public"]["Enums"]["cap_unit"] | null;
  cap_period: Database["public"]["Enums"]["cap_period"];
  post_cap_rate: number | null;
  notes: string | null;
  booking_method: Database["public"]["Enums"]["booking_method"];
  brand_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  earning_categories: {
    id: number;
    name: string;
    slug: string;
    parent_category_id: number | null;
  } | null;
}

interface EarningRulesEditorProps {
  rules: EarningRule[];
  availableCategories: Tables<"earning_categories">[];
  onAddRule: (formData: FormData) => Promise<void>;
  onUpdateRule: (ruleId: string, formData: FormData) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  cardCurrencyType?: Enums<"reward_currency_type">;
  cardCurrencyName?: string;
}

// Travel subcategory slugs
const TRAVEL_SUBCATEGORY_SLUGS = ["flights", "hotels", "rental-car"];

type SortField = "category" | "rate" | "booking";
type SortDirection = "asc" | "desc";

export function EarningRulesEditor({
  rules,
  availableCategories,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  cardCurrencyType,
  cardCurrencyName,
}: EarningRulesEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [hasCap, setHasCap] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("category");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Add form state for booking method
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [bookingMethod, setBookingMethod] = useState<"any" | "portal" | "brand">("any");
  const [brandName, setBrandName] = useState("");
  
  // Edit form state
  const [editRate, setEditRate] = useState("");
  const [editHasCap, setEditHasCap] = useState(false);
  const [editCapAmount, setEditCapAmount] = useState("");
  const [editCapUnit, setEditCapUnit] = useState<"spend" | "rewards">("spend");
  const [editCapPeriod, setEditCapPeriod] = useState<"none" | "month" | "quarter" | "year" | "lifetime">("year");
  const [editPostCapRate, setEditPostCapRate] = useState("");
  const [editBookingMethod, setEditBookingMethod] = useState<"any" | "portal" | "brand">("any");
  const [editBrandName, setEditBrandName] = useState("");

  // Determine if this card can have brand-specific booking (airline or hotel cards)
  const isAirlineCard = cardCurrencyType === "airline_miles";
  const isHotelCard = cardCurrencyType === "hotel_points";
  const canHaveBrandBooking = isAirlineCard || isHotelCard;
  
  // Get brand name from currency name (e.g., "Hyatt" from "Hyatt", "Delta" from "Delta")
  const defaultBrandName = cardCurrencyName ?? "";

  // Check if a category is a travel subcategory
  const isTravelCategoryById = (categoryId: number) => {
    const category = availableCategories.find(c => c.id === categoryId);
    return category && (
      TRAVEL_SUBCATEGORY_SLUGS.includes(category.slug) || 
      category.parent_category_id !== null
    );
  };
  
  // Check if a rule's category is a travel subcategory (using embedded category data)
  const isTravelCategory = (rule: EarningRule) => {
    const embeddedCategory = rule.earning_categories;
    if (embeddedCategory) {
      return TRAVEL_SUBCATEGORY_SLUGS.includes(embeddedCategory.slug) || 
             embeddedCategory.parent_category_id !== null;
    }
    return isTravelCategoryById(rule.category_id);
  };
  
  // Check if brand booking is applicable for a specific category
  const canShowBrandOption = (categorySlug: string) => {
    if (!canHaveBrandBooking) return false;
    if (categorySlug === "flights" && isAirlineCard) return true;
    if (categorySlug === "hotels" && isHotelCard) return true;
    return false;
  };
  
  const canShowBrandOptionForRule = (rule: EarningRule) => {
    const slug = rule.earning_categories?.slug;
    if (!slug) return false;
    return canShowBrandOption(slug);
  };

  const selectedCategory = availableCategories.find(c => c.id === parseInt(selectedCategoryId));
  const showBookingMethod = selectedCategory && isTravelCategoryById(selectedCategory.id);
  const showBrandOption = selectedCategory && canShowBrandOption(selectedCategory.slug);

  // Sort rules
  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      switch (sortField) {
        case "category":
          aVal = a.earning_categories?.name ?? "";
          bVal = b.earning_categories?.name ?? "";
          break;
        case "rate":
          aVal = a.rate;
          bVal = b.rate;
          break;
        case "booking":
          // Sort order: Direct < Portal < Brand
          const bookingOrder = { any: 0, portal: 1, brand: 2 };
          aVal = bookingOrder[a.booking_method] ?? 0;
          bVal = bookingOrder[b.booking_method] ?? 0;
          break;
      }
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number) 
        : (bVal as number) - (aVal as number);
    });
  }, [rules, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
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

  const startEdit = (rule: EarningRule) => {
    setEditingRuleId(rule.id);
    setEditRate(rule.rate.toString());
    setEditHasCap(rule.has_cap);
    setEditCapAmount(rule.cap_amount?.toString() ?? "");
    setEditCapUnit(rule.cap_unit ?? "spend");
    setEditCapPeriod(rule.cap_period);
    setEditPostCapRate(rule.post_cap_rate?.toString() ?? "");
    setEditBookingMethod(rule.booking_method);
    setEditBrandName(rule.brand_name ?? defaultBrandName);
  };

  const handleUpdate = (ruleId: string) => {
    const formData = new FormData();
    formData.set("rate", editRate);
    formData.set("has_cap", editHasCap ? "true" : "false");
    formData.set("cap_amount", editCapAmount);
    formData.set("cap_unit", editCapUnit);
    formData.set("cap_period", editCapPeriod);
    formData.set("post_cap_rate", editPostCapRate);
    formData.set("booking_method", editBookingMethod);
    formData.set("brand_name", editBrandName);

    startTransition(async () => {
      await onUpdateRule(ruleId, formData);
      setEditingRuleId(null);
    });
  };

  const capPeriodLabels: Record<string, string> = {
    none: "None",
    month: "Monthly",
    quarter: "Quarterly",
    year: "Yearly",
    lifetime: "Lifetime",
  };

  // Get display text for booking method
  const getBookingDisplay = (rule: EarningRule) => {
    if (!isTravelCategory(rule)) return null;
    
    switch (rule.booking_method) {
      case "any":
        return { text: "Direct", className: "bg-zinc-700 text-zinc-300" };
      case "portal":
        return { text: "Portal", className: "bg-purple-900/50 text-purple-400" };
      case "brand":
        return { text: rule.brand_name || defaultBrandName || "Brand", className: "bg-emerald-900/50 text-emerald-400" };
      default:
        return { text: "Direct", className: "bg-zinc-700 text-zinc-300" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Rules */}
      {rules.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-zinc-200 whitespace-nowrap"
                  onClick={() => handleSort("category")}
                >
                  <span className="inline-flex items-center">Category<SortIcon field="category" /></span>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-zinc-200 whitespace-nowrap"
                  onClick={() => handleSort("rate")}
                >
                  <span className="inline-flex items-center">Rate<SortIcon field="rate" /></span>
                </th>
                <th 
                  className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:text-zinc-200 whitespace-nowrap"
                  onClick={() => handleSort("booking")}
                >
                  <span className="inline-flex items-center">Booking<SortIcon field="booking" /></span>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400 uppercase whitespace-nowrap">
                  Cap
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400 uppercase whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {sortedRules.map((rule) => (
                editingRuleId === rule.id ? (
                  <tr key={rule.id} className="bg-zinc-800/50">
                    <td className="px-4 py-3 text-white">
                      {rule.earning_categories?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="w-20 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {isTravelCategory(rule) ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={editBookingMethod}
                            onChange={(e) => {
                              setEditBookingMethod(e.target.value as "any" | "portal" | "brand");
                              if (e.target.value === "brand" && !editBrandName) {
                                setEditBrandName(defaultBrandName);
                              }
                            }}
                            className="w-28 rounded border border-zinc-600 bg-zinc-700 px-1 py-1 text-white text-xs"
                          >
                            <option value="any">Direct</option>
                            <option value="portal">Portal</option>
                            {canShowBrandOptionForRule(rule) && (
                              <option value="brand">{defaultBrandName || "Brand"}</option>
                            )}
                          </select>
                          {editBookingMethod === "brand" && defaultBrandName && (
                            <span className="text-xs text-zinc-400 px-1">
                              {defaultBrandName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1 text-xs text-zinc-300">
                          <input
                            type="checkbox"
                            checked={editHasCap}
                            onChange={(e) => setEditHasCap(e.target.checked)}
                            className="rounded border-zinc-600 bg-zinc-700"
                          />
                          Cap
                        </label>
                        {editHasCap && (
                          <>
                            <input
                              type="number"
                              value={editCapAmount}
                              onChange={(e) => setEditCapAmount(e.target.value)}
                              placeholder="Amount"
                              className="w-24 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
                            />
                            <select
                              value={editCapUnit}
                              onChange={(e) => setEditCapUnit(e.target.value as "spend" | "rewards")}
                              className="rounded border border-zinc-600 bg-zinc-700 px-1 py-1 text-white text-xs"
                            >
                              <option value="spend">$</option>
                              <option value="rewards">pts</option>
                            </select>
                            <select
                              value={editCapPeriod}
                              onChange={(e) => setEditCapPeriod(e.target.value as "none" | "month" | "quarter" | "year" | "lifetime")}
                              className="rounded border border-zinc-600 bg-zinc-700 px-1 py-1 text-white text-xs"
                            >
                              <option value="year">Year</option>
                              <option value="quarter">Qtr</option>
                              <option value="month">Mo</option>
                              <option value="lifetime">Life</option>
                            </select>
                            <input
                              type="number"
                              step="0.1"
                              value={editPostCapRate}
                              onChange={(e) => setEditPostCapRate(e.target.value)}
                              placeholder="Post-cap"
                              className="w-16 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
                            />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleUpdate(rule.id)}
                          disabled={isPending}
                          className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRuleId(null)}
                          className="text-xs text-zinc-400 hover:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={rule.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white">
                      {rule.earning_categories?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono">
                      {formatRate(rule.rate, cardCurrencyType)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const display = getBookingDisplay(rule);
                        if (!display) return <span className="text-zinc-500">—</span>;
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${display.className}`}>
                            {display.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {rule.has_cap ? (
                        <span>
                          {rule.cap_unit === "spend" ? "$" : ""}
                          {rule.cap_amount != null ? rule.cap_amount.toLocaleString() : "N/A"}
                          {rule.cap_unit === "rewards" ? " pts" : ""}
                          {rule.cap_period && rule.cap_period !== "none" ? ` / ${rule.cap_period}` : ""}
                          {rule.post_cap_rate != null && (
                            <span className="text-zinc-500"> → {formatRate(rule.post_cap_rate, cardCurrencyType)}</span>
                          )}
                        </span>
                      ) : (
                        "No cap"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => startEdit(rule)}
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => startTransition(() => onDeleteRule(rule.id))}
                          disabled={isPending}
                          className="text-sm text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">No earning rules yet. Add one below.</p>
      )}

      {/* Add Rule Form */}
      {showAddForm ? (
        <form
          action={(formData) => {
            formData.set("booking_method", bookingMethod);
            formData.set("brand_name", brandName);
            startTransition(async () => {
              await onAddRule(formData);
              setShowAddForm(false);
              setHasCap(false);
              setBookingMethod("any");
              setBrandName("");
              setSelectedCategoryId("");
            });
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
              <select
                name="category_id"
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setBookingMethod("any");
                  setBrandName("");
                }}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select category...</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Rate</label>
              <input
                type="number"
                name="rate"
                step="0.1"
                min="0"
                placeholder="e.g., 3.0"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            {showBookingMethod && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Booking Method</label>
                <select
                  value={bookingMethod}
                  onChange={(e) => {
                    const value = e.target.value as "any" | "portal" | "brand";
                    setBookingMethod(value);
                    if (value === "brand") {
                      setBrandName(defaultBrandName);
                    } else {
                      setBrandName("");
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="any">Direct</option>
                  <option value="portal">Portal</option>
                  {showBrandOption && (
                    <option value="brand">{defaultBrandName || "Brand"}</option>
                  )}
                </select>
              </div>
            )}
            {showBookingMethod && bookingMethod === "brand" && defaultBrandName && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Brand</label>
                <div className="px-3 py-2 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-300">
                  {defaultBrandName}
                </div>
              </div>
            )}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="has_cap"
                  value="true"
                  checked={hasCap}
                  onChange={(e) => setHasCap(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-700"
                />
                Has spending cap
              </label>
            </div>
          </div>

          {hasCap && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-zinc-700">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Amount</label>
                <input
                  type="number"
                  name="cap_amount"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 25000"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Unit</label>
                <select
                  name="cap_unit"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="spend">Spend ($)</option>
                  <option value="rewards">Rewards</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cap Period</label>
                <select
                  name="cap_period"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="year">Yearly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="month">Monthly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Post-Cap Rate</label>
                <input
                  type="number"
                  name="post_cap_rate"
                  step="0.1"
                  min="0"
                  placeholder="e.g., 1.0"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add Rule"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setHasCap(false);
                setBookingMethod("any");
                setBrandName("");
                setSelectedCategoryId("");
              }}
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        availableCategories.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg border border-dashed border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            + Add Earning Rule
          </button>
        )
      )}

      {availableCategories.length === 0 && !showAddForm && (
        <p className="text-sm text-zinc-500">All categories have rules assigned.</p>
      )}
    </div>
  );
}
