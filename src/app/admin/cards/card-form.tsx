"use client";

import { useState, useEffect, useTransition } from "react";
import { Tables } from "@/lib/database.types";

interface CardFormProps {
  action: (formData: FormData) => Promise<void>;
  issuers: Tables<"issuers">[];
  currencies: Tables<"reward_currencies">[];
  defaultValues?: {
    name: string;
    slug: string;
    issuer_id: string;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    product_type: "personal" | "business";
    annual_fee_cents: number;
    default_earn_rate: number;
  };
}

export function CardForm({ action, issuers, currencies, defaultValues }: CardFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Sync state when defaultValues changes (e.g., after form submission and revalidation)
  useEffect(() => {
    if (defaultValues) {
      setName(defaultValues.name);
      setSlug(defaultValues.slug);
    }
  }, [defaultValues?.name, defaultValues?.slug]);

  const handleSubmit = async (formData: FormData) => {
    setSaved(false);
    startTransition(async () => {
      await action(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Card Name</label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!defaultValues) {
                setSlug(generateSlug(e.target.value));
              }
            }}
            placeholder="e.g., Chase Sapphire Preferred"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Slug</label>
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g., chase-sapphire-preferred"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Issuer</label>
          <select
            name="issuer_id"
            defaultValue={defaultValues?.issuer_id ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-zinc-400 mb-1">Product Type</label>
          <select
            name="product_type"
            defaultValue={defaultValues?.product_type ?? "personal"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Primary Currency</label>
          <select
            name="primary_currency_id"
            defaultValue={defaultValues?.primary_currency_id ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Select a currency...</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.name} ({currency.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Secondary Currency <span className="text-zinc-500">(optional)</span>
          </label>
          <select
            name="secondary_currency_id"
            defaultValue={defaultValues?.secondary_currency_id ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">None</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.name} ({currency.code})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Enabled when user holds an enabler card
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Annual Fee (cents)</label>
          <input
            type="number"
            name="annual_fee_cents"
            defaultValue={defaultValues?.annual_fee_cents ?? 0}
            min="0"
            placeholder="e.g., 9500 for $95"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Enter in cents (9500 = $95)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Default Earn Rate</label>
          <input
            type="number"
            name="default_earn_rate"
            step="0.1"
            min="0"
            defaultValue={defaultValues?.default_earn_rate ?? 1.0}
            placeholder="e.g., 1.5"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Rate for &quot;everything else&quot;</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving..." : defaultValues ? "Update Card" : "Create Card"}
        </button>
        {saved && (
          <span className="text-sm text-green-400">Saved!</span>
        )}
      </div>
    </form>
  );
}

