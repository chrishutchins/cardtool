"use client";

import { useState, useEffect, useTransition } from "react";
import { Enums } from "@/lib/database.types";

interface CurrencyFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name: string;
    code: string;
    currency_type: Enums<"reward_currency_type">;
    base_value_cents: number | null;
    cash_out_value_cents: number | null;
    notes: string | null;
    program_name: string | null;
    alliance: string | null;
    expiration_policy: string | null;
    is_transferable: boolean | null;
    transfer_increment: number | null;
  };
  onCancel?: () => void;
}

const currencyTypes: { value: Enums<"reward_currency_type">; label: string }[] = [
  { value: "airline_miles", label: "Airline Miles" },
  { value: "hotel_points", label: "Hotel Points" },
  { value: "transferable_points", label: "Transferable Points" },
  { value: "non_transferable_points", label: "Non-Transferable Points" },
  { value: "cash_back", label: "Cash Back" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];

const allianceOptions: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "star_alliance", label: "Star Alliance" },
  { value: "oneworld", label: "Oneworld" },
  { value: "skyteam", label: "SkyTeam" },
];

export function CurrencyForm({ action, defaultValues, onCancel }: CurrencyFormProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [code, setCode] = useState(defaultValues?.code ?? "");
  const [currencyType, setCurrencyType] = useState<Enums<"reward_currency_type">>(defaultValues?.currency_type ?? "transferable_points");
  const [baseValueCents, setBaseValueCents] = useState<string>(defaultValues?.base_value_cents?.toString() ?? "");
  const [cashOutValueCents, setCashOutValueCents] = useState<string>(defaultValues?.cash_out_value_cents?.toString() ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [programName, setProgramName] = useState(defaultValues?.program_name ?? "");
  const [alliance, setAlliance] = useState(defaultValues?.alliance ?? "");
  const [expirationPolicy, setExpirationPolicy] = useState(defaultValues?.expiration_policy ?? "");
  const [isTransferable, setIsTransferable] = useState(defaultValues?.is_transferable ?? false);
  const [transferIncrement, setTransferIncrement] = useState<string>(defaultValues?.transfer_increment?.toString() ?? "1000");

  const resetForm = () => {
    setName("");
    setCode("");
    setCurrencyType("transferable_points");
    setBaseValueCents("");
    setCashOutValueCents("");
    setNotes("");
    setProgramName("");
    setAlliance("");
    setExpirationPolicy("");
    setIsTransferable(false);
    setTransferIncrement("1000");
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
      setName(defaultValues.name);
      setCode(defaultValues.code);
      setCurrencyType(defaultValues.currency_type);
      setBaseValueCents(defaultValues.base_value_cents?.toString() ?? "");
      setCashOutValueCents(defaultValues.cash_out_value_cents?.toString() ?? "");
      setNotes(defaultValues.notes ?? "");
      setProgramName(defaultValues.program_name ?? "");
      setAlliance(defaultValues.alliance ?? "");
      setExpirationPolicy(defaultValues.expiration_policy ?? "");
      setIsTransferable(defaultValues.is_transferable ?? false);
      setTransferIncrement(defaultValues.transfer_increment?.toString() ?? "1000");
    }
  }, [defaultValues]);

  // Cash out value only applies to non-cash currencies
  const showCashOutValue = currencyType !== "cash_back";

  const generateCode = (value: string) => {
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");
  };

  return (
    <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          value={currencyType}
          onChange={(e) => setCurrencyType(e.target.value as Enums<"reward_currency_type">)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        >
          {currencyTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
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
          value={baseValueCents}
          onChange={(e) => setBaseValueCents(e.target.value)}
          placeholder="e.g., 1.5"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-zinc-500">Value when used for travel/transfers</p>
      </div>
      {showCashOutValue && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Cash Out Value (¢ per unit)
          </label>
          <input
            type="number"
            name="cash_out_value_cents"
            step="0.001"
            min="0"
            value={cashOutValueCents}
            onChange={(e) => setCashOutValueCents(e.target.value)}
            placeholder="e.g., 1.0"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">Value when redeemed for cash/statement credit</p>
        </div>
      )}
      <div className={showCashOutValue ? "" : "md:col-span-2 lg:col-span-1"}>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
        <input
          type="text"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      {/* New fields */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Program Name</label>
        <input
          type="text"
          name="program_name"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          placeholder="e.g., Mileage Plan, Bonvoy"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      {currencyType === "airline_miles" && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Alliance</label>
          <select
            name="alliance"
            value={alliance}
            onChange={(e) => setAlliance(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {allianceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Expiration Policy</label>
        <input
          type="text"
          name="expiration_policy"
          value={expirationPolicy}
          onChange={(e) => setExpirationPolicy(e.target.value)}
          placeholder="e.g., Miles expire after 18 months of inactivity"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex items-end">
        <div className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            name="is_transferable"
            id="is_transferable"
            checked={isTransferable}
            onChange={(e) => setIsTransferable(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_transferable" className="text-sm font-medium text-zinc-400">
            Is Transferable
          </label>
        </div>
      </div>
      
      {isTransferable && (
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Transfer Increment</label>
          <input
            type="number"
            name="transfer_increment"
            value={transferIncrement}
            onChange={(e) => setTransferIncrement(e.target.value)}
            placeholder="e.g., 1000"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (defaultValues ? "Updating..." : "Adding...") : (defaultValues ? "Update" : "Add Currency")}
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

