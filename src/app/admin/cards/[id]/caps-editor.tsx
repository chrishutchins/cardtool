"use client";

import { useState, useTransition } from "react";
import { Tables, Enums } from "@/lib/database.types";
import { formatRate } from "@/lib/earning-calculator";

interface Cap {
  id: string;
  cap_type: Enums<"cap_type">;
  cap_amount: number | null;
  cap_period: Enums<"cap_period"> | null;
  elevated_rate: number;
  post_cap_rate: number | null;
  notes: string | null;
  categories: { id: number; name: string }[];
}

interface CapsEditorProps {
  caps: Cap[];
  allCategories: Tables<"earning_categories">[];
  onAddCap: (formData: FormData) => Promise<void>;
  onUpdateCap: (capId: string, formData: FormData) => Promise<void>;
  onDeleteCap: (capId: string) => Promise<void>;
  onUpdateCapCategories: (capId: string, categoryIds: number[]) => Promise<void>;
  currencyType?: Enums<"reward_currency_type">;
}

// Only show cap types that aren't handled by Earning Rules
// single_category is excluded - use Earning Rules for single category bonuses with caps
const capTypeLabels: Partial<Record<Enums<"cap_type">, string>> = {
  combined_categories: "Combined Categories",
  selected_category: "User Selected",
  top_category: "Top Category",
  top_two_categories: "Top 2 Categories",
  top_three_categories: "Top 3 Categories",
  second_top_category: "2nd Top Category",
  all_categories: "All Categories",
};

// Full labels for display (including legacy single_category)
const allCapTypeLabels: Record<Enums<"cap_type">, string> = {
  single_category: "Single Category",
  combined_categories: "Combined Categories",
  selected_category: "User Selected",
  top_category: "Top Category",
  top_two_categories: "Top 2 Categories",
  top_three_categories: "Top 3 Categories",
  second_top_category: "2nd Top Category",
  all_categories: "All Categories",
};

const periodLabels: Record<Enums<"cap_period">, string> = {
  none: "None",
  month: "Monthly",
  quarter: "Quarterly",
  year: "Yearly",
  lifetime: "Lifetime",
};

