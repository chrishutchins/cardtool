"use client";

import { useState } from "react";
import { Tables } from "@/lib/database.types";
import { CurrencyForm } from "./currency-form";

interface CurrencyRowProps {
  currency: Tables<"reward_currencies">;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

const typeColors: Record<string, string> = {
  points: "bg-purple-500/20 text-purple-300",
  cash: "bg-green-500/20 text-green-300",
  miles: "bg-blue-500/20 text-blue-300",
  other: "bg-zinc-500/20 text-zinc-300",
};

export function CurrencyRow({ currency, onDelete, onUpdate }: CurrencyRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isEditing) {
    return (
      <tr>
        <td colSpan={5} className="px-6 py-4">
          <CurrencyForm
            action={async (formData) => {
              await onUpdate(currency.id, formData);
              setIsEditing(false);
            }}
            defaultValues={{
              name: currency.name,
              code: currency.code,
              currency_type: currency.currency_type,
              base_value_cents: currency.base_value_cents,
              notes: currency.notes,
            }}
            onCancel={() => setIsEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-800/50 transition-colors">
      <td className="px-6 py-4 text-white font-medium">{currency.name}</td>
      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">{currency.code}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${typeColors[currency.currency_type]}`}>
          {currency.currency_type}
        </span>
      </td>
      <td className="px-6 py-4 text-zinc-400">
        {currency.base_value_cents ? `${currency.base_value_cents}¢` : "—"}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
          {isDeleting ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Delete?</span>
              <button
                onClick={async () => {
                  await onDelete(currency.id);
                }}
                className="rounded px-3 py-1 text-sm text-red-400 hover:text-white hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

