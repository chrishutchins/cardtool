"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";

interface Card {
  id: string;
  name: string;
  slug: string;
}

interface AddCreditModalProps {
  cards: Card[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export function AddCreditModal({ cards, onSubmit }: AddCreditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resetCycle, setResetCycle] = useState("monthly");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await onSubmit(formData);
      form.reset();
      setResetCycle("monthly");
      setIsOpen(false);
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Credit
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Add New Credit</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Card</label>
                    <select
                      name="card_id"
                      required
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Select a card...</option>
                      {cards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Credit Name</label>
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
                      Canonical Name
                      <span className="text-zinc-500 font-normal ml-1">(for matching across cards)</span>
                    </label>
                    <input
                      type="text"
                      name="canonical_name"
                      placeholder="e.g., Saks Credit, Delta Stays"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Credit Count
                      <span className="text-zinc-500 font-normal ml-1">(for multi-use credits)</span>
                    </label>
                    <input
                      type="number"
                      name="credit_count"
                      min="1"
                      defaultValue="1"
                      placeholder="1"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Reset Cycle</label>
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
                    <label htmlFor="must_be_earned_modal" className="text-sm text-zinc-300 cursor-pointer">
                      Must be earned (e.g., Free Night Awards)
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
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
    </>
  );
}

