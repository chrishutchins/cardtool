import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CardForm } from "../card-form";

export default async function NewCardPage() {
  const supabase = await createClient();

  const [issuersResult, currenciesResult] = await Promise.all([
    supabase.from("issuers").select("*").order("name"),
    supabase.from("reward_currencies").select("*").order("name"),
  ]);

  async function createCard(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const issuer_id = formData.get("issuer_id") as string;
    const primary_currency_id = formData.get("primary_currency_id") as string;
    const secondary_currency_id = (formData.get("secondary_currency_id") as string | null) || null;
    const product_type = formData.get("product_type") as "personal" | "business";
    const annual_fee = parseFloat(formData.get("annual_fee") as string) || 0;
    const default_earn_rate = parseFloat(formData.get("default_earn_rate") as string) || 1.0;
    const default_perks_value = parseFloat(formData.get("default_perks_value") as string) || 0;

    const { data, error } = await supabase
      .from("cards")
      .insert({
        name,
        slug,
        issuer_id,
        primary_currency_id,
        secondary_currency_id: secondary_currency_id || null,
        product_type,
        annual_fee,
        default_earn_rate,
        default_perks_value,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating card:", error);
      return;
    }

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

