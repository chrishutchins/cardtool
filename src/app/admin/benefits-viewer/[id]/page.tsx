import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { BenefitsViewerClient } from "./viewer-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BenefitsViewerCardPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();

  const { data: allCards } = await supabase
    .from("card_with_currency")
    .select("id")
    .gt("annual_fee", 0)
    .order("issuer_name")
    .order("name");

  const cardIds = (allCards ?? []).map((c) => c.id).filter((cid): cid is string => cid != null);
  const currentIndex = cardIds.indexOf(id);
  if (currentIndex === -1) {
    notFound();
  }

  const [
    cardResult,
    rulesResult,
    capsResult,
    capCategoriesResult,
    creditsResult,
    spreadsheetBenefitsResult,
    productionBenefitsResult,
    kudosCardsResult,
    ignoredResult,
  ] = await Promise.all([
    supabase.from("card_with_currency").select("*").eq("id", id).single(),
    supabase
      .from("card_earning_rules")
      .select("id, category_id, rate, has_cap, cap_amount, cap_unit, cap_period, post_cap_rate, notes, booking_method, brand_name, earning_categories(id, name)")
      .eq("card_id", id),
    supabase.from("card_caps").select("*").eq("card_id", id),
    supabase
      .from("card_cap_categories")
      .select("cap_id, category_id, cap_amount, earning_categories(id, name), card_caps!inner(card_id)")
      .eq("card_caps.card_id", id),
    supabase
      .from("card_credits")
      .select("id, name, brand_name, credit_count, reset_cycle, renewal_period_months, default_value_cents, default_quantity, unit_name, is_active, notes, must_be_earned")
      .eq("card_id", id)
      .order("name"),
    supabase
      .from("spreadsheet_card_benefits")
      .select("id, title, description, detail, limitations, estimated_annual_value, display_order")
      .eq("card_id", id)
      .order("display_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("card_benefits")
      .select("id, title, description, detail, limitations, default_value, display_order")
      .eq("card_id", id)
      .order("display_order", { ascending: true, nullsFirst: false }),
    supabase.from("kudos_cards").select("id").eq("cardtool_card_id", id).limit(1),
    supabase.from("benefits_viewer_ignored").select("source, source_id").eq("card_id", id),
  ]);

  if (cardResult.error || !cardResult.data) {
    notFound();
  }

  const card = cardResult.data;
  const kudosCardId = kudosCardsResult.data?.[0]?.id ?? null;

  const ignoredSet = new Set(
    (ignoredResult.data ?? []).map((row) => `${row.source}:${row.source_id}`)
  );

  let kudosBenefits: { id: string; title: string | null; name: string | null; description: string | null; detail: string | null; limitations: string | null }[] = [];
  let kudosCredits: { id: string; header: string; amount: number | null; frequency: string | null; limitations: string | null; label: string | null; currency: string | null }[] = [];
  if (kudosCardId) {
    const [benefitsRes, creditsRes] = await Promise.all([
      supabase
        .from("kudos_benefits")
        .select("id, title, name, description, detail, limitations")
        .eq("card_id", kudosCardId),
      supabase
        .from("kudos_cash_credits")
        .select("id, header, amount, frequency, limitations, label, currency")
        .eq("card_id", kudosCardId)
        .order("sort_order", { ascending: true, nullsFirst: true }),
    ]);
    kudosBenefits = (benefitsRes.data ?? []).filter((b) => !ignoredSet.has(`kudos_benefit:${b.id}`));
    kudosCredits = (creditsRes.data ?? []).filter((c) => !ignoredSet.has(`kudos_credit:${c.id}`));
  }

  const spreadsheetBenefitsFiltered = (spreadsheetBenefitsResult.data ?? []).filter(
    (b) => !ignoredSet.has(`spreadsheet:${b.id}`)
  );

  type CategoryAssoc = { cap_id: string; cap_amount: number | null; earning_categories: { id: number; name: string } | null };
  const caps = (capsResult.data ?? []).map((cap) => {
    const categoryAssociations = ((capCategoriesResult.data ?? []) as unknown as CategoryAssoc[]).filter(
      (cc) => cc.cap_id === cap.id
    );
    return {
      ...cap,
      categories: categoryAssociations
        .map((cc) => ({
          ...cc.earning_categories!,
          cap_amount: cc.cap_amount,
        }))
        .filter((cat): cat is { id: number; name: string; cap_amount: number | null } => cat.id !== undefined),
    };
  });

  const prevId = currentIndex > 0 ? cardIds[currentIndex - 1]! : null;
  const nextId = currentIndex < cardIds.length - 1 ? cardIds[currentIndex + 1]! : null;

  async function ignoreItem(formData: FormData) {
    "use server";
    const supabase = createClient();
    const cardId = formData.get("cardId") as string;
    const source = formData.get("source") as "spreadsheet" | "kudos_benefit" | "kudos_credit";
    const sourceId = formData.get("sourceId") as string;
    await supabase.from("benefits_viewer_ignored").upsert(
      { card_id: cardId, source, source_id: sourceId },
      { onConflict: "card_id,source,source_id" }
    );
    revalidatePath(`/admin/benefits-viewer/${cardId}`);
    redirect(`/admin/benefits-viewer/${cardId}`);
  }

  async function addToCardBenefits(formData: FormData) {
    "use server";
    const supabase = createClient();
    const cardId = formData.get("cardId") as string;
    const source = formData.get("source") as "spreadsheet" | "kudos_benefit" | "kudos_credit";
    const sourceId = formData.get("sourceId") as string;

    if (source === "spreadsheet") {
      // Spreadsheet columns: A=title, B=default_value (stored as description), C=description (stored as estimated_annual_value)
      const { data: row } = await supabase
        .from("spreadsheet_card_benefits")
        .select("title, description, estimated_annual_value, limitations")
        .eq("id", sourceId)
        .single();
      if (row) {
        await supabase.from("card_benefits").insert({
          card_id: cardId,
          source: "spreadsheet",
          title: row.title,
          description: row.estimated_annual_value,  // Column C: actual description text
          default_value: row.description,            // Column B: the number value
          limitations: row.limitations,
        });
      }
    } else if (source === "kudos_benefit") {
      const { data: row } = await supabase
        .from("kudos_benefits")
        .select("title, name, description, detail, limitations")
        .eq("id", sourceId)
        .single();
      if (row) {
        await supabase.from("card_benefits").insert({
          card_id: cardId,
          source: "kudos",
          title: row.title ?? row.name,
          description: row.description,
          detail: row.detail,
          limitations: row.limitations,
        });
      }
    } else if (source === "kudos_credit") {
      const { data: row } = await supabase
        .from("kudos_cash_credits")
        .select("header, amount, frequency, limitations, label, currency")
        .eq("id", sourceId)
        .single();
      if (row) {
        const desc = [
          row.amount != null && row.currency ? `${row.currency === "USD" ? "$" : ""}${row.amount}` : null,
          row.frequency,
          row.limitations,
        ]
          .filter(Boolean)
          .join(" / ");
        await supabase.from("card_benefits").insert({
          card_id: cardId,
          source: "kudos",
          title: row.header,
          description: desc || null,
          limitations: row.limitations,
        });
      }
    }
    revalidatePath(`/admin/benefits-viewer/${cardId}`);
    redirect(`/admin/benefits-viewer/${cardId}`);
  }

  async function deleteProductionBenefit(formData: FormData) {
    "use server";
    const benefitId = formData.get("benefitId") as string;
    if (!benefitId) return;
    const supabase = createClient();
    await supabase.from("card_benefits").delete().eq("id", benefitId);
    revalidatePath(`/admin/benefits-viewer/${id}`);
    redirect(`/admin/benefits-viewer/${id}`);
  }

  async function updateProductionBenefit(formData: FormData) {
    "use server";
    const benefitId = formData.get("benefitId") as string | null;
    const cardId = formData.get("cardId") as string | null;
    if (!benefitId) return;
    const supabase = createClient();
    const title = (formData.get("title") as string)?.trim() || null;
    const description = (formData.get("description") as string)?.trim() || null;
    const default_value = (formData.get("default_value") as string)?.trim() || null;
    const limitations = (formData.get("limitations") as string)?.trim() || null;
    const { error } = await supabase
      .from("card_benefits")
      .update({
        title,
        description,
        default_value,
        limitations,
        detail: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", benefitId);
    if (error) throw new Error(`Failed to update benefit: ${error.message}`);
    const pathId = cardId ?? id;
    revalidatePath(`/admin/benefits-viewer/${pathId}`);
    // No redirect: caller uses router.refresh() so list and edit stay in sync
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/cards" className="text-sm text-zinc-400 hover:text-white">
          ← Admin
        </Link>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          {prevId ? (
            <Link href={`/admin/benefits-viewer/${prevId}`} className="px-2 py-1 rounded hover:bg-zinc-800">
              Prev
            </Link>
          ) : (
            <span className="px-2 py-1 text-zinc-600">Prev</span>
          )}
          <span className="tabular-nums">
            {currentIndex + 1} / {cardIds.length}
          </span>
          {nextId ? (
            <Link href={`/admin/benefits-viewer/${nextId}`} className="px-2 py-1 rounded hover:bg-zinc-800">
              Next
            </Link>
          ) : (
            <span className="px-2 py-1 text-zinc-600">Next</span>
          )}
        </div>
      </div>

      <BenefitsViewerClient
        cardId={id}
        card={card as { id: string; name: string | null; issuer_name: string | null }}
        cardIds={cardIds}
        currentIndex={currentIndex}
        rules={(rulesResult.data ?? []) as unknown as { id: string; category_id: number; rate: number; has_cap: boolean; cap_amount: number | null; cap_unit: string | null; cap_period: string | null; post_cap_rate: number | null; notes: string | null; booking_method: string | null; brand_name: string | null; earning_categories: { id: number; name: string } | null }[]}
        caps={caps}
        credits={(creditsResult.data ?? []) as { id: string; name: string; brand_name: string | null; credit_count: number; reset_cycle: string; renewal_period_months: number | null; default_value_cents: number | null; default_quantity: number | null; unit_name: string | null; is_active: boolean; notes: string | null; must_be_earned: boolean }[]}
        spreadsheetBenefits={spreadsheetBenefitsFiltered as { id: string; title: string | null; description: string | null; detail: string | null; limitations: string | null; estimated_annual_value: string | null; display_order: number | null }[]}
        productionBenefits={(productionBenefitsResult.data ?? []) as { id: string; title: string | null; description: string | null; detail: string | null; limitations: string | null; default_value: string | null }[]}
        kudosBenefits={kudosBenefits}
        kudosCredits={kudosCredits}
        onIgnore={ignoreItem}
        onAddToCardBenefits={addToCardBenefits}
        onDeleteProductionBenefit={deleteProductionBenefit}
        onUpdateProductionBenefit={updateProductionBenefit}
      />
    </div>
  );
}
