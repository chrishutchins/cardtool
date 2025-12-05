import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function CardsPage() {
  const supabase = await createClient();
  
  const { data: cards, error } = await supabase
    .from("card_with_currency")
    .select("*")
    .order("issuer_name")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading cards: {error.message}</div>;
  }

  async function deleteCard(id: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("cards").delete().eq("id", id);
    revalidatePath("/admin/cards");
  }

  const formatFee = (cents: number | null) => {
    if (!cents) return "Free";
    return `$${(cents / 100).toFixed(0)}`;
  };

  const productTypeColors: Record<string, string> = {
    personal: "bg-blue-500/20 text-blue-300",
    business: "bg-amber-500/20 text-amber-300",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Cards</h1>
        <Link
          href="/admin/cards/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Card
        </Link>
      </div>

      {/* Cards Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Card
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Issuer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Currency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Annual Fee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Default Rate
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {cards?.map((card) => (
              <tr key={card.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{card.name}</span>
                    <span className="text-zinc-500 text-xs font-mono">{card.slug}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-400">{card.issuer_name}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-300 text-sm">{card.primary_currency_name}</span>
                    {card.secondary_currency_name && (
                      <span className="text-zinc-500 text-xs">
                        → {card.secondary_currency_name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${productTypeColors[card.product_type ?? "personal"]}`}>
                    {card.product_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {formatFee(card.annual_fee_cents)}
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {card.default_earn_rate}x
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/cards/${card.id}`}
                      className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <form action={async () => {
                      "use server";
                      const supabase = await createClient();
                      if (card.id) {
                        await supabase.from("cards").delete().eq("id", card.id);
                        revalidatePath("/admin/cards");
                      }
                    }}>
                      <button
                        type="submit"
                        className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cards?.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No cards yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}

