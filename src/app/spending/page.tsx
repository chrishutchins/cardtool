import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SpendingEditor } from "@/components/spending-editor";
import { UserHeader } from "@/components/user-header";

export default async function SpendingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get all categories with defaults and user's custom values
  const { data: categories } = await supabase
    .from("earning_categories")
    .select("id, name, slug")
    .order("name");

  const { data: spendingDefaults } = await supabase
    .from("spending_defaults")
    .select("category_id, annual_spend_cents");

  const { data: userSpending } = await supabase
    .from("user_category_spend")
    .select("category_id, annual_spend_cents")
    .eq("user_id", user.id);

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

    revalidatePath("/spending");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Spending</h1>
          <p className="text-zinc-400 mt-1">
            Enter your annual spending by category to calculate optimal card usage
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400 mb-6">
            Defaults are based on average US consumer data. Customize to match your actual spending.
          </p>
          <SpendingEditor
            categories={spendingData}
            onUpdate={updateCategorySpend}
          />
        </div>
      </div>
    </div>
  );
}

