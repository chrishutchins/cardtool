import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CardForm } from "../card-form";
import { EarningRulesEditor } from "./earning-rules-editor";
import { EnablersEditor } from "./enablers-editor";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    cardResult,
    issuersResult,
    currenciesResult,
    categoriesResult,
    rulesResult,
    enablersResult,
    allCardsResult,
  ] = await Promise.all([
    supabase.from("cards").select("*").eq("id", id).single(),
    supabase.from("issuers").select("*").order("name"),
    supabase.from("reward_currencies").select("*").order("name"),
    supabase.from("earning_categories").select("*").order("sort_order"),
    supabase.from("card_earning_rules").select("id, card_id, category_id, rate, has_cap, cap_amount, cap_unit, cap_period, post_cap_rate, notes, created_at, updated_at, earning_categories(id, name, slug)").eq("card_id", id),
    supabase.from("card_currency_enablers").select("enabler_card_id").eq("card_id", id),
    supabase.from("card_with_currency").select("*").neq("id", id).order("issuer_name").order("name"),
  ]);

  if (cardResult.error || !cardResult.data) {
    notFound();
  }

  const card = cardResult.data;

  async function updateCard(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const issuer_id = formData.get("issuer_id") as string;
    const primary_currency_id = formData.get("primary_currency_id") as string;
    const secondary_currency_id = (formData.get("secondary_currency_id") as string | null) || null;
    const product_type = formData.get("product_type") as "personal" | "business";
    const annual_fee_cents = parseInt(formData.get("annual_fee_cents") as string) || 0;
    const default_earn_rate = parseFloat(formData.get("default_earn_rate") as string) || 1.0;

    await supabase
      .from("cards")
      .update({
        name,
        slug,
        issuer_id,
        primary_currency_id,
        secondary_currency_id: secondary_currency_id || null,
        product_type,
        annual_fee_cents,
        default_earn_rate,
      })
      .eq("id", id);

    revalidatePath(`/admin/cards/${id}`);
    revalidatePath("/admin/cards");
  }

  async function addRule(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const category_id = parseInt(formData.get("category_id") as string);
    const rate = parseFloat(formData.get("rate") as string);
    const has_cap = formData.get("has_cap") === "true";
    const cap_amount = formData.get("cap_amount") ? parseFloat(formData.get("cap_amount") as string) : null;
    const cap_unit = formData.get("cap_unit") as "spend" | "rewards" | null;
    const cap_period = formData.get("cap_period") as "none" | "month" | "quarter" | "year" | "lifetime";
    const post_cap_rate = formData.get("post_cap_rate") ? parseFloat(formData.get("post_cap_rate") as string) : null;

    await supabase.from("card_earning_rules").insert({
      card_id: id,
      category_id,
      rate,
      has_cap,
      cap_amount,
      cap_unit: has_cap ? cap_unit : null,
      cap_period: has_cap ? cap_period : "none",
      post_cap_rate: has_cap ? post_cap_rate : null,
    });

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteRule(ruleId: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("card_earning_rules").delete().eq("id", ruleId);
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateEnablers(enablerIds: string[]) {
    "use server";
    const supabase = await createClient();
    
    // Delete existing enablers
    await supabase.from("card_currency_enablers").delete().eq("card_id", id);
    
    // Insert new enablers
    if (enablerIds.length > 0) {
      await supabase.from("card_currency_enablers").insert(
        enablerIds.map((enabler_card_id) => ({
          card_id: id,
          enabler_card_id,
        }))
      );
    }

    revalidatePath(`/admin/cards/${id}`);
  }

  const existingRuleCategoryIds = new Set(rulesResult.data?.map((r) => r.category_id) ?? []);
  const availableCategories = categoriesResult.data?.filter((c) => !existingRuleCategoryIds.has(c.id)) ?? [];
  const currentEnablerIds = enablersResult.data?.map((e) => e.enabler_card_id) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/cards" className="text-sm text-zinc-400 hover:text-white mb-2 inline-block">
            ← Back to Cards
          </Link>
          <h1 className="text-3xl font-bold text-white">{card.name}</h1>
        </div>
      </div>

      {/* Card Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Card Details</h2>
        <CardForm
          action={updateCard}
          issuers={issuersResult.data ?? []}
          currencies={currenciesResult.data ?? []}
          defaultValues={{
            name: card.name,
            slug: card.slug,
            issuer_id: card.issuer_id,
            primary_currency_id: card.primary_currency_id,
            secondary_currency_id: card.secondary_currency_id,
            product_type: card.product_type,
            annual_fee_cents: card.annual_fee_cents,
            default_earn_rate: card.default_earn_rate,
          }}
        />
      </div>

      {/* Currency Enablers (only show if card has secondary currency) */}
      {card.secondary_currency_id && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Currency Enablers</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Select which cards, when held by the user, will enable this card&apos;s secondary currency.
          </p>
          <EnablersEditor
            currentEnablerIds={currentEnablerIds}
            availableCards={allCardsResult.data ?? []}
            onUpdate={updateEnablers}
          />
        </div>
      )}

      {/* Earning Rules */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Earning Rules</h2>
        <EarningRulesEditor
          rules={rulesResult.data ?? []}
          availableCategories={availableCategories}
          onAddRule={addRule}
          onDeleteRule={deleteRule}
        />
      </div>
    </div>
  );
}

