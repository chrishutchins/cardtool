"use client";

import { useState } from "react";
import { Tables } from "@/lib/database.types";
import { CurrencyForm } from "./currency-form";

interface CurrencyRowProps {
  currency: Tables<"reward_currencies">;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

const typeConfig: Record<string, { label: string; className: string }> = {
  airline_miles: { 
    label: "✈️ Airline Miles", 
    className: "bg-sky-500/20 text-sky-300 border border-sky-500/30" 
  },
  hotel_points: { 
    label: "🏨 Hotel Points", 
    className: "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
  },
  transferable_points: { 
    label: "🔄 Transferable", 
    className: "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
  },
  non_transferable_points: { 
    label: "📍 Non-Transferable", 
    className: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
  },
  cash_back: { 
    label: "💵 Cash Back", 
    className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
  },
  crypto: { 
    label: "₿ Crypto", 
    className: "bg-orange-500/20 text-orange-300 border border-orange-500/30" 
  },
  other: { 
    label: "Other", 
    className: "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30" 
  },
  // Legacy types
  points: { 
    label: "Points", 
    className: "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
  },
  cash: { 
    label: "Cash", 
    className: "bg-green-500/20 text-green-300 border border-green-500/30" 
  },
  miles: { 
    label: "Miles", 
    className: "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
  },
};

export function CurrencyRow({ currency, onDelete, onUpdate }: CurrencyRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isEditing) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-4">
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
              cash_out_value_cents: currency.cash_out_value_cents,
              notes: currency.notes,
              program_name: currency.program_name,
              alliance: currency.alliance,
              expiration_policy: currency.expiration_policy,
              is_transferable: currency.is_transferable,
              transfer_increment: currency.transfer_increment,
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
        {(() => {
          const config = typeConfig[currency.currency_type] ?? typeConfig.other;
          return (
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
              {config.label}
            </span>
          );
        })()}
      </td>
      <td className="px-6 py-4 text-zinc-400">
        {currency.base_value_cents ? `${currency.base_value_cents}¢` : "—"}
      </td>
      <td className="px-6 py-4 text-zinc-400">
        {currency.currency_type !== "cash_back"
          ? (currency.cash_out_value_cents ? `${currency.cash_out_value_cents}¢` : "—")
          : <span className="text-zinc-600">N/A</span>
        }
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

