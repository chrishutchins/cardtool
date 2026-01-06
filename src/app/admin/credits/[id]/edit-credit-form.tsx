"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface Card {
  id: string;
  name: string;
  slug: string;
}

interface InventoryType {
  id: string;
  name: string;
  slug: string;
  tracking_type: "quantity" | "dollar_value" | "single_use";
}

interface Credit {
  id: string;
  card_id: string;
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
  inventory_type_id: string | null;
}

interface EditCreditFormProps {
  credit: Credit;
  cards: Card[];
  inventoryTypes: InventoryType[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export function EditCreditForm({ credit, cards, inventoryTypes, onSubmit }: EditCreditFormProps) {
  const [resetCycle, setResetCycle] = useState(credit.reset_cycle);
  const [mustBeEarned, setMustBeEarned] = useState(credit.must_be_earned);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onSubmit(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="credit_id" value={credit.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Card</label>
          <select
            name="card_id"
            required
            defaultValue={credit.card_id}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
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
            defaultValue={credit.name}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Brand (for grouping)</label>
          <input
            type="text"
            name="brand_name"
            defaultValue={credit.brand_name ?? ""}
            placeholder="e.g., Uber, Clear, Delta"
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
            defaultValue={credit.credit_count || 1}
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
              defaultValue={credit.renewal_period_months ?? ""}
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
            defaultValue={credit.default_value_cents ? (credit.default_value_cents / 100).toFixed(2) : ""}
            placeholder="Leave blank for quantity-based credits"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Quantity</label>
          <input
            type="number"
            name="default_quantity"
            min="1"
            defaultValue={credit.default_quantity ?? ""}
            placeholder="e.g., 4"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Unit Name</label>
          <input
            type="text"
            name="unit_name"
            defaultValue={credit.unit_name ?? ""}
            placeholder="e.g., lounge visit, wifi pass"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={credit.notes ?? ""}
            placeholder="Optional admin notes"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={credit.is_active}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="must_be_earned"
              checked={mustBeEarned}
              onChange={(e) => setMustBeEarned(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">Must be earned (e.g., Free Night Awards)</span>
          </label>
        </div>

        {mustBeEarned && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Inventory Type
              <span className="text-zinc-500 font-normal ml-1">(when marked as earned)</span>
            </label>
            <select
              name="inventory_type_id"
              defaultValue={credit.inventory_type_id ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">No inventory item (e.g., status perks)</option>
              {inventoryTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.tracking_type.replace("_", " ")})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              When this credit is marked as earned, prompt user to add it to their inventory as this type
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
        <Link
          href="/admin/credits"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

