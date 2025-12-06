import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { ComparisonTable } from "./comparison-table";
import { isAdminEmail } from "@/lib/admin";

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

  // Get all category bonuses (card_caps) with their categories
  const { data: allCategoryBonuses } = await supabase
    .from("card_caps")
    .select(`
      id,
      card_id,
      cap_type,
      elevated_rate,
      post_cap_rate,
      cap_amount,
      card_cap_categories (category_id)
    `);

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

  // Build a map of parent category IDs for inheritance lookup
  const parentCategoryMap = new Map<number, number>();
  for (const cat of allCategories ?? []) {
    if (cat.parent_category_id) {
      parentCategoryMap.set(cat.id, cat.parent_category_id);
    }
  }

  // Build category bonuses map: cardId -> categoryId -> elevated_rate
  // This includes both specific categories and "all_categories" bonuses
  const categoryBonusesMap: Record<string, Record<number, number>> = {};
  const allCategoriesBonusMap: Record<string, number> = {}; // cardId -> rate for all_categories bonuses
  
  type BonusData = {
    id: string;
    card_id: string;
    cap_type: string;
    elevated_rate: number | null;
    post_cap_rate: number | null;
    cap_amount: number | null;
    card_cap_categories: { category_id: number }[] | null;
  };
  for (const bonus of (allCategoryBonuses ?? []) as unknown as BonusData[]) {
    if (bonus.cap_type === "all_categories") {
      // For all_categories, store the elevated rate (or post_cap_rate if it's a threshold bonus)
      // Use higher of elevated_rate and post_cap_rate for "best possible" display
      const bestRate = Math.max(bonus.elevated_rate ?? 0, bonus.post_cap_rate ?? 0);
      if (bestRate > (allCategoriesBonusMap[bonus.card_id] ?? 0)) {
        allCategoriesBonusMap[bonus.card_id] = bestRate;
      }
    } else {
      // For specific category bonuses, map to each category
      const categoryIds = bonus.card_cap_categories?.map((c: { category_id: number }) => c.category_id) ?? [];
      for (const categoryId of categoryIds) {
        if (!categoryBonusesMap[bonus.card_id]) {
          categoryBonusesMap[bonus.card_id] = {};
        }
        const currentRate = categoryBonusesMap[bonus.card_id][categoryId] ?? 0;
        if ((bonus.elevated_rate ?? 0) > currentRate) {
          categoryBonusesMap[bonus.card_id][categoryId] = bonus.elevated_rate ?? 0;
        }
      }
    }
  }

  // Build earning rules map: cardId -> categoryId -> rate
  // Only uses 'any' (direct) booking method rules
  const earningRulesMap: Record<string, Record<number, number>> = {};
  for (const rule of allEarningRules ?? []) {
    // Only use 'any' (direct) rules for base comparison
    if (rule.booking_method !== "any") continue;
    if (!earningRulesMap[rule.card_id]) {
      earningRulesMap[rule.card_id] = {};
    }
    const currentRate = earningRulesMap[rule.card_id][rule.category_id] ?? 0;
    if (rule.rate > currentRate) {
      earningRulesMap[rule.card_id][rule.category_id] = rule.rate;
    }
  }

  // Helper: Get the best rate for a card + category using "highest rate wins"
  const getBestRate = (cardId: string, categoryId: number, defaultRate: number): number => {
    const rates: number[] = [defaultRate];
    
    // 1. Check direct earning rule for this category
    const directRule = earningRulesMap[cardId]?.[categoryId];
    if (directRule) rates.push(directRule);
    
    // 2. Check parent category rule (e.g., All Travel for Flights)
    const parentId = parentCategoryMap.get(categoryId);
    if (parentId) {
      const parentRule = earningRulesMap[cardId]?.[parentId];
      if (parentRule) rates.push(parentRule);
    }
    
    // 3. Check category bonuses for this specific category
    const categoryBonus = categoryBonusesMap[cardId]?.[categoryId];
    if (categoryBonus) rates.push(categoryBonus);
    
    // 4. Check "all categories" bonus (applies to all non-excluded categories)
    const allCatBonus = allCategoriesBonusMap[cardId];
    if (allCatBonus) rates.push(allCatBonus);
    
    // Return the highest applicable rate
    return Math.max(...rates);
  };

  // Get non-excluded category IDs for computing earning rates
  const nonExcludedCategoryIds = (allCategories ?? [])
    .filter((cat) => !cat.excluded_by_default)
    .map((cat) => cat.id);

  // Transform cards for the client component
  type CardData = {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    primary_currency_id: string;
    issuers: { id: string; name: string } | null;
    primary_currency: { id: string; name: string; code: string; base_value_cents: number | null; currency_type: string } | null;
  };
  const cardsForTable = ((allCards ?? []) as unknown as CardData[]).map((card) => {
    const currency = card.primary_currency;
    const pointValue = currency?.id 
      ? userValuesByCurrency.get(currency.id) ?? currency.base_value_cents ?? 1
      : 1;

    // Build earning rates using "highest rate wins" logic
    const earningRates: Record<number, number> = {};
    for (const categoryId of nonExcludedCategoryIds) {
      earningRates[categoryId] = getBestRate(card.id, categoryId, card.default_earn_rate ?? 1);
    }

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
      earningRates,
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

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} />
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

