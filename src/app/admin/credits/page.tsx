import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DeleteCreditButton } from "./delete-credit-button";
import { AddCreditForm } from "./add-credit-form";
import { CreditsFilter } from "./credits-filter";

type Credit = {
  id: string;
  name: string;
  brand_name: string | null;
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
  } | null;
};

interface PageProps {
  searchParams: Promise<{ card?: string }>;
}

export default async function AdminCreditsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const filterCardId = params.card ?? null;

  const [creditsResult, cardsResult] = await Promise.all([
    supabase
      .from("card_credits")
      .select(`
        id,
        name,
        brand_name,
        reset_cycle,
        renewal_period_months,
        default_value_cents,
        default_quantity,
        unit_name,
        is_active,
        notes,
        card:cards!card_credits_card_id_fkey (id, name, slug)
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

  // Sort credits by card name first, then credit name
  allCredits.sort((a, b) => {
    const cardNameA = a.card?.name?.toLowerCase() ?? "";
    const cardNameB = b.card?.name?.toLowerCase() ?? "";
    if (cardNameA !== cardNameB) {
      return cardNameA.localeCompare(cardNameB);
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Filter credits by card if specified
  const credits = filterCardId
    ? allCredits.filter((c) => c.card?.id === filterCardId)
    : allCredits;

  // Group credits by card
  const creditsByCard = new Map<string, Credit[]>();
  for (const credit of credits) {
    const cardName = credit.card?.name ?? "Unknown Card";
    if (!creditsByCard.has(cardName)) {
      creditsByCard.set(cardName, []);
    }
    creditsByCard.get(cardName)!.push(credit);
  }

  async function createCredit(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const cardId = formData.get("card_id") as string;
    const name = formData.get("name") as string;
    const brandNameRaw = formData.get("brand_name") as string;
    const brandName = brandNameRaw?.trim() || null;
    const resetCycle = formData.get("reset_cycle") as string;
    const renewalPeriodStr = formData.get("renewal_period_months") as string;
    const defaultValueStr = formData.get("default_value") as string;
    const defaultQuantityStr = formData.get("default_quantity") as string;
    const unitNameRaw = formData.get("unit_name") as string;
    const unitName = unitNameRaw?.trim() || null;
    const notesRaw = formData.get("notes") as string;
    const notes = notesRaw?.trim() || null;
    const mustBeEarned = formData.get("must_be_earned") === "true";

    const defaultValueCents = defaultValueStr ? Math.round(parseFloat(defaultValueStr) * 100) : null;
    const defaultQuantity = defaultQuantityStr ? parseInt(defaultQuantityStr) : null;
    const renewalPeriodMonths = renewalPeriodStr ? parseInt(renewalPeriodStr) : null;

    await supabase.from("card_credits").insert({
      card_id: cardId,
      name,
      brand_name: brandName,
      reset_cycle: resetCycle as "monthly" | "quarterly" | "semiannual" | "annual" | "cardmember_year" | "usage_based",
      renewal_period_months: renewalPeriodMonths,
      default_value_cents: defaultValueCents,
      default_quantity: defaultQuantity,
      unit_name: unitName,
      notes,
      is_active: true,
      must_be_earned: mustBeEarned,
    });

    revalidatePath("/admin/credits");
  }

  async function deleteCredit(creditId: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("card_credits").delete().eq("id", creditId);
    revalidatePath("/admin/credits");
  }

  async function toggleCreditActive(creditId: string, isActive: boolean) {
    "use server";
    const supabase = await createClient();
    await supabase.from("card_credits").update({ is_active: isActive }).eq("id", creditId);
    revalidatePath("/admin/credits");
  }

  const formatValue = (credit: Credit) => {
    if (credit.default_value_cents) {
      return `$${(credit.default_value_cents / 100).toFixed(0)}`;
    }
    if (credit.default_quantity && credit.unit_name) {
      return `${credit.default_quantity} ${credit.unit_name}${credit.default_quantity > 1 ? 's' : ''}`;
    }
    if (credit.default_quantity) {
      return `${credit.default_quantity} units`;
    }
    return "—";
  };

  const formatResetCycle = (credit: Credit) => {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      semiannual: "Semi-Annual",
      annual: "Annual",
      cardmember_year: "Cardmember Year",
      usage_based: "Usage-Based",
    };
    let label = labels[credit.reset_cycle] || credit.reset_cycle;
    if (credit.reset_cycle === "usage_based" && credit.renewal_period_months) {
      const years = credit.renewal_period_months / 12;
      if (years === Math.floor(years)) {
        label += ` (${years}yr)`;
      } else {
        label += ` (${credit.renewal_period_months}mo)`;
      }
    }
    return label;
  };

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
          <Link
            href="/admin/credits/import"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Import Credits
          </Link>
        </div>
      </div>

      {/* Add New Credit Form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Credit</h2>
        <AddCreditForm cards={cards} onSubmit={createCredit} />
      </div>

      {/* Credits List */}
      <div className="space-y-6">
        {Array.from(creditsByCard.entries()).map(([cardName, cardCredits]) => (
          <div key={cardName} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">{cardName}</h3>
              <p className="text-sm text-zinc-400">{cardCredits.length} credit{cardCredits.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {cardCredits.map((credit) => (
                <div key={credit.id} className={`px-6 py-4 flex items-center justify-between ${!credit.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{credit.name}</span>
                      {credit.brand_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
                          {credit.brand_name}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">
                        {formatResetCycle(credit)}
                      </span>
                      {!credit.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Value: {formatValue(credit)}
                      {credit.notes && <span className="ml-3 text-zinc-500">• {credit.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/credits/${credit.id}`}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Edit
                    </Link>
                    <form action={toggleCreditActive.bind(null, credit.id, !credit.is_active)}>
                      <button
                        type="submit"
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                      >
                        {credit.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <DeleteCreditButton creditId={credit.id} onDelete={deleteCredit} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {credits.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400 mb-2">No credits defined yet.</p>
            <p className="text-zinc-500 text-sm">
              Add credits manually above or{" "}
              <Link href="/admin/credits/import" className="text-emerald-400 hover:text-emerald-300">
                import from CSV
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
