"use client";

import { useState, useEffect, useTransition } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  is_transferable?: boolean | null;
}

interface TransferPartnerFormProps {
  action: (formData: FormData) => Promise<void>;
  currencies: Currency[];
  defaultValues?: {
    source_currency_id: string;
    destination_currency_id: string;
    source_units: number;
    destination_units: number;
    transfer_timing: string | null;
    notes: string | null;
    is_active: boolean;
  };
  onCancel?: () => void;
}

const timingOptions = [
  { value: "", label: "Not specified" },
  { value: "Instant", label: "Instant" },
  { value: "24hr", label: "24 hours" },
  { value: "48hr", label: "48 hours" },
  { value: "1-2 Days", label: "1-2 Days" },
  { value: "3-7 Days", label: "3-7 Days" },
];

export function TransferPartnerForm({ action, currencies, defaultValues, onCancel }: TransferPartnerFormProps) {
  const [isPending, startTransition] = useTransition();
  const [sourceCurrencyId, setSourceCurrencyId] = useState(defaultValues?.source_currency_id ?? "");
  const [destinationCurrencyId, setDestinationCurrencyId] = useState(defaultValues?.destination_currency_id ?? "");
  const [sourceUnits, setSourceUnits] = useState(defaultValues?.source_units?.toString() ?? "1");
  const [destinationUnits, setDestinationUnits] = useState(defaultValues?.destination_units?.toString() ?? "1");
  const [transferTiming, setTransferTiming] = useState(defaultValues?.transfer_timing ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [isActive, setIsActive] = useState(defaultValues?.is_active ?? true);

  // Filter currencies: source should be transferable currencies, destination can be any
  const sourceCurrencies = currencies.filter(c => c.is_transferable);
  const destinationCurrencies = currencies;

  const resetForm = () => {
    setSourceCurrencyId("");
    setDestinationCurrencyId("");
    setSourceUnits("1");
    setDestinationUnits("1");
    setTransferTiming("");
    setNotes("");
    setIsActive(true);
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      if (!defaultValues) {
        resetForm();
      }
      if (defaultValues && onCancel) {
        onCancel();
      }
    });
  };

  useEffect(() => {
    if (defaultValues) {
      setSourceCurrencyId(defaultValues.source_currency_id);
      setDestinationCurrencyId(defaultValues.destination_currency_id);
      setSourceUnits(defaultValues.source_units?.toString() ?? "1");
      setDestinationUnits(defaultValues.destination_units?.toString() ?? "1");
      setTransferTiming(defaultValues.transfer_timing ?? "");
      setNotes(defaultValues.notes ?? "");
      setIsActive(defaultValues.is_active);
    }
  }, [defaultValues]);

  // Display the ratio in X:Y format
  const ratioDisplay = sourceUnits && destinationUnits
    ? `${sourceUnits}:${destinationUnits}`
    : "";

  return (
    <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Source Currency</label>
        <select
          name="source_currency_id"
          value={sourceCurrencyId}
          onChange={(e) => setSourceCurrencyId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        >
          <option value="">Select source...</option>
          {sourceCurrencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.name} ({currency.code})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">Transferable currencies only</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Destination Currency</label>
        <select
          name="destination_currency_id"
          value={destinationCurrencyId}
          onChange={(e) => setDestinationCurrencyId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        >
          <option value="">Select destination...</option>
          {destinationCurrencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.name} ({currency.code})
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Source Units</label>
          <input
            type="number"
            name="source_units"
            value={sourceUnits}
            onChange={(e) => setSourceUnits(e.target.value)}
            min="1"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <span className="text-zinc-500 py-2">:</span>
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Dest Units</label>
          <input
            type="number"
            name="destination_units"
            value={destinationUnits}
            onChange={(e) => setDestinationUnits(e.target.value)}
            min="1"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      {ratioDisplay && (
        <div className="flex items-center">
          <span className="text-sm text-zinc-400">Ratio: <span className="text-white font-mono">{ratioDisplay}</span></span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Transfer Timing</label>
        <select
          name="transfer_timing"
          value={transferTiming}
          onChange={(e) => setTransferTiming(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {timingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
        <input
          type="text"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., 0.6% fee, $99 cap"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {defaultValues && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-zinc-400">
            Active
          </label>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (defaultValues ? "Updating..." : "Adding...") : (defaultValues ? "Update" : "Add Transfer Partner")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
