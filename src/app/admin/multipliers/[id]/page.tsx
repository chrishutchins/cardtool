import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { TiersEditor } from "./tiers-editor";
import { EligibilityEditor } from "./eligibility-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MultiplierProgramPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    programResult,
    tiersResult,
    currenciesResult,
    cardsResult,
    allCurrenciesResult,
    allCardsResult,
  ] = await Promise.all([
    supabase.from("earning_multiplier_programs").select("*").eq("id", id).single(),
    supabase.from("earning_multiplier_tiers").select("*").eq("program_id", id).order("sort_order"),
    supabase
      .from("earning_multiplier_currencies")
      .select("currency_id, reward_currencies(id, name, code)")
      .eq("program_id", id),
    supabase
      .from("earning_multiplier_cards")
      .select("card_id, cards(id, name)")
      .eq("program_id", id),
    supabase.from("reward_currencies").select("id, name, code").order("name"),
    supabase.from("card_with_currency").select("id, name, issuer_name, primary_currency_name").order("name"),
  ]);

  if (programResult.error || !programResult.data) {
    notFound();
  }

  const program = programResult.data;

  async function updateProgram(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string | null) || null;

    await supabase
      .from("earning_multiplier_programs")
      .update({ name, description })
      .eq("id", id);
    revalidatePath(`/admin/multipliers/${id}`);
  }

  async function addTier(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const multiplier = parseFloat(formData.get("multiplier") as string);
    const sort_order = parseInt(formData.get("sort_order") as string) || 0;
    const requirements = (formData.get("requirements") as string | null) || null;
    const cap_amount_raw = formData.get("cap_amount") as string;
    const cap_amount = cap_amount_raw ? parseFloat(cap_amount_raw) : null;
    // has_cap is only true if there's actually a cap amount
    const has_cap = formData.get("has_cap") === "true" && cap_amount !== null;
    const cap_period = (formData.get("cap_period") as "none" | "month" | "quarter" | "year" | "lifetime") || "month";

    await supabase.from("earning_multiplier_tiers").insert({
      program_id: id,
      name,
      multiplier,
      sort_order,
      requirements,
      has_cap,
      cap_amount: has_cap ? cap_amount : null,
      cap_period: has_cap ? cap_period : null,
      post_cap_multiplier: has_cap ? 1.0 : null,
    });
    revalidatePath(`/admin/multipliers/${id}`);
  }

  async function updateTier(tierId: string, formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const multiplier = parseFloat(formData.get("multiplier") as string);
    const sort_order = parseInt(formData.get("sort_order") as string) || 0;
    const requirements = (formData.get("requirements") as string | null) || null;
    const cap_amount_raw = formData.get("cap_amount") as string;
    const cap_amount = cap_amount_raw ? parseFloat(cap_amount_raw) : null;
    // has_cap is only true if there's actually a cap amount
    const has_cap = formData.get("has_cap") === "true" && cap_amount !== null;
    const cap_period = (formData.get("cap_period") as "none" | "month" | "quarter" | "year" | "lifetime") || "month";

    await supabase
      .from("earning_multiplier_tiers")
      .update({ 
        name, 
        multiplier, 
        sort_order, 
        requirements,
        has_cap,
        cap_amount: has_cap ? cap_amount : null,
        cap_period: has_cap ? cap_period : null,
        post_cap_multiplier: has_cap ? 1.0 : null,
      })
      .eq("id", tierId);
    revalidatePath(`/admin/multipliers/${id}`);
  }

  async function deleteTier(tierId: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("earning_multiplier_tiers").delete().eq("id", tierId);
    revalidatePath(`/admin/multipliers/${id}`);
  }

  async function updateEligibleCurrencies(currencyIds: string[]) {
    "use server";
    const supabase = await createClient();
    // Delete existing
    await supabase.from("earning_multiplier_currencies").delete().eq("program_id", id);
    // Insert new
    if (currencyIds.length > 0) {
      await supabase.from("earning_multiplier_currencies").insert(
        currencyIds.map((currency_id) => ({ program_id: id, currency_id }))
      );
    }
    revalidatePath(`/admin/multipliers/${id}`);
  }

  async function updateEligibleCards(cardIds: string[]) {
    "use server";
    const supabase = await createClient();
    // Delete existing
    await supabase.from("earning_multiplier_cards").delete().eq("program_id", id);
    // Insert new
    if (cardIds.length > 0) {
      await supabase.from("earning_multiplier_cards").insert(
        cardIds.map((card_id) => ({ program_id: id, card_id }))
      );
    }
    revalidatePath(`/admin/multipliers/${id}`);
  }

  const currentCurrencyIds =
    currenciesResult.data?.map((c) => c.currency_id) ?? [];
  const currentCardIds = cardsResult.data?.map((c) => c.card_id) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/multipliers"
          className="text-sm text-zinc-400 hover:text-white mb-2 inline-block"
        >
          ← Back to Programs
        </Link>
        <h1 className="text-3xl font-bold text-white">{program.name}</h1>
        {program.description && (
          <p className="text-zinc-400 mt-1">{program.description}</p>
        )}
      </div>

      {/* Program Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Program Details</h2>
        <form action={updateProgram} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
            <input
              type="text"
              name="name"
              defaultValue={program.name}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
            <input
              type="text"
              name="description"
              defaultValue={program.description ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Update Program
            </button>
          </div>
        </form>
      </div>

      {/* Tiers */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Tiers</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Define the multiplier tiers for this program (e.g., Gold = 1.25x, Platinum = 1.5x).
        </p>
        <TiersEditor
          tiers={tiersResult.data ?? []}
          onAddTier={addTier}
          onUpdateTier={updateTier}
          onDeleteTier={deleteTier}
        />
      </div>

      {/* Eligibility */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Eligible Cards & Currencies</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Select which currencies or specific cards this program applies to. If you select currencies, 
          all cards earning those currencies will be eligible.
        </p>
        <EligibilityEditor
          currentCurrencyIds={currentCurrencyIds}
          currentCardIds={currentCardIds}
          allCurrencies={allCurrenciesResult.data ?? []}
          allCards={(allCardsResult.data ?? []).filter((c): c is { id: string; name: string; issuer_name: string | null; primary_currency_name: string | null } => c.id !== null && c.name !== null)}
          onUpdateCurrencies={updateEligibleCurrencies}
          onUpdateCards={updateEligibleCards}
        />
      </div>
    </div>
  );
}

