"use client";

import { useState, useEffect, useTransition } from "react";
import { Tables } from "@/lib/database.types";

interface CardFormProps {
  action: (formData: FormData) => Promise<void>;
  issuers: Tables<"issuers">[];
  currencies: Tables<"reward_currencies">[];
  userPrimaryCurrencyIds?: string[];
  defaultValues?: {
    name: string;
    slug: string;
    issuer_id: string;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    product_type: "personal" | "business";
    card_charge_type: "credit" | "charge" | null;
    annual_fee: number;
    default_earn_rate: number;
    default_perks_value: number | null;
    no_foreign_transaction_fees: boolean | null;
  };
}

export function CardForm({ action, issuers, currencies, userPrimaryCurrencyIds, defaultValues }: CardFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [issuerId, setIssuerId] = useState(defaultValues?.issuer_id ?? "");
  const [primaryCurrencyId, setPrimaryCurrencyId] = useState(defaultValues?.primary_currency_id ?? "");
  const [secondaryCurrencyId, setSecondaryCurrencyId] = useState(defaultValues?.secondary_currency_id ?? "");
  const [productType, setProductType] = useState<"personal" | "business">(defaultValues?.product_type ?? "personal");
  const [cardChargeType, setCardChargeType] = useState<"credit" | "charge">(defaultValues?.card_charge_type ?? "credit");
  const [annualFee, setAnnualFee] = useState(defaultValues?.annual_fee ?? 0);
  const [defaultEarnRate, setDefaultEarnRate] = useState(defaultValues?.default_earn_rate ?? 1.0);
  const [defaultPerksValue, setDefaultPerksValue] = useState(defaultValues?.default_perks_value ?? 0);
  const [noForeignTransactionFees, setNoForeignTransactionFees] = useState(defaultValues?.no_foreign_transaction_fees ?? false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Sync state when defaultValues changes (e.g., after form submission and revalidation)
  useEffect(() => {
    if (defaultValues) {
      setName(defaultValues.name ?? "");
      setSlug(defaultValues.slug ?? "");
      setIssuerId(defaultValues.issuer_id ?? "");
      setPrimaryCurrencyId(defaultValues.primary_currency_id ?? "");
      setSecondaryCurrencyId(defaultValues.secondary_currency_id ?? "");
      setProductType(defaultValues.product_type ?? "personal");
      setCardChargeType(defaultValues.card_charge_type ?? "credit");
      setAnnualFee(defaultValues.annual_fee ?? 0);
      setDefaultEarnRate(defaultValues.default_earn_rate ?? 1.0);
      setDefaultPerksValue(defaultValues.default_perks_value ?? 0);
      setNoForeignTransactionFees(defaultValues.no_foreign_transaction_fees ?? false);
    }
  }, [defaultValues]);

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
            value={issuerId}
            onChange={(e) => setIssuerId(e.target.value)}
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
            value={productType}
            onChange={(e) => setProductType(e.target.value as "personal" | "business")}
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
          <label className="block text-sm font-medium text-zinc-400 mb-1">Card Charge Type</label>
          <select
            name="card_charge_type"
            value={cardChargeType}
            onChange={(e) => setCardChargeType(e.target.value as "credit" | "charge")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="credit">Credit Card</option>
            <option value="charge">Charge Card</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">Charge cards have no preset spending limit</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Primary Currency</label>
          <select
            name="primary_currency_id"
            value={primaryCurrencyId}
            onChange={(e) => setPrimaryCurrencyId(e.target.value)}
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
            {secondaryCurrencyId && userPrimaryCurrencyIds?.includes(secondaryCurrencyId) && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 font-medium">
                Enabled
              </span>
            )}
          </label>
          <select
            name="secondary_currency_id"
            value={secondaryCurrencyId}
            onChange={(e) => setSecondaryCurrencyId(e.target.value)}
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
            Automatically enabled when you hold a card with this currency as primary
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Annual Fee ($)</label>
          <input
            type="number"
            name="annual_fee"
            value={annualFee}
            onChange={(e) => setAnnualFee(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            placeholder="e.g., 95"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Default Perks Value ($)</label>
          <input
            type="number"
            name="default_perks_value"
            value={defaultPerksValue}
            onChange={(e) => setDefaultPerksValue(parseFloat(e.target.value) || 0)}
            min="0"
            step="1"
            placeholder="e.g., 300"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Initial value when added to wallet</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Default Earn Rate</label>
          <input
            type="number"
            name="default_earn_rate"
            step="0.1"
            min="0"
            value={defaultEarnRate}
            onChange={(e) => setDefaultEarnRate(parseFloat(e.target.value) || 1.0)}
            placeholder="e.g., 1.5"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Rate for &quot;everything else&quot;</p>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="no_foreign_transaction_fees"
            checked={noForeignTransactionFees}
            onChange={(e) => setNoForeignTransactionFees(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
          />
          No Foreign Transaction Fees
        </label>
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

