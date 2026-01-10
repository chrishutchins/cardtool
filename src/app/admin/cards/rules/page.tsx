import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { RulesClient } from "./rules-client";

export default async function ApplicationRulesPage() {
  const supabase = createClient();

  const [rulesResult, issuersResult] = await Promise.all([
    supabase
      .from("application_rules")
      .select(`
        *,
        issuers:issuer_id (id, name, slug)
      `)
      .order("display_order")
      .order("name"),
    supabase.from("issuers").select("id, name, slug").order("name"),
  ]);

  const rules = rulesResult.data ?? [];
  const issuers = issuersResult.data ?? [];

  async function createRule(formData: FormData) {
    "use server";
    const supabase = createClient();

    const issuer_id = formData.get("issuer_id") as string;
    const rule_type = formData.get("rule_type") as "velocity" | "limit";
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;
    const card_limit = parseInt(formData.get("card_limit") as string);
    const card_type = formData.get("card_type") as string;
    const time_window = formData.get("time_window") ? parseInt(formData.get("time_window") as string) : null;
    const time_unit = (formData.get("time_unit") as string) || null;
    const counts_all_issuers = formData.get("counts_all_issuers") === "true";
    const charge_type = (formData.get("charge_type") as string) || "all";
    const requires_banking = formData.get("requires_banking") === "true";
    const display_order = formData.get("display_order") ? parseInt(formData.get("display_order") as string) : 0;

    await supabase.from("application_rules").insert({
      issuer_id,
      rule_type,
      name,
      description,
      card_limit,
      card_type,
      time_window,
      time_unit,
      counts_all_issuers,
      charge_type,
      requires_banking,
      display_order,
    });

    revalidatePath("/admin/cards/rules");
  }

  async function updateRule(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const issuer_id = formData.get("issuer_id") as string;
    const rule_type = formData.get("rule_type") as "velocity" | "limit";
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;
    const card_limit = parseInt(formData.get("card_limit") as string);
    const card_type = formData.get("card_type") as string;
    const time_window = formData.get("time_window") ? parseInt(formData.get("time_window") as string) : null;
    const time_unit = (formData.get("time_unit") as string) || null;
    const counts_all_issuers = formData.get("counts_all_issuers") === "true";
    const charge_type = (formData.get("charge_type") as string) || "all";
    const requires_banking = formData.get("requires_banking") === "true";
    const display_order = formData.get("display_order") ? parseInt(formData.get("display_order") as string) : 0;
    const is_active = formData.get("is_active") === "true";

    await supabase
      .from("application_rules")
      .update({
        issuer_id,
        rule_type,
        name,
        description,
        card_limit,
        card_type,
        time_window,
        time_unit,
        counts_all_issuers,
        charge_type,
        requires_banking,
        display_order,
        is_active,
      })
      .eq("id", id);

    revalidatePath("/admin/cards/rules");
  }

  async function deleteRule(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("application_rules").delete().eq("id", id);
    revalidatePath("/admin/cards/rules");
  }

  async function toggleRuleActive(id: string, isActive: boolean) {
    "use server";
    const supabase = createClient();
    await supabase.from("application_rules").update({ is_active: isActive }).eq("id", id);
    revalidatePath("/admin/cards/rules");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Application Rules</h1>
          <p className="text-zinc-400 mt-1">
            Manage velocity and limit rules for credit card applications
          </p>
        </div>
      </div>

      <RulesClient
        rules={rules}
        issuers={issuers}
        onCreateRule={createRule}
        onUpdateRule={updateRule}
        onDeleteRule={deleteRule}
        onToggleActive={toggleRuleActive}
      />
    </div>
  );
}

