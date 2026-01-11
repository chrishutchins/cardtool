import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SiteConfigForm } from "./site-config-form";
import { SiteConfigsTable } from "./site-configs-table";

export default async function SiteConfigsPage() {
  const supabase = createClient();
  
  const { data: configs, error } = await supabase
    .from("site_configs")
    .select("*")
    .order("name");

  const { data: currencies } = await supabase
    .from("reward_currencies")
    .select("code, name")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading site configs: {error.message}</div>;
  }

  async function createConfig(formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const currency_code = formData.get("currency_code") as string;
    const domain = formData.get("domain") as string;
    const balance_page_url = (formData.get("balance_page_url") as string) || null;
    const selector = formData.get("selector") as string;
    const parse_regex = (formData.get("parse_regex") as string) || "[\\d,]+";

    await supabase.from("site_configs").insert({
      name,
      currency_code,
      domain,
      balance_page_url,
      selector,
      parse_regex,
      is_active: true,
    });
    revalidatePath("/admin/site-configs");
  }

  async function deleteConfig(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("site_configs").delete().eq("id", id);
    revalidatePath("/admin/site-configs");
  }

  async function updateConfig(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const currency_code = formData.get("currency_code") as string;
    const domain = formData.get("domain") as string;
    const balance_page_url = (formData.get("balance_page_url") as string) || null;
    const selector = formData.get("selector") as string;
    const parse_regex = (formData.get("parse_regex") as string) || "[\\d,]+";
    const is_active = formData.get("is_active") === "on";

    await supabase.from("site_configs").update({
      name,
      currency_code,
      domain,
      balance_page_url,
      selector,
      parse_regex,
      is_active,
    }).eq("id", id);
    revalidatePath("/admin/site-configs");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Balance Importing</h1>
          <p className="text-zinc-400 mt-1">
            Configure sites for the Tampermonkey balance importer script
          </p>
        </div>
      </div>

      {/* Add New Config Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Site Config</h2>
        <SiteConfigForm 
          action={createConfig} 
          currencies={currencies ?? []}
        />
      </div>

      {/* Configs Table */}
      <SiteConfigsTable
        configs={configs ?? []}
        currencies={currencies ?? []}
        onDelete={deleteConfig}
        onUpdate={updateConfig}
      />
    </div>
  );
}
