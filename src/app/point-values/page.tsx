import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PointValuesEditor } from "@/components/point-values-editor";
import { UserHeader } from "@/components/user-header";

export default async function PointValuesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get all currencies with user's custom values
  const { data: currencies } = await supabase
    .from("reward_currencies")
    .select("id, name, code, currency_type, base_value_cents")
    .order("name");

  const { data: userCurrencyValues } = await supabase
    .from("user_currency_values")
    .select("currency_id, value_cents")
    .eq("user_id", user.id);

  // Build currency data with effective values
  const currencyData = currencies?.map((currency) => {
    const userValue = userCurrencyValues?.find(
      (uv) => uv.currency_id === currency.id
    );
    return {
      ...currency,
      effective_value_cents: userValue?.value_cents ?? currency.base_value_cents,
      is_custom: !!userValue,
    };
  }) ?? [];

  async function updateCurrencyValue(currencyId: string, valueCents: number | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();

    if (valueCents === null) {
      // Delete custom value (revert to default)
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

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Point Values</h1>
          <p className="text-zinc-400 mt-1">
            Override default point valuations with your personal estimates
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400 mb-6">
            Values are in cents per point. Customize based on how you typically redeem.
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

