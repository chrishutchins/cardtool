import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SpendingEditor } from "@/components/spending-editor";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";

export const metadata: Metadata = {
  title: "Spending | CardTool",
  description: "Set your annual spending by category",
};

// Categories to hide from the spending page (derived/payment overlay, not directly trackable)
const HIDDEN_CATEGORY_SLUGS = ["mobile-pay", "over-5k", "paypal"];

export default async function SpendingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get effective user ID for data reads (may be emulated user if admin is emulating)
  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();
  
  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  // Get all categories with defaults and user's custom values
  const [categoriesResult, spendingDefaultsResult, userSpendingResult, largePurchaseCategoriesResult, everythingElseResult] = await Promise.all([
    supabase
      .from("earning_categories")
      .select("id, name, slug")
      .order("name"),
    supabase
      .from("spending_defaults")
      .select("category_id, annual_spend_cents, large_purchase_spend_cents"),
    supabase
      .from("user_category_spend")
      .select("category_id, annual_spend_cents, large_purchase_spend_cents")
      .eq("user_id", effectiveUserId),
    supabase
      .from("user_large_purchase_categories")
      .select("category_id")
      .eq("user_id", effectiveUserId),
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "everything-else")
      .single(),
  ]);

  const categories = categoriesResult.data;
  const spendingDefaults = spendingDefaultsResult.data;
  const userSpending = userSpendingResult.data;
  const largePurchaseCategories = largePurchaseCategoriesResult.data;
  const everythingElseCategoryId = everythingElseResult.data?.id ?? null;

  // Determine which categories have >$5k tracking enabled
  // If user has no explicit selections, default to "Everything Else"
  const largePurchaseEnabledIds = new Set(
    (largePurchaseCategories ?? []).length > 0
      ? (largePurchaseCategories ?? []).map((l) => l.category_id)
      : everythingElseCategoryId ? [everythingElseCategoryId] : []
  );

  // Build spending data with effective values, filtering out hidden categories
  const spendingData = (categories ?? [])
    .filter((category) => !HIDDEN_CATEGORY_SLUGS.includes(category.slug))
    .map((category) => {
      const defaultSpend = spendingDefaults?.find(
        (sd) => sd.category_id === category.id
      );
      const userSpend = userSpending?.find(
        (us) => us.category_id === category.id
      );
      
      // Determine effective values
      const effectiveAnnualSpend = userSpend?.annual_spend_cents ?? defaultSpend?.annual_spend_cents ?? 0;
      const effectiveLargePurchaseSpend = userSpend?.large_purchase_spend_cents ?? defaultSpend?.large_purchase_spend_cents ?? 0;
      
      return {
        ...category,
        default_annual_spend_cents: defaultSpend?.annual_spend_cents ?? 0,
        default_large_purchase_spend_cents: defaultSpend?.large_purchase_spend_cents ?? 0,
        effective_annual_spend_cents: effectiveAnnualSpend,
        effective_large_purchase_spend_cents: effectiveLargePurchaseSpend,
        is_custom: !!userSpend,
        has_large_purchase_tracking: largePurchaseEnabledIds.has(category.id),
      };
    });

  async function updateCategorySpend(
    categoryId: number, 
    annualSpendCents: number | null,
    largePurchaseSpendCents?: number | null
  ) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();

    if (annualSpendCents === null && largePurchaseSpendCents === undefined) {
      // Delete custom value (revert to default)
      await supabase
        .from("user_category_spend")
        .delete()
        .eq("user_id", userId)
        .eq("category_id", categoryId);
    } else {
      // Build the update object - annual_spend_cents is required
      const updateData: {
        user_id: string;
        category_id: number;
        annual_spend_cents: number;
        large_purchase_spend_cents?: number;
      } = {
        user_id: userId,
        category_id: categoryId,
        annual_spend_cents: annualSpendCents ?? 0,
      };
      
      if (largePurchaseSpendCents !== undefined && largePurchaseSpendCents !== null) {
        updateData.large_purchase_spend_cents = largePurchaseSpendCents;
      }
      
      // Upsert custom value
      await supabase.from("user_category_spend").upsert(
        updateData,
        { onConflict: "user_id,category_id" }
      );
    }

    revalidatePath("/spending");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="flex-1 bg-zinc-950">
      <UserHeader isAdmin={isAdmin} emulationInfo={emulationInfo} />
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

