"use client";

import { useState, useTransition } from "react";

const NETWORKS = [
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "amex", label: "Amex" },
  { id: "discover", label: "Discover" },
] as const;

interface WholesaleClubNetworksProps {
  selectedNetworks: string[] | null;
  onUpdateNetworks: (networks: string[] | null) => Promise<void>;
}

export function WholesaleClubNetworks({ selectedNetworks, onUpdateNetworks }: WholesaleClubNetworksProps) {
  // If null, all networks are accepted
  const [networks, setNetworks] = useState<Set<string>>(
    selectedNetworks ? new Set(selectedNetworks) : new Set(NETWORKS.map(n => n.id))
  );
  const [isPending, startTransition] = useTransition();

  const handleToggle = (networkId: string) => {
    const newNetworks = new Set(networks);
    if (newNetworks.has(networkId)) {
      newNetworks.delete(networkId);
    } else {
      newNetworks.add(networkId);
    }
    setNetworks(newNetworks);
    
    startTransition(async () => {
      // If all networks are selected, save null (no restriction)
      const networkArray = Array.from(newNetworks);
      if (networkArray.length === NETWORKS.length) {
        await onUpdateNetworks(null);
      } else {
        await onUpdateNetworks(networkArray.length > 0 ? networkArray : null);
      }
    });
  };

  const allSelected = networks.size === NETWORKS.length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Select which card networks are accepted at wholesale clubs (Costco, Sam&apos;s Club, BJ&apos;s).
        This affects recommendations for the &quot;Wholesale Clubs&quot; spending category.
      </p>
      <p className="text-xs text-zinc-500">
        Tip: Costco only accepts Visa in-store (Visa & Mastercard online). Sam&apos;s Club accepts all networks.
      </p>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {NETWORKS.map((network) => {
          const isSelected = networks.has(network.id);
          return (
            <button
              key={network.id}
              type="button"
              onClick={() => handleToggle(network.id)}
              disabled={isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
              } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {network.label}
            </button>
          );
        })}
      </div>

      {!allSelected && (
        <p className="text-xs text-amber-400 mt-2">
          Cards using excluded networks will not be recommended for wholesale club purchases.
        </p>
      )}
    </div>
  );
}
