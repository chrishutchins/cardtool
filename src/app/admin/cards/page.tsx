import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CardsTable } from "./cards-table";
import { invalidateCardCaches } from "@/lib/cache-invalidation";

export default async function CardsPage() {
  const supabase = createClient();
  
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
    const supabase = createClient();
    await supabase.from("cards").delete().eq("id", id);
    invalidateCardCaches();
    revalidatePath("/admin/cards");
  }

  async function updatePerksValue(id: string, value: number | null) {
    "use server";
    const supabase = createClient();
    await supabase
      .from("cards")
      .update({ default_perks_value: value })
      .eq("id", id);
    invalidateCardCaches();
    revalidatePath("/admin/cards");
  }

  async function toggleExcludeRecommendations(id: string, exclude: boolean) {
    "use server";
    const supabase = createClient();
    await supabase
      .from("cards")
      .update({ exclude_from_recommendations: exclude })
      .eq("id", id);
    invalidateCardCaches();
    revalidatePath("/admin/cards");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Cards</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/cards/import-bonuses"
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
          >
            Import Bonuses
          </Link>
          <Link
            href="/admin/cards/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add Card
          </Link>
        </div>
      </div>

      <CardsTable 
        cards={cards ?? []} 
        onDelete={deleteCard}
        onUpdatePerksValue={updatePerksValue}
        onToggleExcludeRecommendations={toggleExcludeRecommendations}
      />
    </div>
  );
}