export function CapsEditor({
  caps,
  allCategories,
  onAddCap,
  onUpdateCap,
  onDeleteCap,
  onUpdateCapCategories,
  currencyType,
}: CapsEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingCapId, setEditingCapId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  
  // Full edit state
  const [editCapType, setEditCapType] = useState<Enums<"cap_type">>("combined_categories");
  const [editCapAmount, setEditCapAmount] = useState("");
  const [editCapPeriod, setEditCapPeriod] = useState<Enums<"cap_period">>("year");
  const [editElevatedRate, setEditElevatedRate] = useState("");
  const [editPostCapRate, setEditPostCapRate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // New cap form state
  const [capType, setCapType] = useState<Enums<"cap_type">>("combined_categories");
  const [capAmount, setCapAmount] = useState("");
  const [capPeriod, setCapPeriod] = useState<Enums<"cap_period">>("year");
  const [elevatedRate, setElevatedRate] = useState("");
  const [postCapRate, setPostCapRate] = useState("");
  const [notes, setNotes] = useState("");
  const [newCategories, setNewCategories] = useState<number[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("cap_type", capType);
    formData.set("cap_amount", capAmount);
    formData.set("cap_period", capPeriod);
    formData.set("elevated_rate", elevatedRate);
    formData.set("post_cap_rate", postCapRate);
    formData.set("notes", notes);
    formData.set("category_ids", JSON.stringify(newCategories));

    startTransition(async () => {
      await onAddCap(formData);
      setIsAdding(false);
      setCapType("combined_categories");
      setCapAmount("");
      setCapPeriod("year");
      setElevatedRate("");
      setPostCapRate("");
      setNotes("");
      setNewCategories([]);
    });
  };

  const handleDelete = (capId: string) => {
    startTransition(async () => {
      await onDeleteCap(capId);
    });
  };

  const handleEditCategories = (cap: Cap) => {
    setEditingCapId(cap.id);
    setSelectedCategories(cap.categories.map((c) => c.id));
    setEditCapType(cap.cap_type);
    setEditCapAmount(cap.cap_amount?.toString() ?? "");
    setEditCapPeriod(cap.cap_period ?? "year");
    setEditElevatedRate(cap.elevated_rate?.toString() ?? "");
    setEditPostCapRate(cap.post_cap_rate?.toString() ?? "");
    setEditNotes(cap.notes ?? "");
  };

  const handleSaveCap = (capId: string) => {
    const formData = new FormData();
    formData.set("cap_type", editCapType);
    formData.set("cap_amount", editCapAmount);
    formData.set("cap_period", editCapPeriod);
    formData.set("elevated_rate", editElevatedRate);
    formData.set("post_cap_rate", editPostCapRate);
    formData.set("notes", editNotes);
    formData.set("category_ids", JSON.stringify(selectedCategories));

    startTransition(async () => {
      await onUpdateCap(capId, formData);
      setEditingCapId(null);
    });
  };

  const toggleCategory = (categoryId: number, isNew: boolean = false) => {
    if (isNew) {
      setNewCategories((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      );
    } else {
      setSelectedCategories((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId]
      );
    }
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "No cap";
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Existing Caps */}
      {caps.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Categories
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  Cap
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {caps.map((cap) => (
                editingCapId === cap.id ? (
                  <tr key={cap.id} className="bg-zinc-800/50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Type</label>
                            <select
                              value={editCapType}
                              onChange={(e) => setEditCapType(e.target.value as Enums<"cap_type">)}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            >
                              {/* Use allCapTypeLabels for edit to support legacy single_category */}
                              {Object.entries(allCapTypeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Rate (e.g., 4)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editElevatedRate}
                              onChange={(e) => setEditElevatedRate(e.target.value)}
                              placeholder="e.g., 4"
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Post-Cap Rate</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editPostCapRate}
                              onChange={(e) => setEditPostCapRate(e.target.value)}
                              placeholder="Optional"
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Cap Amount ($)</label>
                            <input
                              type="number"
                              value={editCapAmount}
                              onChange={(e) => setEditCapAmount(e.target.value)}
                              placeholder="No cap"
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Period</label>
                            <select
                              value={editCapPeriod}
                              onChange={(e) => setEditCapPeriod(e.target.value as Enums<"cap_period">)}
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            >
                              {Object.entries(periodLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Optional"
                              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                            />
                          </div>
                        </div>
                        {editCapType !== "all_categories" ? (
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">Categories</label>
                            <div className="flex flex-wrap gap-1">
                              {allCategories.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => toggleCategory(cat.id)}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    selectedCategories.includes(cat.id)
                                      ? "bg-blue-600 text-white"
                                      : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-900/20 border border-emerald-700/50 rounded p-2">
                            <p className="text-xs text-emerald-300">
                              Applies to all non-excluded categories automatically.
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveCap(cap.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
                          >
                            {isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCapId(null)}
                            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={cap.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">
                        {allCapTypeLabels[cap.cap_type]}
                      </span>
                      {cap.notes && (
                        <p className="text-xs text-zinc-500 mt-0.5">{cap.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cap.cap_type === "all_categories" ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-emerald-700/50 text-emerald-300">
                            All (non-excluded)
                          </span>
                        ) : (
                          <>
                            {cap.categories.map((cat) => (
                              <span
                                key={cat.id}
                                className="px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300"
                              >
                                {cat.name}
                              </span>
                            ))}
                            {cap.categories.length === 0 && (
                              <span className="text-zinc-500 text-sm">No categories</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono text-sm">
                      <span className="text-emerald-400 font-semibold">{formatRate(cap.elevated_rate, currencyType)}</span>
                      {cap.post_cap_rate !== null && (
                        <span className="text-zinc-500 text-xs ml-1">→ {formatRate(cap.post_cap_rate, currencyType)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono text-sm">
                      {formatAmount(cap.cap_amount)}
                      {cap.cap_period && cap.cap_period !== "none" && (
                        <span className="text-zinc-500 text-xs ml-1">/{periodLabels[cap.cap_period].toLowerCase().replace("ly", "")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleEditCategories(cap)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cap.id)}
                          disabled={isPending}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
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
        <p className="text-zinc-500 text-sm">No category bonuses configured for this card.</p>
      )}

      {/* Add Cap Form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="border border-zinc-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-white">Add Category Bonus</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Cap Type
              </label>
              <select
                value={capType}
                onChange={(e) => setCapType(e.target.value as Enums<"cap_type">)}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(capTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Cap Period
              </label>
              <select
                value={capPeriod}
                onChange={(e) => setCapPeriod(e.target.value as Enums<"cap_period">)}
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Cap Amount ($)
              </label>
              <input
                type="number"
                value={capAmount}
                onChange={(e) => setCapAmount(e.target.value)}
                placeholder="e.g., 25000"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Bonus Rate (e.g., 4x)
              </label>
              <input
                type="number"
                step="0.1"
                value={elevatedRate}
                onChange={(e) => setElevatedRate(e.target.value)}
                placeholder="e.g., 4"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Post-Cap Rate (optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={postCapRate}
                onChange={(e) => setPostCapRate(e.target.value)}
                placeholder="e.g., 1.0"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Grocery cap"
                className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {capType !== "all_categories" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id, true)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      newCategories.includes(cat.id)
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {capType === "all_categories" && (
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
              <p className="text-sm text-emerald-300">
                This bonus will apply to all categories except those marked as "excluded by default" (e.g., Rent, Mortgage).
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending || (capType !== "all_categories" && newCategories.length === 0)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Adding..." : "Add Cap"}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Add Category Bonus
        </button>
      )}
    </div>
  );
}

