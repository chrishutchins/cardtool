"use client";

import { useState, useTransition } from "react";

interface Card {
  id: string;
  name: string;
  slug: string;
}

interface AddCreditFormProps {
  cards: Card[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export function AddCreditForm({ cards, onSubmit }: AddCreditFormProps) {
  const [resetCycle, setResetCycle] = useState("monthly");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await onSubmit(formData);
      form.reset();
      setResetCycle("monthly");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <label className="block text-sm font-medium text-zinc-400 mb-1">Brand (for grouping)</label>
        <input
          type="text"
          name="brand_name"
          placeholder="e.g., Uber, Clear, Delta"
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
          <option value="annual">Annual</option>
          <option value="cardmember_year">Cardmember Year</option>
          <option value="usage_based">Usage-Based (e.g., Global Entry)</option>
        </select>
      </div>

      {resetCycle === "usage_based" && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Renewal Period (months)</label>
          <input
            type="number"
            name="renewal_period_months"
            min="1"
            required
            placeholder="e.g., 48 for 4 years"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Credit ($)</label>
        <input
          type="number"
          name="default_value"
          step="0.01"
          min="0"
          placeholder="e.g., 15"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Quantity (for non-$ credits)</label>
        <input
          type="number"
          name="default_quantity"
          min="1"
          placeholder="e.g., 4"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Unit Name</label>
        <input
          type="text"
          name="unit_name"
          placeholder="e.g., lounge visit"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
        <input
          type="text"
          name="notes"
          placeholder="Optional admin notes"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-6">
        <input
          type="checkbox"
          id="must_be_earned"
          name="must_be_earned"
          value="true"
          className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
        />
        <label htmlFor="must_be_earned" className="text-sm text-zinc-300 cursor-pointer">
          Must be earned (e.g., Free Night Awards)
        </label>
      </div>

      <div className="md:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add Credit"}
        </button>
      </div>
    </form>
  );
}

