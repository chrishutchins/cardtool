import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { ComparisonTable } from "./comparison-table";

export default async function ComparePage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get all active cards with their details
  const { data: allCards } = await supabase
    .from("cards")
    .select(`
      id,
      name,
      slug,
      annual_fee,
      default_earn_rate,
      primary_currency_id,
      issuers:issuer_id (id, name),
      primary_currency:reward_currencies!cards_primary_currency_id_fkey (
        id, name, code, base_value_cents, currency_type
      )
    `)
    .eq("is_active", true)
    .order("name");

  // Get all earning rules
  const { data: allEarningRules } = await supabase
    .from("card_earning_rules")
    .select("card_id, category_id, rate, booking_method");

  // Get user's wallet cards
  const { data: userWallet } = await supabase
    .from("user_wallets")
    .select("card_id")
    .eq("user_id", user.id);

  const userCardIds = new Set(userWallet?.map((w) => w.card_id) ?? []);

  // Get user's custom currency values
  const { data: userCurrencyValues } = await supabase
    .from("user_currency_values")
    .select("currency_id, value_cents")
    .eq("user_id", user.id);

  const userValuesByCurrency = new Map(
    userCurrencyValues?.map((v) => [v.currency_id, v.value_cents]) ?? []
  );

  // Get all categories
  const { data: allCategories } = await supabase
    .from("earning_categories")
    .select("id, name, slug, parent_category_id, excluded_by_default")
    .order("name");

  // Build earning rules map: cardId -> categoryId -> rate
  const earningRulesMap: Record<string, Record<number, number>> = {};
  for (const rule of allEarningRules ?? []) {
    // Only use 'any' (direct) rules for base comparison
    if (rule.booking_method !== "any") continue;
    if (!earningRulesMap[rule.card_id]) {
      earningRulesMap[rule.card_id] = {};
    }
    earningRulesMap[rule.card_id][rule.category_id] = rule.rate;
  }

  // Transform cards for the client component
  const cardsForTable = (allCards ?? []).map((card) => {
    const currency = card.primary_currency;
    const pointValue = currency?.id 
      ? userValuesByCurrency.get(currency.id) ?? currency.base_value_cents ?? 1
      : 1;

    return {
      id: card.id,
      name: card.name,
      slug: card.slug,
      annualFee: card.annual_fee,
      defaultEarnRate: card.default_earn_rate ?? 1,
      issuerName: card.issuers?.name ?? "Unknown",
      currencyCode: currency?.code ?? "???",
      currencyName: currency?.name ?? "Unknown",
      pointValue,
      isOwned: userCardIds.has(card.id),
      earningRates: earningRulesMap[card.id] ?? {},
    };
  });

  // Transform categories for the client component
  const categoriesForTable = (allCategories ?? [])
    .filter((cat) => !cat.excluded_by_default)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentCategoryId: cat.parent_category_id,
    }));

  // Default category slugs to show
  const defaultCategorySlugs = [
    "gas",
    "grocery",
    "dining",
    "all-travel",
    "flights",
    "hotels",
    "streaming",
    "amazon",
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Compare Cards</h1>
          <p className="text-zinc-400 mt-1">
            See effective earning rates across all your cards
          </p>
        </div>

        <ComparisonTable
          cards={cardsForTable}
          categories={categoriesForTable}
          defaultCategorySlugs={defaultCategorySlugs}
        />
      </div>
    </div>
  );
}

