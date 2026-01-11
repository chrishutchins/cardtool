import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CurrencyForm } from "./currency-form";
import { CurrenciesTable } from "./currencies-table";
import { Enums } from "@/lib/database.types";

export default async function CurrenciesPage() {
  const supabase = createClient();
  const { data: currencies, error } = await supabase
    .from("reward_currencies")
    .select("*")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading currencies: {error.message}</div>;
  }

  async function createCurrency(formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const currency_type = formData.get("currency_type") as Enums<"reward_currency_type">;
    const base_value_cents = formData.get("base_value_cents")
      ? parseFloat(formData.get("base_value_cents") as string)
      : null;
    const cash_out_value_cents = formData.get("cash_out_value_cents")
      ? parseFloat(formData.get("cash_out_value_cents") as string)
      : null;
    const notes = (formData.get("notes") as string | null) || null;
    const program_name = (formData.get("program_name") as string | null) || null;
    const alliance = (formData.get("alliance") as string | null) || null;
    const expiration_policy = (formData.get("expiration_policy") as string | null) || null;
    const is_transferable = formData.get("is_transferable") === "on";
    const transfer_increment = formData.get("transfer_increment")
      ? parseInt(formData.get("transfer_increment") as string)
      : 1000;

    await supabase.from("reward_currencies").insert({
      name,
      code,
      currency_type,
      base_value_cents,
      cash_out_value_cents,
      notes,
      program_name,
      alliance,
      expiration_policy,
      is_transferable,
      transfer_increment,
    });
    revalidatePath("/admin/currencies");
  }

  async function deleteCurrency(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("reward_currencies").delete().eq("id", id);
    revalidatePath("/admin/currencies");
  }

  async function updateCurrency(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const currency_type = formData.get("currency_type") as Enums<"reward_currency_type">;
    const base_value_cents = formData.get("base_value_cents")
      ? parseFloat(formData.get("base_value_cents") as string)
      : null;
    const cash_out_value_cents = formData.get("cash_out_value_cents")
      ? parseFloat(formData.get("cash_out_value_cents") as string)
      : null;
    const notes = (formData.get("notes") as string | null) || null;
    const program_name = (formData.get("program_name") as string | null) || null;
    const alliance = (formData.get("alliance") as string | null) || null;
    const expiration_policy = (formData.get("expiration_policy") as string | null) || null;
    const is_transferable = formData.get("is_transferable") === "on";
    const transfer_increment = formData.get("transfer_increment")
      ? parseInt(formData.get("transfer_increment") as string)
      : 1000;

    await supabase.from("reward_currencies").update({
      name,
      code,
      currency_type,
      base_value_cents,
      cash_out_value_cents,
      notes,
      program_name,
      alliance,
      expiration_policy,
      is_transferable,
      transfer_increment,
    }).eq("id", id);
    revalidatePath("/admin/currencies");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Reward Currencies</h1>
      </div>

      {/* Add New Currency Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Currency</h2>
        <CurrencyForm action={createCurrency} />
      </div>

      {/* Currencies Table */}
      <CurrenciesTable
        currencies={currencies ?? []}
        onDelete={deleteCurrency}
        onUpdate={updateCurrency}
      />
    </div>
  );
}

