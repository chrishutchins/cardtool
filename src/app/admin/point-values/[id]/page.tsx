import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TemplateValuesEditor } from "./template-values-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

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
      .select("currency_id, value_cents")
      .eq("template_id", id),
  ]);

  if (!templateResult.data) {
    notFound();
  }

  const template = templateResult.data;
  const currencies = currenciesResult.data ?? [];
  const templateValues = valuesResult.data ?? [];

  // Build a map of currency values for this template
  const valueMap = new Map(templateValues.map((v) => [v.currency_id, v.value_cents]));

  // Build currency data with template values
  const currencyData = currencies.map((currency) => ({
    ...currency,
    template_value_cents: valueMap.get(currency.id) ?? currency.base_value_cents ?? 100,
    has_template_value: valueMap.has(currency.id),
  }));

  async function updateTemplateValue(currencyId: string, valueCents: number) {
    "use server";
    const supabase = await createClient();
    
    await supabase.from("template_currency_values").upsert(
      {
        template_id: id,
        currency_id: currencyId,
        value_cents: valueCents,
      },
      { onConflict: "template_id,currency_id" }
    );
    
    revalidatePath(`/admin/point-values/${id}`);
  }

  async function updateTemplateInfo(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
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

