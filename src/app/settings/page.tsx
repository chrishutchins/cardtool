import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { PointValuesEditor } from "./point-values-editor";
import { SpendingEditor } from "./spending-editor";

export default async function SettingsPage() {
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

  // Get all categories with defaults and user's custom values
  const { data: categories } = await supabase
    .from("earning_categories")
    .select("id, name, slug, sort_order")
    .order("sort_order");

  const { data: spendingDefaults } = await supabase
    .from("spending_defaults")
    .select("category_id, annual_spend_cents");

  const { data: userSpending } = await supabase
    .from("user_category_spend")
    .select("category_id, annual_spend_cents")
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

  // Build spending data with effective values
  const spendingData = categories?.map((category) => {
    const defaultSpend = spendingDefaults?.find(
      (sd) => sd.category_id === category.id
    );
    const userSpend = userSpending?.find(
      (us) => us.category_id === category.id
    );
    return {
      ...category,
      default_annual_spend_cents: defaultSpend?.annual_spend_cents ?? 0,
      effective_annual_spend_cents:
        userSpend?.annual_spend_cents ?? defaultSpend?.annual_spend_cents ?? 0,
      is_custom: !!userSpend,
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

    revalidatePath("/settings");
  }

  async function updateCategorySpend(categoryId: number, annualSpendCents: number | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();

    if (annualSpendCents === null) {
      // Delete custom value (revert to default)
      await supabase
        .from("user_category_spend")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", categoryId);
    } else {
      // Upsert custom value
      await supabase.from("user_category_spend").upsert(
        {
          user_id: user.id,
          category_id: categoryId,
          annual_spend_cents: annualSpendCents,
        },
        { onConflict: "user_id,category_id" }
      );
    }

    revalidatePath("/settings");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link
            href="/wallet"
            className="text-sm text-zinc-400 hover:text-white mb-2 inline-block"
          >
            ← Back to Wallet
          </Link>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400 mt-1">
            Customize your point valuations and spending profile
          </p>
        </div>

        <div className="space-y-8">
          {/* Point Values Section */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              My Point Values
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Override default point valuations with your personal estimates.
              Values are in cents per point.
            </p>
            <PointValuesEditor
              currencies={currencyData}
              onUpdate={updateCurrencyValue}
            />
          </div>

          {/* Spending Profile Section */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              My Annual Spending
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Enter your annual spending by category to calculate optimal card
              usage. Defaults are based on average US consumer data.
            </p>
            <SpendingEditor
              categories={spendingData}
              onUpdate={updateCategorySpend}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

