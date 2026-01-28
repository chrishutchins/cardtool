"use client";

import { useState, useTransition } from "react";
import { X, Plus, Shuffle } from "lucide-react";
import { type PlaidTier } from "./invite-codes-table";

interface PlaidTierOption {
  value: PlaidTier;
  label: string;
  description: string;
}

interface AddInviteCodeModalProps {
  onSubmit: (formData: FormData) => Promise<void>;
  plaidTiers: PlaidTierOption[];
}

// Generate a random invite code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing characters
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function AddInviteCodeModal({ onSubmit, plaidTiers }: AddInviteCodeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [selectedTier, setSelectedTier] = useState<PlaidTier>("disabled");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await onSubmit(formData);
      form.reset();
      setCode("");
      setSelectedTier("disabled");
      setIsOpen(false);
    });
  };

  const handleGenerateCode = () => {
    setCode(generateCode());
  };

  const tierDescriptions: Record<PlaidTier, string> = {
    disabled: "User will not have access to Plaid account linking",
    txns: "User can link accounts and view transactions for credit matching",
    txns_liab: "User can link accounts, view transactions, and see liability details",
    full: "Full Plaid access including on-demand balance refresh",
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Invite Code
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Create Invite Code</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Invite Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="code"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g., PLAID2026"
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white font-mono uppercase tracking-wider placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                      title="Generate random code"
                    >
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Description <span className="text-zinc-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="description"
                    placeholder="e.g., Beta testers Q1 2026"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Plaid Tier */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Plaid Access Tier
                  </label>
                  <select
                    name="plaid_tier"
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as PlaidTier)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    {plaidTiers.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-zinc-500">
                    {tierDescriptions[selectedTier]}
                  </p>
                </div>

                {/* Uses Limit */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Use Limit <span className="text-zinc-500">(leave empty for unlimited)</span>
                  </label>
                  <input
                    type="number"
                    name="uses_limit"
                    min={1}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Expiration <span className="text-zinc-500">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="expires_at"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !code.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Creating..." : "Create Code"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
