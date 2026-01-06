import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { EditCreditForm } from "./edit-credit-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCreditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [creditResult, cardsResult] = await Promise.all([
    supabase
      .from("card_credits")
      .select(`
        id,
        card_id,
        name,
        brand_name,
        canonical_name,
        credit_count,
        reset_cycle,
        renewal_period_months,
        default_value_cents,
        default_quantity,
        unit_name,
        is_active,
        notes,
        must_be_earned
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("cards")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!creditResult.data) {
    notFound();
  }

  const credit = creditResult.data;
  const cards = cardsResult.data ?? [];

  async function updateCredit(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const cardId = formData.get("card_id") as string;
    const name = formData.get("name") as string;
    const brandNameRaw = formData.get("brand_name") as string;
    const brandName = brandNameRaw?.trim() || null;
    const canonicalNameRaw = formData.get("canonical_name") as string;
    const canonicalName = canonicalNameRaw?.trim() || null;
    const creditCountStr = formData.get("credit_count") as string;
    const creditCount = creditCountStr ? parseInt(creditCountStr) : 1;
    const resetCycle = formData.get("reset_cycle") as string;
    const renewalPeriodStr = formData.get("renewal_period_months") as string;
    const defaultValueStr = formData.get("default_value") as string;
    const defaultQuantityStr = formData.get("default_quantity") as string;
    const unitNameRaw = formData.get("unit_name") as string;
    const unitName = unitNameRaw?.trim() || null;
    const notesRaw = formData.get("notes") as string;
    const notes = notesRaw?.trim() || null;
    const isActive = formData.get("is_active") === "on";
    const mustBeEarned = formData.get("must_be_earned") === "on";

    const defaultValueCents = defaultValueStr ? Math.round(parseFloat(defaultValueStr) * 100) : null;
    const defaultQuantity = defaultQuantityStr ? parseInt(defaultQuantityStr) : null;
    const renewalPeriodMonths = renewalPeriodStr ? parseInt(renewalPeriodStr) : null;

    const creditId = formData.get("credit_id") as string;

    await supabase.from("card_credits").update({
      card_id: cardId,
      name,
      brand_name: brandName,
      canonical_name: canonicalName,
      credit_count: creditCount,
      reset_cycle: resetCycle as "monthly" | "quarterly" | "semiannual" | "annual" | "cardmember_year" | "usage_based",
      renewal_period_months: renewalPeriodMonths,
      default_value_cents: defaultValueCents,
      default_quantity: defaultQuantity,
      unit_name: unitName,
      notes,
      is_active: isActive,
      must_be_earned: mustBeEarned,
    }).eq("id", creditId);

    revalidatePath("/admin/credits");
    redirect("/admin/credits");
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/credits" className="text-sm text-zinc-400 hover:text-white mb-2 inline-block">
          ← Back to Credits
        </Link>
        <h1 className="text-3xl font-bold text-white">Edit Credit</h1>
        <p className="text-zinc-400 mt-1">{credit.name}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <EditCreditForm credit={credit} cards={cards} onSubmit={updateCredit} />
      </div>
    </div>
  );
}
