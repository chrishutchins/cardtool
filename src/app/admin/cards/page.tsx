import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CardsTable } from "./cards-table";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Cards</h1>
        <Link
          href="/admin/cards/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Card
        </Link>
      </div>

      <CardsTable cards={cards ?? []} onDelete={deleteCard} />
    </div>
  );
}
