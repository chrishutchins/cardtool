"use client";

import { useTransition } from "react";

interface Currency {
  code: string;
  name: string;
}

interface SiteConfigFormProps {
  action: (formData: FormData) => Promise<void>;
  currencies: Currency[];
  defaultValues?: {
    name: string;
    currency_code: string;
    domain: string;
    balance_page_url: string | null;
    selector: string;
    parse_regex: string | null;
    is_active?: boolean | null;
    format?: string | null;
  };
  onCancel?: () => void;
}

export function SiteConfigForm({ action, currencies, defaultValues, onCancel }: SiteConfigFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(formData);
      if (!defaultValues) {
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Name</label>
          <input
            type="text"
            name="name"
            defaultValue={defaultValues?.name ?? ""}
            placeholder="e.g., United MileagePlus"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Currency</label>
          <select
            name="currency_code"
            defaultValue={defaultValues?.currency_code ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          >
            <option value="">Select currency...</option>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Domain</label>
          <input
            type="text"
            name="domain"
            defaultValue={defaultValues?.domain ?? ""}
            placeholder="e.g., united.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
            required
          />
          <p className="text-xs text-zinc-500 mt-1">Base domain only, no www or paths</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Balance Page URL</label>
          <input
            type="url"
            name="balance_page_url"
            defaultValue={defaultValues?.balance_page_url ?? ""}
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
          />
          <p className="text-xs text-zinc-500 mt-1">Optional: Link shown when balance not found</p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-zinc-400 mb-1">CSS Selector</label>
          <input
            type="text"
            name="selector"
            defaultValue={defaultValues?.selector ?? ""}
            placeholder="e.g., .miles-balance, [data-testid='points']"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
            required
          />
          <p className="text-xs text-zinc-500 mt-1">CSS selector to find the balance element. Comma-separated for multiple.</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Parse Regex</label>
          <input
            type="text"
            name="parse_regex"
            defaultValue={defaultValues?.parse_regex ?? "[\\d,]+"}
            placeholder="[\d,]+"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
          />
          <p className="text-xs text-zinc-500 mt-1">Regex to extract number from text</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Format</label>
          <select
            name="format"
            defaultValue={defaultValues?.format ?? "points"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="points">Points/Miles (strips decimals)</option>
            <option value="dollars">Dollars (keeps decimals, rounds)</option>
          </select>
          <p className="text-xs text-zinc-500 mt-1">How to parse the balance value</p>
        </div>

        {defaultValues && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              defaultChecked={defaultValues.is_active ?? true}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="is_active" className="text-sm text-zinc-400">Active</label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : defaultValues ? "Update" : "Add Config"}
        </button>
      </div>
    </form>
  );
}
