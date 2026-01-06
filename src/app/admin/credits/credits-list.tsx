"use client";

import { useState } from "react";
import Link from "next/link";
import { DeleteCreditButton } from "./delete-credit-button";
import { Layers, CreditCard } from "lucide-react";

type Credit = {
  id: string;
  name: string;
  brand_name: string | null;
  canonical_name: string | null;
  credit_count: number;
  reset_cycle: string;
  renewal_period_months: number | null;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  is_active: boolean;
  notes: string | null;
  card: {
    id: string;
    name: string;
    slug: string;
    issuer: {
      id: string;
      name: string;
    } | null;
  } | null;
};

interface CreditsListProps {
  credits: Credit[];
  onToggleActive: (creditId: string, isActive: boolean) => Promise<void>;
  onDelete: (creditId: string) => Promise<void>;
}

export function CreditsList({ credits, onToggleActive, onDelete }: CreditsListProps) {
  const [groupBy, setGroupBy] = useState<"card" | "name">("card");

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

  // Group credits
  const groupedCredits = new Map<string, Credit[]>();

  if (groupBy === "card") {
    // Group by card, sorted by issuer then card name
    const sortedCredits = [...credits].sort((a, b) => {
      const issuerA = a.card?.issuer?.name?.toLowerCase() ?? "";
      const issuerB = b.card?.issuer?.name?.toLowerCase() ?? "";
      if (issuerA !== issuerB) return issuerA.localeCompare(issuerB);
      const cardA = a.card?.name?.toLowerCase() ?? "";
      const cardB = b.card?.name?.toLowerCase() ?? "";
      if (cardA !== cardB) return cardA.localeCompare(cardB);
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    for (const credit of sortedCredits) {
      const key = credit.card?.name ?? "Unknown Card";
      if (!groupedCredits.has(key)) {
        groupedCredits.set(key, []);
      }
      groupedCredits.get(key)!.push(credit);
    }
  } else {
    // Group by canonical name (or name if no canonical)
    const sortedCredits = [...credits].sort((a, b) => {
      const nameA = (a.canonical_name || a.name).toLowerCase();
      const nameB = (b.canonical_name || b.name).toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      const issuerA = a.card?.issuer?.name?.toLowerCase() ?? "";
      const issuerB = b.card?.issuer?.name?.toLowerCase() ?? "";
      if (issuerA !== issuerB) return issuerA.localeCompare(issuerB);
      const cardA = a.card?.name?.toLowerCase() ?? "";
      const cardB = b.card?.name?.toLowerCase() ?? "";
      return cardA.localeCompare(cardB);
    });

    for (const credit of sortedCredits) {
      const key = credit.canonical_name || credit.name;
      if (!groupedCredits.has(key)) {
        groupedCredits.set(key, []);
      }
      groupedCredits.get(key)!.push(credit);
    }
  }

  return (
    <div className="space-y-6">
      {/* Grouping Toggle */}
      <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setGroupBy("card")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            groupBy === "card"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Group by Card
        </button>
        <button
          onClick={() => setGroupBy("name")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            groupBy === "name"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          Group by Credit Name
        </button>
      </div>

      {/* Credits List */}
      {Array.from(groupedCredits.entries()).map(([groupName, groupCredits]) => (
        <div
          key={groupName}
          className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
        >
          <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
            <h3 className="text-lg font-semibold text-white">{groupName}</h3>
            {groupBy === "card" && groupCredits[0]?.card?.issuer && (
              <p className="text-sm text-zinc-500">{groupCredits[0].card.issuer.name}</p>
            )}
            <p className="text-sm text-zinc-400">
              {groupCredits.length} credit{groupCredits.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-zinc-800">
            {groupCredits.map((credit) => (
              <div
                key={credit.id}
                className={`px-6 py-4 flex items-center justify-between ${
                  !credit.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-white">{credit.name}</span>
                    {credit.canonical_name && credit.canonical_name !== credit.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400">
                        {credit.canonical_name}
                      </span>
                    )}
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
                    {!credit.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {groupBy === "name" && (
                      <>
                        <span className="text-zinc-500">{credit.card?.issuer?.name}</span>
                        <span className="mx-1">•</span>
                        <span>{credit.card?.name}</span>
                        <span className="mx-1">•</span>
                      </>
                    )}
                    Value: {formatValue(credit)}
                    {credit.notes && (
                      <span className="ml-3 text-zinc-500">• {credit.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <DeleteCreditButton creditId={credit.id} onDelete={onDelete} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {credits.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400 mb-2">No credits defined yet.</p>
          <p className="text-zinc-500 text-sm">
            Add credits manually above or{" "}
            <Link
              href="/admin/credits/import"
              className="text-emerald-400 hover:text-emerald-300"
            >
              import from CSV
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

