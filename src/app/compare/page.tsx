import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { ComparisonTable } from "./comparison-table";
import { isAdminEmail } from "@/lib/admin";

async function saveCompareCategories(categoryIds: number[]) {
  "use server";
  const user = await currentUser();
  if (!user) return;
  
  const supabase = await createClient();
  
  // Delete existing
  await supabase
    .from("user_compare_categories")
    .delete()
    .eq("user_id", user.id);
  
  // Insert new
  if (categoryIds.length > 0) {
    await supabase
      .from("user_compare_categories")
      .insert(categoryIds.map((id) => ({ user_id: user.id, category_id: id })));
  }
}

async function saveCompareEvalCards(cardIds: string[]) {
  "use server";
  const user = await currentUser();
  if (!user) return;
  
  const supabase = await createClient();
  
  // Delete existing
  await supabase
    .from("user_compare_evaluation_cards")
    .delete()
    .eq("user_id", user.id);
  
  // Insert new
  if (cardIds.length > 0) {
    await supabase
      .from("user_compare_evaluation_cards")
      .insert(cardIds.map((id) => ({ user_id: user.id, card_id: id })));
  }
}

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
    .select("card_id, category_id, rate, booking_method, has_cap, cap_amount, cap_period, post_cap_rate");

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
      cap_period,
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

  // Get user's debit pay values and feature flag
  const [{ data: debitPayEnabled }, { data: debitPayValues }] = await Promise.all([
    supabase.from("user_feature_flags").select("debit_pay_enabled").eq("user_id", user.id).single(),
    supabase.from("user_card_debit_pay").select("card_id, debit_pay_percent").eq("user_id", user.id),
  ]);

  const debitPayMap: Record<string, number> = {};
  if (debitPayEnabled?.debit_pay_enabled) {
    for (const dp of debitPayValues ?? []) {
      debitPayMap[dp.card_id] = Number(dp.debit_pay_percent) || 0;
    }
  }

  // Get user's category spending and spending defaults
  const [{ data: userSpendingData }, { data: spendingDefaults }] = await Promise.all([
    supabase
      .from("user_category_spend")
      .select("category_id, annual_spend_cents")
      .eq("user_id", user.id),
    supabase
      .from("spending_defaults")
      .select("category_id, annual_spend_cents"),
  ]);

  // Build spending map: user values override defaults
  const userSpending: Record<number, number> = {};
  // First, populate with defaults
  for (const def of spendingDefaults ?? []) {
    userSpending[def.category_id] = def.annual_spend_cents;
  }
  // Then override with user-specific values
  for (const spend of userSpendingData ?? []) {
    userSpending[spend.category_id] = spend.annual_spend_cents;
  }

  // Get user's saved compare preferences
  const [{ data: savedCategories }, { data: savedEvalCards }] = await Promise.all([
    supabase
      .from("user_compare_categories")
      .select("category_id")
      .eq("user_id", user.id),
    supabase
      .from("user_compare_evaluation_cards")
      .select("card_id")
      .eq("user_id", user.id),
  ]);

  const savedCategoryIds = savedCategories?.map((c) => c.category_id) ?? [];
  const savedEvalCardIds = savedEvalCards?.map((c) => c.card_id) ?? [];

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
    cap_period: string | null;
    card_cap_categories: { category_id: number }[] | null;
  };
  
  // Build cap info for tooltips: cardId -> categoryId -> cap details
  type CapInfo = {
    capAmount: number | null;
    capPeriod: string | null;
    capType: string;
    postCapRate: number | null;
    elevatedRate: number;
  };
  const capInfoMap: Record<string, Record<number, CapInfo>> = {};
  
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
        
        // Store cap info for this card/category
        if (!capInfoMap[bonus.card_id]) {
          capInfoMap[bonus.card_id] = {};
        }
        capInfoMap[bonus.card_id][categoryId] = {
          capAmount: bonus.cap_amount,
          capPeriod: bonus.cap_period,
          capType: bonus.cap_type,
          postCapRate: bonus.post_cap_rate,
          elevatedRate: bonus.elevated_rate ?? 0,
        };
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
  
  // Build earning rule cap info: cardId -> categoryId -> cap details
  // This will be merged with category bonus caps later
  type EarningRuleCapInfo = {
    capAmount: number | null;
    capPeriod: string | null;
    capType: string;
    postCapRate: number | null;
    elevatedRate: number;
  };
  const earningRuleCapInfoMap: Record<string, Record<number, EarningRuleCapInfo>> = {};
  for (const rule of allEarningRules ?? []) {
    if (rule.booking_method !== "any") continue;
    if (rule.has_cap && rule.cap_amount) {
      if (!earningRuleCapInfoMap[rule.card_id]) {
        earningRuleCapInfoMap[rule.card_id] = {};
      }
      earningRuleCapInfoMap[rule.card_id][rule.category_id] = {
        capAmount: rule.cap_amount,
        capPeriod: rule.cap_period,
        capType: "single_category",
        postCapRate: rule.post_cap_rate,
        elevatedRate: rule.rate,
      };
    }
  }
  
  // Merge earning rule caps into capInfoMap (category bonus caps take precedence)
  for (const cardId in earningRuleCapInfoMap) {
    if (!capInfoMap[cardId]) {
      capInfoMap[cardId] = {};
    }
    for (const categoryId in earningRuleCapInfoMap[cardId]) {
      const catId = Number(categoryId);
      // Only add if no category bonus cap exists
      if (!capInfoMap[cardId][catId]) {
        capInfoMap[cardId][catId] = earningRuleCapInfoMap[cardId][catId];
      }
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

  // Default category slugs to show (used only if user has no saved preferences)
  const defaultCategorySlugs = [
    "gas-ev",
    "grocery",
    "dining",
    "all-travel",
    "flights",
    "hotels",
    "streaming",
    "amazon",
  ];

  // Convert saved category IDs to slugs, or use defaults if none saved
  const initialCategorySlugs = savedCategoryIds.length > 0
    ? (allCategories ?? [])
        .filter((cat) => savedCategoryIds.includes(cat.id))
        .map((cat) => cat.slug)
    : defaultCategorySlugs;

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
          initialCategorySlugs={initialCategorySlugs}
          initialEvalCardIds={savedEvalCardIds}
          debitPayValues={debitPayMap}
          userSpending={userSpending}
          capInfo={capInfoMap}
          onSaveCategories={saveCompareCategories}
          onSaveEvalCards={saveCompareEvalCards}
        />
      </div>
    </div>
  );
}

