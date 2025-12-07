import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PointValuesEditor } from "@/components/point-values-editor";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { TemplateSelector } from "@/components/template-selector";

export default async function PointValuesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get all templates, currencies, user's selected template, user's custom values, and template values
  const [
    templatesResult,
    currenciesResult,
    userSettingsResult,
    userCurrencyValuesResult,
  ] = await Promise.all([
    supabase
      .from("point_value_templates")
      .select("id, name, slug, description, source_url, is_default")
      .order("display_order"),
    supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type, base_value_cents")
      .order("name"),
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", user.id),
  ]);

  const templates = templatesResult.data ?? [];
  const currencies = currenciesResult.data ?? [];
  const userOverrides = userCurrencyValuesResult.data ?? [];
  
  // Get the default template
  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
  
  // User's selected template (or default if not set)
  const selectedTemplateId = userSettingsResult.data?.selected_template_id ?? defaultTemplate?.id ?? null;
  
  // Fetch template values for the selected template
  const { data: templateValues } = selectedTemplateId
    ? await supabase
        .from("template_currency_values")
        .select("currency_id, value_cents")
        .eq("template_id", selectedTemplateId)
    : { data: [] };
  
  // Build maps for quick lookup
  // Note: Supabase returns NUMERIC as strings, so parse them explicitly
  const templateValueMap = new Map((templateValues ?? []).map((tv) => [tv.currency_id, parseFloat(String(tv.value_cents))]));
  const userOverrideMap = new Map(userOverrides.map((uv) => [uv.currency_id, parseFloat(String(uv.value_cents))]));

  // Build currency data with effective values
  // Priority: user override > template value > base currency value
  const currencyData = currencies.map((currency) => {
    const userValue = userOverrideMap.get(currency.id);
    const templateValue = templateValueMap.get(currency.id);
    const baseValue = parseFloat(String(currency.base_value_cents)) || 100;
    
    return {
      ...currency,
      effective_value_cents: userValue ?? templateValue ?? baseValue,
      template_value_cents: templateValue ?? baseValue,
      is_custom: userValue !== undefined,
    };
  });

  async function updateSelectedTemplate(templateId: string | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();

    if (templateId === null) {
      await supabase
        .from("user_point_value_settings")
        .delete()
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_point_value_settings").upsert(
        {
          user_id: user.id,
          selected_template_id: templateId,
        },
        { onConflict: "user_id" }
      );
    }

    revalidatePath("/point-values");
  }

  async function updateCurrencyValue(currencyId: string, valueCents: number | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();

    if (valueCents === null) {
      // Delete custom value (revert to template default)
      await supabase
        .from("user_currency_values")
        .delete()
        .eq("user_id", user.id)
        .eq("currency_id", currencyId);
    } else {
      // Upsert custom value
      await supabase.from("user_currency_values").upsert(
        {
          user_id: user.id,
          currency_id: currencyId,
          value_cents: valueCents,
        },
        { onConflict: "user_id,currency_id" }
      );
    }

    revalidatePath("/point-values");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Point Values</h1>
          <p className="text-zinc-400 mt-1">
            Choose a valuation source and customize individual values
          </p>
        </div>

        {/* Template Selector */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Valuation Source</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Select a baseline valuation source. Your personal overrides will apply on top of the selected template.
          </p>
          <TemplateSelector
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelect={updateSelectedTemplate}
          />
          {selectedTemplate?.source_url && (
            <p className="mt-3 text-sm text-zinc-500">
              Source:{" "}
              <a
                href={selectedTemplate.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300"
              >
                {selectedTemplate.name} ↗
              </a>
            </p>
          )}
        </div>

        {/* Currency Values Editor */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Currency Values</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Values are in cents per point. Click to override the template value. 
            <span className="text-amber-400"> Highlighted values</span> are your personal overrides.
          </p>
          <PointValuesEditor
            currencies={currencyData}
            onUpdate={updateCurrencyValue}
          />
        </div>
      </div>
    </div>
  );
}
