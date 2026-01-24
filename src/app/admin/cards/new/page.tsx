import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CardForm } from "../card-form";
import { invalidateCardCaches } from "@/lib/cache-invalidation";

export default async function NewCardPage() {
  const supabase = createClient();

  const [issuersResult, currenciesResult] = await Promise.all([
    supabase.from("issuers").select("*").order("name"),
    supabase.from("reward_currencies").select("*").order("name"),
  ]);

  async function createCard(formData: FormData) {
    "use server";
    const supabase = createClient();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const issuer_id = formData.get("issuer_id") as string;
    const primary_currency_id = formData.get("primary_currency_id") as string;
    const secondary_currency_id = (formData.get("secondary_currency_id") as string | null) || null;
    const product_type = formData.get("product_type") as "personal" | "business";
    const card_charge_type = formData.get("card_charge_type") as "credit" | "charge" | "debit";
    const annual_fee = parseFloat(formData.get("annual_fee") as string) || 0;
    const default_earn_rate = parseFloat(formData.get("default_earn_rate") as string) || 1.0;
    const default_perks_value = parseFloat(formData.get("default_perks_value") as string) || 0;
    const networkValue = formData.get("network") as string;
    const network = networkValue ? (networkValue as "visa" | "mastercard" | "amex" | "discover") : null;
    const searchAliasesRaw = formData.get("search_aliases") as string;
    const search_aliases = searchAliasesRaw 
      ? searchAliasesRaw.split(",").map(s => s.trim().toLowerCase()).filter(s => s.length > 0)
      : null;

    const { data, error } = await supabase
      .from("cards")
      .insert({
        name,
        slug,
        issuer_id,
        primary_currency_id,
        secondary_currency_id: secondary_currency_id || null,
        product_type,
        card_charge_type,
        annual_fee,
        default_earn_rate,
        default_perks_value,
        network,
        search_aliases,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating card:", error);
      return;
    }

    invalidateCardCaches();
    revalidatePath("/admin/cards");
    redirect(`/admin/cards/${data.id}`);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Add New Card</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <CardForm
          action={createCard}
          issuers={issuersResult.data ?? []}
          currencies={currenciesResult.data ?? []}
        />
      </div>
    </div>
  );
}

