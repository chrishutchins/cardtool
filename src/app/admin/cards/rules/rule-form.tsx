"use client";

import { useState } from "react";

interface Issuer {
  id: string;
  name: string;
  slug: string;
}

interface RuleFormProps {
  issuers: Issuer[];
  defaultValues?: {
    id?: string;
    issuer_id: string;
    rule_type: string;
    name: string;
    description: string | null;
    card_limit: number;
    card_type: string | null;
    time_window: number | null;
    time_unit: string | null;
    counts_all_issuers: boolean | null;
    charge_type: string | null;
    requires_banking: boolean | null;
    display_order: number | null;
    is_active: boolean | null;
  };
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function RuleForm({
  issuers,
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
}: RuleFormProps) {
  const [ruleType, setRuleType] = useState<"velocity" | "limit">(
    (defaultValues?.rule_type as "velocity" | "limit") ?? "velocity"
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Issuer</label>
          <select
            name="issuer_id"
            defaultValue={defaultValues?.issuer_id ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Select an issuer...</option>
            {issuers.map((issuer) => (
              <option key={issuer.id} value={issuer.id}>
                {issuer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Rule Type</label>
          <select
            name="rule_type"
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as "velocity" | "limit")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="velocity">Velocity (time-based)</option>
            <option value="limit">Limit (total count)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Rule Name</label>
        <input
          type="text"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          placeholder="e.g., 2/90, 5/24, Credit Card Limit"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Explain what this rule means..."
          rows={2}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Card Limit</label>
          <input
            type="number"
            name="card_limit"
            defaultValue={defaultValues?.card_limit ?? 1}
            min="1"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">Maximum number of cards allowed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Card Type</label>
          <select
            name="card_type"
            defaultValue={defaultValues?.card_type ?? "both"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="both">Both Personal & Business</option>
            <option value="personal">Personal Only</option>
            <option value="business">Business Only</option>
          </select>
        </div>
      </div>

      {/* Velocity-specific fields */}
      {ruleType === "velocity" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Time Window</label>
            <input
              type="number"
              name="time_window"
              defaultValue={defaultValues?.time_window ?? 90}
              min="1"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Time Unit</label>
            <select
              name="time_unit"
              defaultValue={defaultValues?.time_unit ?? "days"}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
            </select>
          </div>
        </div>
      )}

      {/* Velocity: counts all issuers */}
      {ruleType === "velocity" && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="counts_all_issuers"
              value="true"
              defaultChecked={defaultValues?.counts_all_issuers ?? false}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-300">
              Counts cards from all issuers (e.g., Chase 5/24)
            </span>
          </label>
        </div>
      )}

      {/* Limit-specific: charge type */}
      {ruleType === "limit" && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Card Charge Type
          </label>
          <select
            name="charge_type"
            defaultValue={defaultValues?.charge_type ?? "all"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Cards</option>
            <option value="credit">Credit Cards Only</option>
            <option value="charge">Charge Cards Only</option>
          </select>
        </div>
      )}

      {/* Banking relationship */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="requires_banking"
            value="true"
            defaultChecked={defaultValues?.requires_banking ?? false}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-300">
            Requires banking relationship (deposit account with issuer)
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Display Order</label>
          <input
            type="number"
            name="display_order"
            defaultValue={defaultValues?.display_order ?? 0}
            min="0"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {defaultValues && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
            <select
              name="is_active"
              defaultValue={defaultValues?.is_active ? "true" : "false"}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : defaultValues ? "Update Rule" : "Create Rule"}
        </button>
      </div>
    </form>
  );
}

