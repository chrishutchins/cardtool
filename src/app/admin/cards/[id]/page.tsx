import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CardForm } from "../card-form";
import { EarningRulesEditor } from "./earning-rules-editor";
import { CapsEditor } from "./caps-editor";
import Link from "next/link";
import { Enums } from "@/lib/database.types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CardDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  
  // Build query string for "Back to Cards" link to preserve filters
  const backQueryString = new URLSearchParams(
    Object.entries(resolvedSearchParams)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v] as [string, string])
  ).toString();
  const supabase = await createClient();

  // Get current user for checking their wallet (for "Enabled" indicator)
  const user = await currentUser();

  const [
    cardResult,
    issuersResult,
    currenciesResult,
    categoriesResult,
    rulesResult,
    capsResult,
    capCategoriesResult,
    userWalletResult,
  ] = await Promise.all([
    supabase.from("cards").select("*").eq("id", id).single(),
    supabase.from("issuers").select("*").order("name"),
    supabase.from("reward_currencies").select("*").order("name"),
    supabase.from("earning_categories").select("*").order("name"),
    supabase.from("card_earning_rules").select("id, card_id, category_id, rate, has_cap, cap_amount, cap_unit, cap_period, post_cap_rate, notes, booking_method, brand_name, created_at, updated_at, earning_categories(id, name, slug, parent_category_id)").eq("card_id", id),
    supabase.from("card_caps").select("*").eq("card_id", id),
    supabase.from("card_cap_categories").select("cap_id, category_id, earning_categories(id, name)"),
    user ? supabase.from("user_wallets").select("cards(primary_currency_id)").eq("user_id", user.id) : Promise.resolve({ data: [] }),
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
    const annual_fee = parseFloat(formData.get("annual_fee") as string) || 0;
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
        annual_fee,
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
    const booking_method = (formData.get("booking_method") as "any" | "portal" | "brand") || "any";
    const brand_name = (formData.get("brand_name") as string) || null;

    await supabase.from("card_earning_rules").insert({
      card_id: id,
      category_id,
      rate,
      has_cap,
      cap_amount,
      cap_unit: has_cap ? cap_unit : null,
      cap_period: has_cap ? cap_period : "none",
      post_cap_rate: has_cap ? post_cap_rate : null,
      booking_method,
      brand_name: booking_method === "brand" ? brand_name : null,
    });

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteRule(ruleId: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("card_earning_rules").delete().eq("id", ruleId);
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateRule(ruleId: string, formData: FormData) {
    "use server";
    const supabase = await createClient();

    const rate = parseFloat(formData.get("rate") as string);
    const has_cap = formData.get("has_cap") === "true";
    const cap_amount = formData.get("cap_amount") ? parseFloat(formData.get("cap_amount") as string) : null;
    const cap_unit = formData.get("cap_unit") as "spend" | "rewards" | null;
    const cap_period = formData.get("cap_period") as "none" | "month" | "quarter" | "year" | "lifetime";
    const post_cap_rate = formData.get("post_cap_rate") ? parseFloat(formData.get("post_cap_rate") as string) : null;
    const booking_method = (formData.get("booking_method") as "any" | "portal" | "brand") || "any";
    const brand_name = (formData.get("brand_name") as string) || null;

    await supabase.from("card_earning_rules").update({
      rate,
      has_cap,
      cap_amount: has_cap ? cap_amount : null,
      cap_unit: has_cap ? cap_unit : null,
      cap_period: has_cap ? cap_period : "none",
      post_cap_rate: has_cap ? post_cap_rate : null,
      booking_method,
      brand_name: booking_method === "brand" ? brand_name : null,
    }).eq("id", ruleId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function addCap(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const cap_type = formData.get("cap_type") as Enums<"cap_type">;
    const cap_amount = formData.get("cap_amount") ? parseFloat(formData.get("cap_amount") as string) : null;
    const cap_period = formData.get("cap_period") as Enums<"cap_period">;
    const elevated_rate = parseFloat(formData.get("elevated_rate") as string) || 0;
    const post_cap_rate = formData.get("post_cap_rate") ? parseFloat(formData.get("post_cap_rate") as string) : null;
    const notes = (formData.get("notes") as string) || null;
    const category_ids = JSON.parse(formData.get("category_ids") as string) as number[];

    // Create the cap
    const { data: cap, error } = await supabase
      .from("card_caps")
      .insert({
        card_id: id,
        cap_type,
        cap_amount,
        cap_period,
        elevated_rate,
        post_cap_rate,
        notes,
      })
      .select()
      .single();

    if (cap && category_ids.length > 0) {
      // Add category associations
      await supabase.from("card_cap_categories").insert(
        category_ids.map((category_id) => ({
          cap_id: cap.id,
          category_id,
        }))
      );
    }

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteCap(capId: string) {
    "use server";
    const supabase = await createClient();
    // Categories will be deleted via cascade
    await supabase.from("card_caps").delete().eq("id", capId);
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateCapCategories(capId: string, categoryIds: number[]) {
    "use server";
    const supabase = await createClient();
    
    // Delete existing category associations
    await supabase.from("card_cap_categories").delete().eq("cap_id", capId);
    
    // Insert new associations
    if (categoryIds.length > 0) {
      await supabase.from("card_cap_categories").insert(
        categoryIds.map((category_id) => ({
          cap_id: capId,
          category_id,
        }))
      );
    }

    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateCap(capId: string, formData: FormData) {
    "use server";
    const supabase = await createClient();

    const cap_type = formData.get("cap_type") as Enums<"cap_type">;
    const cap_amount = formData.get("cap_amount") ? parseFloat(formData.get("cap_amount") as string) : null;
    const cap_period = formData.get("cap_period") as Enums<"cap_period">;
    const elevated_rate = parseFloat(formData.get("elevated_rate") as string) || 0;
    const post_cap_rate = formData.get("post_cap_rate") ? parseFloat(formData.get("post_cap_rate") as string) : null;
    const notes = (formData.get("notes") as string) || null;
    const category_ids = JSON.parse(formData.get("category_ids") as string) as number[];

    // Update the cap
    await supabase
      .from("card_caps")
      .update({
        cap_type,
        cap_amount,
        cap_period,
        elevated_rate,
        post_cap_rate,
        notes,
      })
      .eq("id", capId);

    // Update category associations
    await supabase.from("card_cap_categories").delete().eq("cap_id", capId);
    if (category_ids.length > 0) {
      await supabase.from("card_cap_categories").insert(
        category_ids.map((category_id) => ({
          cap_id: capId,
          category_id,
        }))
      );
    }

    revalidatePath(`/admin/cards/${id}`);
  }

  const existingRuleCategoryIds = new Set(rulesResult.data?.map((r) => r.category_id) ?? []);
  const availableCategories = categoriesResult.data?.filter((c) => !existingRuleCategoryIds.has(c.id)) ?? [];
  
  // Get user's primary currency IDs for the "Enabled" indicator on secondary currency
  const userPrimaryCurrencyIds = (userWalletResult.data ?? [])
    .map((w: { cards: { primary_currency_id: string } | null }) => w.cards?.primary_currency_id)
    .filter((id): id is string => !!id);

  // Build caps with their categories
  const caps = (capsResult.data ?? []).map((cap) => {
    const categoryAssociations = (capCategoriesResult.data ?? []).filter(
      (cc) => cc.cap_id === cap.id
    );
    return {
      ...cap,
      categories: categoryAssociations
        .map((cc) => cc.earning_categories)
        .filter((cat): cat is { id: number; name: string } => cat !== null),
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/cards${backQueryString ? `?${backQueryString}` : ""}`} className="text-sm text-zinc-400 hover:text-white mb-2 inline-block">
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
          userPrimaryCurrencyIds={userPrimaryCurrencyIds}
          defaultValues={{
            name: card.name,
            slug: card.slug,
            issuer_id: card.issuer_id,
            primary_currency_id: card.primary_currency_id,
            secondary_currency_id: card.secondary_currency_id,
            product_type: card.product_type,
            annual_fee: card.annual_fee,
            default_earn_rate: card.default_earn_rate,
          }}
        />
      </div>

      {/* Earning Rules */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Earning Rules</h2>
        {(() => {
          const cardCurrency = currenciesResult.data?.find(c => c.id === card.primary_currency_id);
          return (
            <EarningRulesEditor
              rules={rulesResult.data ?? []}
              availableCategories={availableCategories}
              onAddRule={addRule}
              onUpdateRule={updateRule}
              onDeleteRule={deleteRule}
              cardCurrencyType={cardCurrency?.currency_type}
              cardCurrencyName={cardCurrency?.name}
            />
          );
        })()}
      </div>

      {/* Category Bonuses */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Category Bonuses</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Special earning rules: user-selected categories, top spending categories, or combined category caps.
        </p>
        <CapsEditor
          caps={caps}
          allCategories={categoriesResult.data ?? []}
          onAddCap={addCap}
          onUpdateCap={updateCap}
          onDeleteCap={deleteCap}
          onUpdateCapCategories={updateCapCategories}
          currencyType={card.primary_currency?.currency_type}
        />
      </div>
    </div>
  );
}

