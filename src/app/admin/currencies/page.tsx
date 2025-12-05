import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CurrencyForm } from "./currency-form";
import { CurrencyRow } from "./currency-row";

export default async function CurrenciesPage() {
  const supabase = await createClient();
  const { data: currencies, error } = await supabase
    .from("reward_currencies")
    .select("*")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading currencies: {error.message}</div>;
  }

  async function createCurrency(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const currency_type = formData.get("currency_type") as "points" | "cash" | "miles" | "other";
    const base_value_cents = formData.get("base_value_cents")
      ? parseFloat(formData.get("base_value_cents") as string)
      : null;
    const notes = formData.get("notes") as string || null;

    await supabase.from("reward_currencies").insert({
      name,
      code,
      currency_type,
      base_value_cents,
      notes,
    });
    revalidatePath("/admin/currencies");
  }

  async function deleteCurrency(id: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("reward_currencies").delete().eq("id", id);
    revalidatePath("/admin/currencies");
  }

  async function updateCurrency(id: string, formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const currency_type = formData.get("currency_type") as "points" | "cash" | "miles" | "other";
    const base_value_cents = formData.get("base_value_cents")
      ? parseFloat(formData.get("base_value_cents") as string)
      : null;
    const notes = formData.get("notes") as string || null;

    await supabase.from("reward_currencies").update({
      name,
      code,
      currency_type,
      base_value_cents,
      notes,
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Value (¢/unit)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {currencies?.map((currency) => (
              <CurrencyRow
                key={currency.id}
                currency={currency}
                onDelete={deleteCurrency}
                onUpdate={updateCurrency}
              />
            ))}
          </tbody>
        </table>
        {currencies?.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No currencies yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}

