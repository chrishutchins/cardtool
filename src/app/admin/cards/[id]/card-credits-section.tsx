"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X, Trash2 } from "lucide-react";

type Credit = {
  id: string;
  name: string;
  brand_name: string | null;
  credit_count: number;
  reset_cycle: string;
  renewal_period_months: number | null;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  is_active: boolean;
  notes: string | null;
  must_be_earned: boolean;
};

interface CardCreditsSectionProps {
  credits: Credit[];
  onAddCredit: (formData: FormData) => Promise<void>;
  onToggleActive: (creditId: string, isActive: boolean) => Promise<void>;
  onDelete: (creditId: string) => Promise<void>;
}

export function CardCreditsSection({
  credits,
  onAddCredit,
  onToggleActive,
  onDelete,
}: CardCreditsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resetCycle, setResetCycle] = useState("monthly");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatValue = (credit: Credit) => {
    if (credit.default_value_cents) {
      return `$${(credit.default_value_cents / 100).toFixed(0)}`;
    }
    if (credit.default_quantity && credit.unit_name) {
      return `${credit.default_quantity} ${credit.unit_name}${credit.default_quantity > 1 ? "s" : ""}`;
    }
    if (credit.default_quantity) {
      return `${credit.default_quantity} units`;
    }
    return "—";
  };

  const formatResetCycle = (credit: Credit) => {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      semiannual: "Semi-Annual",
      annual: "Annual",
      cardmember_year: "Cardmember Year",
      usage_based: "Usage-Based",
    };
    let label = labels[credit.reset_cycle] || credit.reset_cycle;
    if (credit.reset_cycle === "usage_based" && credit.renewal_period_months) {
      const years = credit.renewal_period_months / 12;
      if (years === Math.floor(years)) {
        label += ` (${years}yr)`;
      } else {
        label += ` (${credit.renewal_period_months}mo)`;
      }
    }
    return label;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await onAddCredit(formData);
      form.reset();
      setResetCycle("monthly");
      setIsModalOpen(false);
    });
  };

  const handleDelete = (creditId: string) => {
    if (!confirm("Are you sure you want to delete this credit?")) return;
    setDeletingId(creditId);
    startTransition(async () => {
      await onDelete(creditId);
      setDeletingId(null);
    });
  };

  // Sort credits by name
  const sortedCredits = [...credits].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Card Credits</h2>
          <p className="text-sm text-zinc-400">
            {credits.length} credit{credits.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Credit
        </button>
      </div>

      {credits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No credits defined for this card.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          {sortedCredits.map((credit) => (
            <div
              key={credit.id}
              className={`px-4 py-3 flex items-center justify-between ${
                !credit.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{credit.name}</span>
                  {credit.credit_count > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400">
                      ×{credit.credit_count}
                    </span>
                  )}
                  {credit.brand_name && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                      {credit.brand_name}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">
                    {formatResetCycle(credit)}
                  </span>
                  {credit.must_be_earned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400">
                      Earned
                    </span>
                  )}
                  {!credit.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Value: {formatValue(credit)}
                  {credit.notes && (
                    <span className="ml-3 text-zinc-500">• {credit.notes}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link
                  href={`/admin/credits/${credit.id}`}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    await onToggleActive(credit.id, !credit.is_active);
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {credit.is_active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <button
                  onClick={() => handleDelete(credit.id)}
                  disabled={deletingId === credit.id}
                  className="p-1 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Credit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Add Credit</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Credit Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g., Uber Credit"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Brand Name <span className="text-zinc-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="brand_name"
                      placeholder="e.g., Uber, Grubhub"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Credit Count
                      <span className="text-zinc-500 font-normal ml-1">
                        (for multi-use)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="credit_count"
                      min="1"
                      defaultValue="1"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Reset Cycle
                    </label>
                    <select
                      name="reset_cycle"
                      required
                      value={resetCycle}
                      onChange={(e) => setResetCycle(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semiannual">Semi-Annual</option>
                      <option value="annual">Calendar Year</option>
                      <option value="cardmember_year">Cardmember Year</option>
                      <option value="usage_based">Usage Based</option>
                    </select>
                  </div>

                  {resetCycle === "usage_based" && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Renewal Period (months)
                      </label>
                      <input
                        type="number"
                        name="renewal_period_months"
                        min="1"
                        placeholder="e.g., 12"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Default Value <span className="text-zinc-500">($)</span>
                    </label>
                    <input
                      type="number"
                      name="default_value"
                      step="0.01"
                      placeholder="e.g., 15.00"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Quantity <span className="text-zinc-500">(optional)</span>
                    </label>
                    <input
                      type="number"
                      name="default_quantity"
                      min="1"
                      placeholder="e.g., 4"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Unit Name <span className="text-zinc-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="unit_name"
                      placeholder="e.g., nights, visits"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Notes <span className="text-zinc-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="notes"
                      placeholder="Additional details about this credit"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="must_be_earned_modal"
                      name="must_be_earned"
                      value="true"
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="must_be_earned_modal"
                      className="text-sm text-zinc-300 cursor-pointer"
                    >
                      Must be earned (e.g., Free Night Awards)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? "Adding..." : "Add Credit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
