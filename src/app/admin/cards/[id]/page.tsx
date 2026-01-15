import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CardForm } from "../card-form";
import { EarningRulesEditor } from "./earning-rules-editor";
import { CapsEditor } from "./caps-editor";
import { OfferEditor } from "./offer-editor";
import Link from "next/link";
import { Enums } from "@/lib/database.types";
import { invalidateCardCaches, invalidateEarningRuleCaches, invalidateCardCapCaches } from "@/lib/cache-invalidation";

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
  const supabase = createClient();

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
    activeOfferResult,
    archivedOffersResult,
  ] = await Promise.all([
    supabase.from("cards").select("*").eq("id", id).single(),
    supabase.from("issuers").select("*").order("name"),
    supabase.from("reward_currencies").select("*").order("name"),
    supabase.from("earning_categories").select("*").order("name"),
    supabase.from("card_earning_rules").select("id, card_id, category_id, rate, has_cap, cap_amount, cap_unit, cap_period, post_cap_rate, notes, booking_method, brand_name, created_at, updated_at, earning_categories(id, name, slug, parent_category_id)").eq("card_id", id),
    supabase.from("card_caps").select("*").eq("card_id", id),
    // Only fetch cap categories for this card's caps (join through card_caps)
    supabase.from("card_cap_categories").select("cap_id, category_id, earning_categories(id, name), card_caps!inner(card_id)").eq("card_caps.card_id", id),
    user ? supabase.from("user_wallets").select("cards(primary_currency_id)").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    // Fetch all active offers with bonuses, elevated earnings, and intro APRs
    supabase.from("card_offers")
      .select(`
        *,
        card_offer_bonuses(*),
        card_offer_elevated_earnings(*),
        card_offer_intro_apr(*)
      `)
      .eq("card_id", id)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    // Fetch archived offers
    supabase.from("card_offers")
      .select(`
        *,
        card_offer_bonuses(*),
        card_offer_elevated_earnings(*),
        card_offer_intro_apr(*)
      `)
      .eq("card_id", id)
      .eq("is_archived", true)
      .order("archived_at", { ascending: false }),
  ]);

  if (cardResult.error || !cardResult.data) {
    notFound();
  }

  const card = cardResult.data;

  async function updateCard(formData: FormData) {
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
    const no_foreign_transaction_fees = formData.get("no_foreign_transaction_fees") === "on";

    await supabase
      .from("cards")
      .update({
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
        no_foreign_transaction_fees,
      })
      .eq("id", id);

    invalidateCardCaches();
    revalidatePath(`/admin/cards/${id}`);
    revalidatePath("/admin/cards");
  }

  async function addRule(formData: FormData) {
    "use server";
    const supabase = createClient();

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

    invalidateEarningRuleCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteRule(ruleId: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("card_earning_rules").delete().eq("id", ruleId);
    invalidateEarningRuleCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateRule(ruleId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

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

    invalidateEarningRuleCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  async function addCap(formData: FormData) {
    "use server";
    const supabase = createClient();

    const cap_type = formData.get("cap_type") as Enums<"cap_type">;
    const cap_amount = formData.get("cap_amount") ? parseFloat(formData.get("cap_amount") as string) : null;
    const cap_period = formData.get("cap_period") as Enums<"cap_period">;
    const elevated_rate = parseFloat(formData.get("elevated_rate") as string) || 0;
    const post_cap_rate = formData.get("post_cap_rate") ? parseFloat(formData.get("post_cap_rate") as string) : null;
    const notes = (formData.get("notes") as string) || null;
    const category_ids = JSON.parse(formData.get("category_ids") as string) as number[];

    // Create the cap
    // Only set cap_period if there's a cap_amount (mirrors earning rules pattern)
    const { data: cap, error } = await supabase
      .from("card_caps")
      .insert({
        card_id: id,
        cap_type,
        cap_amount,
        cap_period: cap_amount ? cap_period : "none",
        elevated_rate,
        post_cap_rate: cap_amount ? post_cap_rate : null,
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

    invalidateCardCapCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteCap(capId: string) {
    "use server";
    const supabase = createClient();
    // Categories will be deleted via cascade
    await supabase.from("card_caps").delete().eq("id", capId);
    invalidateCardCapCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateCapCategories(capId: string, categoryIds: number[]) {
    "use server";
    const supabase = createClient();
    
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

    invalidateCardCapCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateCap(capId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const cap_type = formData.get("cap_type") as Enums<"cap_type">;
    const cap_amount = formData.get("cap_amount") ? parseFloat(formData.get("cap_amount") as string) : null;
    const cap_period = formData.get("cap_period") as Enums<"cap_period">;
    const elevated_rate = parseFloat(formData.get("elevated_rate") as string) || 0;
    const post_cap_rate = formData.get("post_cap_rate") ? parseFloat(formData.get("post_cap_rate") as string) : null;
    const notes = (formData.get("notes") as string) || null;
    const category_ids = JSON.parse(formData.get("category_ids") as string) as number[];

    // Update the cap
    // Only set cap_period if there's a cap_amount (mirrors earning rules pattern)
    await supabase
      .from("card_caps")
      .update({
        cap_type,
        cap_amount,
        cap_period: cap_amount ? cap_period : "none",
        elevated_rate,
        post_cap_rate: cap_amount ? post_cap_rate : null,
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

    invalidateCardCapCaches();
    revalidatePath(`/admin/cards/${id}`);
  }

  // ========== OFFER SERVER ACTIONS ==========

  async function createOffer() {
    "use server";
    const supabase = createClient();
    await supabase.from("card_offers").insert({
      card_id: id,
      is_active: true,
      is_archived: false,
    });
    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateOffer(offerId: string, formData: FormData) {
    "use server";
    const supabase = createClient();
    
    const offer_description = formData.get("offer_description") as string || null;
    const internal_description = formData.get("internal_description") as string || null;
    const offer_type = formData.get("offer_type") as "referral" | "affiliate" | "direct" | "nll" | "elevated" | "targeted";
    const first_year_af_waived = formData.get("first_year_af_waived") === "on";
    const expires_at = formData.get("expires_at") as string || null;
    const editorial_notes = formData.get("editorial_notes") as string || null;
    const ath_redirect_url = formData.get("ath_redirect_url") as string || null;
    const application_url = formData.get("application_url") as string || null;
    const rates_fees_url = formData.get("rates_fees_url") as string || null;

    await supabase.from("card_offers").update({
      offer_description,
      internal_description,
      offer_type,
      first_year_af_waived,
      expires_at: expires_at || null,
      editorial_notes,
      ath_redirect_url,
      application_url,
      rates_fees_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", offerId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function archiveOffer(offerId: string) {
    "use server";
    const supabase = createClient();
    
    await supabase.from("card_offers").update({
      is_active: false,
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("id", offerId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteOffer(offerId: string) {
    "use server";
    const supabase = createClient();
    
    // Delete will cascade to bonuses, elevated earnings, and intro APRs
    await supabase.from("card_offers").delete().eq("id", offerId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function cloneOffer(sourceOfferId: string) {
    "use server";
    const supabase = createClient();

    const { data: sourceOffer } = await supabase.from("card_offers")
      .select(`*, card_offer_bonuses(*), card_offer_elevated_earnings(*), card_offer_intro_apr(*)`)
      .eq("id", sourceOfferId)
      .single();

    if (!sourceOffer) return;

    // Clone the offer (don't archive the source - we allow multiple active offers now)
    const { data: newOffer } = await supabase.from("card_offers").insert({
      card_id: id,
      is_active: true,
      is_archived: false,
      offer_description: sourceOffer.offer_description,
      internal_description: sourceOffer.internal_description ? `${sourceOffer.internal_description} (copy)` : "(copy)",
      offer_type: sourceOffer.offer_type,
      first_year_af_waived: sourceOffer.first_year_af_waived,
      expires_at: null,
      editorial_notes: sourceOffer.editorial_notes,
      ath_redirect_url: sourceOffer.ath_redirect_url,
      application_url: sourceOffer.application_url,
      rates_fees_url: sourceOffer.rates_fees_url,
    }).select().single();

    if (!newOffer) return;

    type SourceBonus = { component_type: string; spend_requirement_cents: number; time_period: number; time_period_unit: string; points_amount: number | null; currency_id: string | null; cash_amount_cents: number | null; benefit_description: string | null; default_benefit_value_cents: number | null; };
    const bonuses = (sourceOffer.card_offer_bonuses ?? []) as SourceBonus[];
    if (bonuses.length > 0) {
      await supabase.from("card_offer_bonuses").insert(
        bonuses.map((b) => ({ offer_id: newOffer.id, component_type: b.component_type, spend_requirement_cents: b.spend_requirement_cents, time_period: b.time_period, time_period_unit: b.time_period_unit, points_amount: b.points_amount, currency_id: b.currency_id, cash_amount_cents: b.cash_amount_cents, benefit_description: b.benefit_description, default_benefit_value_cents: b.default_benefit_value_cents }))
      );
    }

    type SourceEarning = { elevated_rate: number; duration_months: number | null; duration_unit: string; category_id: number | null; };
    const earnings = (sourceOffer.card_offer_elevated_earnings ?? []) as SourceEarning[];
    if (earnings.length > 0) {
      await supabase.from("card_offer_elevated_earnings").insert(
        earnings.map((e) => ({ offer_id: newOffer.id, elevated_rate: e.elevated_rate, duration_months: e.duration_months, duration_unit: e.duration_unit, category_id: e.category_id }))
      );
    }

    type SourceApr = { apr_type: string; apr_rate: number; duration: number; duration_unit: string; };
    const aprs = (sourceOffer.card_offer_intro_apr ?? []) as SourceApr[];
    if (aprs.length > 0) {
      await supabase.from("card_offer_intro_apr").insert(
        aprs.map((a) => ({ offer_id: newOffer.id, apr_type: a.apr_type, apr_rate: a.apr_rate, duration: a.duration, duration_unit: a.duration_unit }))
      );
    }

    revalidatePath(`/admin/cards/${id}`);
  }

  async function addOfferBonus(offerId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const component_type = formData.get("component_type") as string;
    const spend_requirement_cents = parseInt(formData.get("spend_requirement_cents") as string) || 0;
    const time_period = parseInt(formData.get("time_period") as string) || 3;
    const time_period_unit = formData.get("time_period_unit") as string || "months";
    const points_amount = formData.get("points_amount") ? parseInt(formData.get("points_amount") as string) : null;
    const currency_id = formData.get("currency_id") as string || null;
    const cash_amount_cents = formData.get("cash_amount_cents") ? parseInt(formData.get("cash_amount_cents") as string) : null;
    const benefit_description = formData.get("benefit_description") as string || null;
    const default_benefit_value_cents = formData.get("default_benefit_value_cents") ? parseInt(formData.get("default_benefit_value_cents") as string) : null;

    await supabase.from("card_offer_bonuses").insert({
      offer_id: offerId, component_type, spend_requirement_cents, time_period, time_period_unit, points_amount, currency_id, cash_amount_cents, benefit_description, default_benefit_value_cents,
    });

    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateOfferBonus(bonusId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const component_type = formData.get("component_type") as string;
    const spend_requirement_cents = Math.round(parseFloat(formData.get("spend_requirement_cents") as string || "0") * 100);
    const time_period = parseInt(formData.get("time_period") as string) || 3;
    const time_period_unit = formData.get("time_period_unit") as string || "months";
    const points_amount = formData.get("points_amount") ? parseInt(formData.get("points_amount") as string) : null;
    const currency_id = formData.get("currency_id") as string || null;
    const cash_amount_cents = formData.get("cash_amount_cents") ? Math.round(parseFloat(formData.get("cash_amount_cents") as string) * 100) : null;
    const benefit_description = formData.get("benefit_description") as string || null;
    const default_benefit_value_cents = formData.get("default_benefit_value_cents") ? Math.round(parseFloat(formData.get("default_benefit_value_cents") as string) * 100) : null;

    await supabase.from("card_offer_bonuses").update({
      component_type, spend_requirement_cents, time_period, time_period_unit, points_amount, currency_id, cash_amount_cents, benefit_description, default_benefit_value_cents, updated_at: new Date().toISOString(),
    }).eq("id", bonusId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteOfferBonus(bonusId: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("card_offer_bonuses").delete().eq("id", bonusId);
    revalidatePath(`/admin/cards/${id}`);
  }

  async function addElevatedEarning(offerId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const elevated_rate = parseFloat(formData.get("elevated_rate") as string);
    const duration_months = formData.get("duration_months") ? parseInt(formData.get("duration_months") as string) : null;
    const duration_unit = formData.get("duration_unit") as string || "months";
    const category_id = formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null;

    await supabase.from("card_offer_elevated_earnings").insert({
      offer_id: offerId, elevated_rate, duration_months, duration_unit, category_id,
    });

    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateElevatedEarning(earningId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const elevated_rate = parseFloat(formData.get("elevated_rate") as string);
    const duration_months = formData.get("duration_months") ? parseInt(formData.get("duration_months") as string) : null;
    const duration_unit = formData.get("duration_unit") as string || "months";
    const category_id = formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null;

    await supabase.from("card_offer_elevated_earnings").update({
      elevated_rate, duration_months, duration_unit, category_id, updated_at: new Date().toISOString(),
    }).eq("id", earningId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteElevatedEarning(earningId: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("card_offer_elevated_earnings").delete().eq("id", earningId);
    revalidatePath(`/admin/cards/${id}`);
  }

  async function addIntroApr(offerId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const apr_type = formData.get("apr_type") as string || "purchases";
    const apr_rate = parseFloat(formData.get("apr_rate") as string) || 0;
    const duration = parseInt(formData.get("duration") as string);
    const duration_unit = formData.get("duration_unit") as string || "months";

    await supabase.from("card_offer_intro_apr").insert({
      offer_id: offerId, apr_type, apr_rate, duration, duration_unit,
    });

    revalidatePath(`/admin/cards/${id}`);
  }

  async function updateIntroApr(aprId: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const apr_type = formData.get("apr_type") as string || "purchases";
    const apr_rate = parseFloat(formData.get("apr_rate") as string) || 0;
    const duration = parseInt(formData.get("duration") as string);
    const duration_unit = formData.get("duration_unit") as string || "months";

    await supabase.from("card_offer_intro_apr").update({
      apr_type, apr_rate, duration, duration_unit, updated_at: new Date().toISOString(),
    }).eq("id", aprId);

    revalidatePath(`/admin/cards/${id}`);
  }

  async function deleteIntroApr(aprId: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("card_offer_intro_apr").delete().eq("id", aprId);
    revalidatePath(`/admin/cards/${id}`);
  }

  // ========== END OFFER SERVER ACTIONS ==========

  // Spend Bonuses and Welcome Bonuses have been moved to user-managed in the wallet page

  // Pass all categories - cards can have multiple rules per category (e.g., direct vs portal booking)
  const allCategories = categoriesResult.data ?? [];
  
  // Get user's primary currency IDs for the "Enabled" indicator on secondary currency
  const userPrimaryCurrencyIds = ((userWalletResult.data ?? []) as unknown as { cards: { primary_currency_id: string } | null }[])
    .map((w) => w.cards?.primary_currency_id)
    .filter((id): id is string => !!id);

  // Build caps with their categories
  type CategoryAssoc = { cap_id: string; earning_categories: { id: number; name: string } | null };
  const caps = (capsResult.data ?? []).map((cap) => {
    const categoryAssociations = ((capCategoriesResult.data ?? []) as unknown as CategoryAssoc[]).filter(
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
            card_charge_type: card.card_charge_type,
            annual_fee: card.annual_fee,
            default_earn_rate: card.default_earn_rate,
            default_perks_value: card.default_perks_value,
            no_foreign_transaction_fees: card.no_foreign_transaction_fees,
          }}
        />
      </div>

      {/* Earning Rules */}
      {(() => {
        const cardCurrency = currenciesResult.data?.find(c => c.id === card.primary_currency_id);
        return (
          <>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Earning Rules</h2>
              <EarningRulesEditor
                rules={(rulesResult.data ?? []) as unknown as Parameters<typeof EarningRulesEditor>[0]["rules"]}
                availableCategories={allCategories}
                onAddRule={addRule}
                onUpdateRule={updateRule}
                onDeleteRule={deleteRule}
                cardCurrencyType={cardCurrency?.currency_type}
                cardCurrencyName={cardCurrency?.name}
              />
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
                currencyType={cardCurrency?.currency_type}
              />
            </div>

            {/* Active Offers */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Active Offers {(activeOfferResult.data ?? []).length > 0 && `(${(activeOfferResult.data ?? []).length})`}
                </h2>
                <form action={createOffer}>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                  >
                    + New Offer
                  </button>
                </form>
              </div>

              {(activeOfferResult.data ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-400">No active offers for this card.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(activeOfferResult.data ?? []).map((activeOffer) => (
                    <div key={activeOffer.id} className="border border-zinc-700 rounded-lg p-4">
                      <OfferEditor
                        cardId={id}
                        cardDefaultEarnRate={card.default_earn_rate}
                        offer={{
                          ...activeOffer,
                          offer_type: activeOffer.offer_type as "referral" | "affiliate" | "direct" | "nll" | "elevated" | "targeted",
                          bonuses: ((activeOffer.card_offer_bonuses ?? []) as unknown[]).map((b: unknown) => {
                            const bonus = b as {
                              id: string;
                              spend_requirement_cents: number;
                              time_period: number;
                              time_period_unit: "days" | "months";
                              component_type: "points" | "cash" | "benefit";
                              points_amount: number | null;
                              currency_id: string | null;
                              cash_amount_cents: number | null;
                              benefit_description: string | null;
                              default_benefit_value_cents: number | null;
                            };
                            const currency = currenciesResult.data?.find(c => c.id === bonus.currency_id);
                            return { ...bonus, currency_name: currency?.name };
                          }),
                          elevated_earnings: ((activeOffer.card_offer_elevated_earnings ?? []) as unknown[]).map((e: unknown) => {
                            const earning = e as {
                              id: string;
                              elevated_rate: number;
                              duration_months: number | null;
                              duration_unit: "days" | "months";
                              category_id: number | null;
                            };
                            const category = categoriesResult.data?.find(c => c.id === earning.category_id);
                            return { ...earning, category_name: category?.name };
                          }),
                          intro_aprs: ((activeOffer.card_offer_intro_apr ?? []) as unknown[]).map((a: unknown) => {
                            return a as {
                              id: string;
                              apr_type: "purchases" | "balance_transfers" | "both";
                              apr_rate: number;
                              duration: number;
                              duration_unit: "days" | "months";
                            };
                          }),
                        }}
                        archivedOffers={(archivedOffersResult.data ?? []).map((offer) => ({
                          ...offer,
                          offer_type: offer.offer_type as "referral" | "affiliate" | "direct" | "nll" | "elevated" | "targeted",
                          bonuses: ((offer.card_offer_bonuses ?? []) as unknown[]).map((b: unknown) => {
                            const bonus = b as {
                              id: string;
                              spend_requirement_cents: number;
                              time_period: number;
                              time_period_unit: "days" | "months";
                              component_type: "points" | "cash" | "benefit";
                              points_amount: number | null;
                              currency_id: string | null;
                              cash_amount_cents: number | null;
                              benefit_description: string | null;
                              default_benefit_value_cents: number | null;
                            };
                            const currency = currenciesResult.data?.find(c => c.id === bonus.currency_id);
                            return { ...bonus, currency_name: currency?.name };
                          }),
                          elevated_earnings: ((offer.card_offer_elevated_earnings ?? []) as unknown[]).map((e: unknown) => {
                            const earning = e as {
                              id: string;
                              elevated_rate: number;
                              duration_months: number | null;
                              duration_unit: "days" | "months";
                              category_id: number | null;
                            };
                            const category = categoriesResult.data?.find(c => c.id === earning.category_id);
                            return { ...earning, category_name: category?.name };
                          }),
                          intro_aprs: ((offer.card_offer_intro_apr ?? []) as unknown[]).map((a: unknown) => {
                            return a as {
                              id: string;
                              apr_type: "purchases" | "balance_transfers" | "both";
                              apr_rate: number;
                              duration: number;
                              duration_unit: "days" | "months";
                            };
                          }),
                        }))}
                        currencies={currenciesResult.data ?? []}
                        categories={(categoriesResult.data ?? []).map(c => ({ id: c.id, name: c.name }))}
                        onCreateOffer={createOffer}
                        onUpdateOffer={updateOffer}
                        onArchiveOffer={archiveOffer}
                        onDeleteOffer={deleteOffer}
                        onCloneOffer={cloneOffer}
                        onAddBonus={addOfferBonus}
                        onUpdateBonus={updateOfferBonus}
                        onDeleteBonus={deleteOfferBonus}
                        onAddElevatedEarning={addElevatedEarning}
                        onUpdateElevatedEarning={updateElevatedEarning}
                        onDeleteElevatedEarning={deleteElevatedEarning}
                        onAddIntroApr={addIntroApr}
                        onUpdateIntroApr={updateIntroApr}
                        onDeleteIntroApr={deleteIntroApr}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Archived Offers Section - only show when no active offers */}
              {(activeOfferResult.data ?? []).length === 0 && (archivedOffersResult.data ?? []).length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-700">
                  <OfferEditor
                    cardId={id}
                    cardDefaultEarnRate={card.default_earn_rate}
                    offer={null}
                    archivedOffers={(archivedOffersResult.data ?? []).map((offer) => ({
                      ...offer,
                      offer_type: offer.offer_type as "referral" | "affiliate" | "direct" | "nll" | "elevated" | "targeted",
                      bonuses: ((offer.card_offer_bonuses ?? []) as unknown[]).map((b: unknown) => {
                        const bonus = b as {
                          id: string;
                          spend_requirement_cents: number;
                          time_period: number;
                          time_period_unit: "days" | "months";
                          component_type: "points" | "cash" | "benefit";
                          points_amount: number | null;
                          currency_id: string | null;
                          cash_amount_cents: number | null;
                          benefit_description: string | null;
                          default_benefit_value_cents: number | null;
                        };
                        const currency = currenciesResult.data?.find(c => c.id === bonus.currency_id);
                        return { ...bonus, currency_name: currency?.name };
                      }),
                      elevated_earnings: ((offer.card_offer_elevated_earnings ?? []) as unknown[]).map((e: unknown) => {
                        const earning = e as {
                          id: string;
                          elevated_rate: number;
                          duration_months: number | null;
                          duration_unit: "days" | "months";
                          category_id: number | null;
                        };
                        const category = categoriesResult.data?.find(c => c.id === earning.category_id);
                        return { ...earning, category_name: category?.name };
                      }),
                      intro_aprs: ((offer.card_offer_intro_apr ?? []) as unknown[]).map((a: unknown) => {
                        return a as {
                          id: string;
                          apr_type: "purchases" | "balance_transfers" | "both";
                          apr_rate: number;
                          duration: number;
                          duration_unit: "days" | "months";
                        };
                      }),
                    }))}
                    currencies={currenciesResult.data ?? []}
                    categories={(categoriesResult.data ?? []).map(c => ({ id: c.id, name: c.name }))}
                    onCreateOffer={createOffer}
                    onUpdateOffer={updateOffer}
                    onArchiveOffer={archiveOffer}
                    onDeleteOffer={deleteOffer}
                    onCloneOffer={cloneOffer}
                    onAddBonus={addOfferBonus}
                    onUpdateBonus={updateOfferBonus}
                    onDeleteBonus={deleteOfferBonus}
                    onAddElevatedEarning={addElevatedEarning}
                    onUpdateElevatedEarning={updateElevatedEarning}
                    onDeleteElevatedEarning={deleteElevatedEarning}
                    onAddIntroApr={addIntroApr}
                    onUpdateIntroApr={updateIntroApr}
                    onDeleteIntroApr={deleteIntroApr}
                  />
                </div>
              )}
            </div>

            {/* Spend Bonuses and Welcome Bonuses have been moved to user-managed in the wallet page */}
            {/* Users now create their own bonuses per wallet card instance */}
          </>
        );
      })()}
    </div>
  );
}

