import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source_url: string | null;
  is_default: boolean;
  display_order: number;
}

interface Currency {
  id: string;
  name: string;
  code: string;
  base_value_cents: number | null;
}

interface TemplateValue {
  currency_id: string;
  value_cents: number;
}

export default async function AdminPointValuesPage() {
  const supabase = await createClient();

  const [templatesResult, currenciesResult] = await Promise.all([
    supabase
      .from("point_value_templates")
      .select("*")
      .order("display_order"),
    supabase
      .from("reward_currencies")
      .select("id, name, code, base_value_cents")
      .order("name"),
  ]);

  const templates = (templatesResult.data ?? []) as Template[];
  const currencies = (currenciesResult.data ?? []) as Currency[];

  async function createTemplate(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
    const name = formData.get("name") as string;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const description = formData.get("description") as string;
    const sourceUrl = formData.get("source_url") as string;
    
    // Get max display order
    const { data: maxOrder } = await supabase
      .from("point_value_templates")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();
    
    const displayOrder = (maxOrder?.display_order ?? 0) + 1;
    
    // Insert the template and get the ID
    const { data: newTemplate, error: insertError } = await supabase
      .from("point_value_templates")
      .insert({
        name,
        slug,
        description: description || null,
        source_url: sourceUrl || null,
        is_default: false,
        display_order: displayOrder,
      })
      .select("id")
      .single();
    
    if (insertError || !newTemplate) {
      console.error("Failed to create template:", insertError);
      revalidatePath("/admin/point-values");
      return;
    }
    
    const templateId = newTemplate.id;
    
    // Get all currencies to build the code->id mapping
    const { data: allCurrencies } = await supabase
      .from("reward_currencies")
      .select("id, code");
    
    const codeToId = new Map((allCurrencies ?? []).map((c) => [c.code, c.id]));
    
    // If source URL provided, auto-fetch values
    if (sourceUrl) {
      try {
        // Get the host from headers for the API call
        const headersList = await headers();
        const host = headersList.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        
        const response = await fetch(`${protocol}://${host}/api/scrape-point-values`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: sourceUrl }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const scrapedValues = data.values as Array<{
            sourceName: string;
            value: number;
            matchedCode: string | null;
          }>;
          
          // Build upsert data for matched values
          const upsertData = scrapedValues
            .filter((v) => v.matchedCode && codeToId.has(v.matchedCode))
            .map((v) => ({
              template_id: templateId,
              currency_id: codeToId.get(v.matchedCode!)!,
              value_cents: v.value,
            }));
          
          if (upsertData.length > 0) {
            await supabase.from("template_currency_values").upsert(
              upsertData,
              { onConflict: "template_id,currency_id" }
            );
            console.log(`[CREATE_TEMPLATE] Auto-imported ${upsertData.length} values from ${sourceUrl}`);
          }
        }
      } catch (err) {
        console.error("[CREATE_TEMPLATE] Failed to auto-fetch values:", err);
        // Don't fail template creation if scraping fails
      }
    }
    
    revalidatePath("/admin/point-values");
    redirect(`/admin/point-values/${templateId}`);
  }

  async function deleteTemplate(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const templateId = formData.get("template_id") as string;
    
    await supabase.from("point_value_templates").delete().eq("id", templateId);
    revalidatePath("/admin/point-values");
  }

  async function setDefaultTemplate(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const templateId = formData.get("template_id") as string;
    
    // Clear all defaults first
    await supabase.from("point_value_templates").update({ is_default: false }).neq("id", "");
    // Set the new default
    await supabase.from("point_value_templates").update({ is_default: true }).eq("id", templateId);
    
    revalidatePath("/admin/point-values");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Point Value Templates</h1>
        <p className="text-zinc-400 mt-1">
          Manage different sources for point valuations (e.g., TPG, NerdWallet)
        </p>
      </div>

      {/* Create New Template */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Create New Template</h2>
        <form action={createTemplate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                placeholder="e.g., NerdWallet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Source URL
              </label>
              <input
                type="url"
                name="source_url"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                placeholder="https://..."
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              placeholder="Point valuations from..."
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
          >
            Create Template
          </button>
        </form>
      </div>

      {/* Templates List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Source</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">Default</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/point-values/${template.id}`}
                    className="text-white font-medium hover:text-amber-400 transition-colors"
                  >
                    {template.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">
                  {template.description || "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {template.source_url ? (
                    <a
                      href={template.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300"
                    >
                      Link ↗
                    </a>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {template.is_default ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      Default
                    </span>
                  ) : (
                    <form action={setDefaultTemplate} className="inline">
                      <input type="hidden" name="template_id" value={template.id} />
                      <button
                        type="submit"
                        className="text-zinc-500 hover:text-white text-sm transition-colors"
                      >
                        Set Default
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/point-values/${template.id}`}
                      className="text-amber-400 hover:text-amber-300 text-sm"
                    >
                      Edit Values
                    </Link>
                    {!template.is_default && (
                      <form action={deleteTemplate} className="inline">
                        <input type="hidden" name="template_id" value={template.id} />
                        <button
                          type="submit"
                          className="text-red-400 hover:text-red-300 text-sm ml-3"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

