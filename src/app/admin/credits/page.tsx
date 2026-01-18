import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AddCreditModal } from "./add-credit-modal";
import { CreditsFilter } from "./credits-filter";
import { CreditsList } from "./credits-list";

type Credit = {
  id: string;
  name: string;
  brand_name: string | null;
  credit_count: number;
  reset_cycle: string;
  renewal_period_months: number | null;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  is_active: boolean;
  notes: string | null;
  card: {
    id: string;
    name: string;
    slug: string;
    issuer: {
      id: string;
      name: string;
    } | null;
  } | null;
};

interface PageProps {
  searchParams: Promise<{ card?: string }>;
}

export default async function AdminCreditsPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const params = await searchParams;
  const filterCardId = params.card ?? null;

  const [creditsResult, cardsResult] = await Promise.all([
    supabase
      .from("card_credits")
      .select(`
        id,
        name,
        brand_name,
        credit_count,
        reset_cycle,
        renewal_period_months,
        default_value_cents,
        default_quantity,
        unit_name,
        is_active,
        notes,
        card:cards!card_credits_card_id_fkey (
          id, 
          name, 
          slug,
          issuer:issuers!cards_issuer_id_fkey (id, name)
        )
      `)
      .order("name"),
    supabase
      .from("cards")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name"),
  ]);

  const allCredits = (creditsResult.data ?? []) as unknown as Credit[];
  const cards = cardsResult.data ?? [];

  // Filter credits by card if specified
  const credits = filterCardId
    ? allCredits.filter((c) => c.card?.id === filterCardId)
    : allCredits;

  async function createCredit(formData: FormData) {
    "use server";
    const supabase = createClient();

    const cardId = formData.get("card_id") as string;
    const name = formData.get("name") as string;
    const brandNameRaw = formData.get("brand_name") as string;
    const brandName = brandNameRaw?.trim() || null;
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
    const mustBeEarned = formData.get("must_be_earned") === "true";
    const travelCategoryRaw = formData.get("travel_category") as string;
    const travelCategory = travelCategoryRaw?.trim() || null;

    const defaultValueCents = defaultValueStr ? Math.round(parseFloat(defaultValueStr) * 100) : null;
    const defaultQuantity = defaultQuantityStr ? parseInt(defaultQuantityStr) : null;
    const renewalPeriodMonths = renewalPeriodStr ? parseInt(renewalPeriodStr) : null;

    await supabase.from("card_credits").insert({
      card_id: cardId,
      name,
      brand_name: brandName,
      credit_count: creditCount,
      reset_cycle: resetCycle as "monthly" | "quarterly" | "semiannual" | "annual" | "cardmember_year" | "usage_based",
      renewal_period_months: renewalPeriodMonths,
      default_value_cents: defaultValueCents,
      default_quantity: defaultQuantity,
      unit_name: unitName,
      notes,
      is_active: true,
      must_be_earned: mustBeEarned,
      travel_category: travelCategory,
    });

    revalidatePath("/admin/credits");
  }

  async function deleteCredit(creditId: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("card_credits").delete().eq("id", creditId);
    revalidatePath("/admin/credits");
  }

  async function toggleCreditActive(creditId: string, isActive: boolean) {
    "use server";
    const supabase = createClient();
    await supabase.from("card_credits").update({ is_active: isActive }).eq("id", creditId);
    revalidatePath("/admin/credits");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Card Credits</h1>
          <p className="text-zinc-400 mt-1">
            Manage card credits and benefits that users can track
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CreditsFilter cards={cards} />
          <AddCreditModal cards={cards} onSubmit={createCredit} />
          <Link
            href="/admin/credits/import"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Import Credits
          </Link>
        </div>
      </div>

      {/* Credits List */}
      <CreditsList
        credits={credits}
        onToggleActive={toggleCreditActive}
        onDelete={deleteCredit}
      />
    </div>
  );
}
