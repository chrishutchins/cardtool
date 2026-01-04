"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Card {
  id: string;
  name: string;
  slug: string;
}

interface CreditsFilterProps {
  cards: Card[];
}

export function CreditsFilter({ cards }: CreditsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCard = searchParams.get("card") ?? "";

  const handleCardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      router.push(`/admin/credits?card=${value}`);
    } else {
      router.push("/admin/credits");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-zinc-400">Filter by card:</label>
      <select
        value={currentCard}
        onChange={handleCardChange}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
      >
        <option value="">All Cards</option>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.name}
          </option>
        ))}
      </select>
    </div>
  );
}

