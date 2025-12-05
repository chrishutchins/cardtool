"use client";

import { useState } from "react";
import { Enums } from "@/lib/database.types";

interface CurrencyFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name: string;
    code: string;
    currency_type: Enums<"reward_currency_type">;
    base_value_cents: number | null;
    notes: string | null;
  };
  onCancel?: () => void;
}

const currencyTypes: Enums<"reward_currency_type">[] = ["points", "cash", "miles", "other"];

export function CurrencyForm({ action, defaultValues, onCancel }: CurrencyFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [code, setCode] = useState(defaultValues?.code ?? "");

  const generateCode = (value: string) => {
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
  };

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!defaultValues) {
              setCode(generateCode(e.target.value));
            }
          }}
          placeholder="e.g., Chase Ultimate Rewards"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Code</label>
        <input
          type="text"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g., CHASE_UR"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
        <select
          name="currency_type"
          defaultValue={defaultValues?.currency_type ?? "points"}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        >
          {currencyTypes.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">
          Base Value (¢ per unit)
        </label>
        <input
          type="number"
          name="base_value_cents"
          step="0.001"
          min="0"
          defaultValue={defaultValues?.base_value_cents ?? ""}
          placeholder="e.g., 1.5"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
        <input
          type="text"
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Optional notes..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {defaultValues ? "Update" : "Add Currency"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

