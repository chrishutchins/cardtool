import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TemplateValuesEditor } from "./template-values-editor";
import { UrlImporter } from "./url-importer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createClient();

  const [templateResult, currenciesResult, valuesResult] = await Promise.all([
    supabase
      .from("point_value_templates")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type, base_value_cents")
      .order("name"),
    supabase
      .from("template_currency_values")
      .select("currency_id, value_cents, is_manual")
      .eq("template_id", id),
  ]);

  if (!templateResult.data) {
    notFound();
  }

  const template = templateResult.data;
  const currencies = currenciesResult.data ?? [];
  const templateValues = valuesResult.data ?? [];

  // Build a map of currency values for this template
  // Note: Supabase returns NUMERIC as strings, so we parse them explicitly
  const valueMap = new Map(templateValues.map((v) => [
    v.currency_id, 
    { value: parseFloat(String(v.value_cents)), isManual: v.is_manual }
  ]));

  // Build currency data with template values
  // Default to 0¢ if no value set (makes it clear which weren't fetched)
  const currencyData = currencies.map((currency) => {
    const valueInfo = valueMap.get(currency.id);
    return {
      ...currency,
      template_value_cents: valueInfo?.value ?? 0,
      base_value_cents: parseFloat(String(currency.base_value_cents)) || 0,
      has_template_value: valueMap.has(currency.id),
      is_manual: valueInfo?.isManual ?? false,
    };
  });

  async function updateTemplateValue(currencyId: string, valueCents: number) {
    "use server";
    const supabase = createClient();
    
    // Setting value to 0 clears the manual override (deletes the row)
    // This allows the next sync to repopulate the value
    if (valueCents === 0) {
      await supabase
        .from("template_currency_values")
        .delete()
        .eq("template_id", id)
        .eq("currency_id", currencyId);
    } else {
      // Manual edits are marked as is_manual = true
      await supabase.from("template_currency_values").upsert(
        {
          template_id: id,
          currency_id: currencyId,
          value_cents: valueCents,
          is_manual: true,
        },
        { onConflict: "template_id,currency_id" }
      );
    }
    
    revalidatePath(`/admin/point-values/${id}`);
  }

  async function bulkUpdateTemplateValues(updates: Array<{ currencyId: string; valueCents: number }>) {
    "use server";
    const supabase = createClient();
    
    console.log("[IMPORT] Bulk updating template values:", {
      templateId: id,
      updateCount: updates.length,
      sample: updates.slice(0, 3),
    });
    
    // Imported values are marked as is_manual = false
    const upsertData = updates.map((u) => ({
      template_id: id,
      currency_id: u.currencyId,
      value_cents: u.valueCents,
      is_manual: false,
    }));
    
    const { error } = await supabase.from("template_currency_values").upsert(
      upsertData,
      { onConflict: "template_id,currency_id" }
    );
    
    if (error) {
      console.error("[IMPORT] Error upserting values:", error);
      throw new Error(`Failed to save values: ${error.message}`);
    }
    
    console.log("[IMPORT] Successfully saved", updates.length, "values");
    revalidatePath(`/admin/point-values/${id}`);
  }

  async function updateTemplateInfo(formData: FormData) {
    "use server";
    const supabase = createClient();
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const sourceUrl = formData.get("source_url") as string;
    
    await supabase
      .from("point_value_templates")
      .update({
        name,
        description: description || null,
        source_url: sourceUrl || null,
      })
      .eq("id", id);
    
    revalidatePath(`/admin/point-values/${id}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/point-values"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to Templates
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">{template.name}</h1>
        {template.description && (
          <p className="text-zinc-400 mt-1">{template.description}</p>
        )}
      </div>

      {/* Template Info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Template Settings</h2>
        <form action={updateTemplateInfo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={template.name}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Source URL
              </label>
              <input
                type="url"
                name="source_url"
                defaultValue={template.source_url ?? ""}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Description
            </label>
            <input
              type="text"
              name="description"
              defaultValue={template.description ?? ""}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* Import from URL */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          {template.source_url ? "Refresh from Source" : "Import from URL"}
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          {template.source_url ? (
            <>Check for updated values from the source. Changes will be shown for review before applying.</>
          ) : (
            <>
              Automatically pull point values from sites like{" "}
              <a href="https://frequentmiler.com/reasonable-redemption-values-rrvs/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
                Frequent Miler
              </a>.
            </>
          )}
        </p>
        <UrlImporter
          currencies={currencyData}
          sourceUrl={template.source_url}
          onImport={bulkUpdateTemplateValues}
        />
      </div>

      {/* Currency Values */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Currency Values</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Set point values in cents per point for this template.
        </p>
        <TemplateValuesEditor
          currencies={currencyData}
          onUpdate={updateTemplateValue}
        />
      </div>
    </div>
  );
}
