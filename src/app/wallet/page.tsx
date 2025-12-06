import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { WalletCardList } from "./wallet-card-list";
import { AddCardModal } from "./add-card-modal";
import { UserHeader } from "@/components/user-header";
import { ReturnsSummary } from "./returns-summary";
import { isAdminEmail } from "@/lib/admin";
import {
  calculatePortfolioReturns,
  calculateCardRecommendations,
  CardInput,
  CategorySpending,
  EarningRuleInput,
  CategoryBonusInput,
  TravelPreference,
  MultiplierProgram,
} from "@/lib/returns-calculator";
import { CardRecommendations } from "./card-recommendations";

export default async function WalletPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Fetch wallet cards and returns data in parallel
  const [
    walletResult,
    allCardsResult,
    spendingResult,
    rulesResult,
    bonusesResult,
    currenciesResult,
    userCurrencyValuesResult,
    perksResult,
    selectionsResult,
    travelPrefsResult,
    categoriesResult,
    featureFlagsResult,
    debitPayResult,
    multiplierTiersResult,
  ] = await Promise.all([
    // User's wallet cards with full details
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        added_at,
        cards:card_id (
          id,
          name,
          slug,
          annual_fee,
          default_earn_rate,
          primary_currency_id,
          secondary_currency_id,
          issuer_id,
          issuers:issuer_id (name),
          primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
          secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
        )
      `)
      .eq("user_id", user.id),
    
    // All available cards for adding (includes default_perks_value for recommendations)
    supabase
      .from("cards")
      .select(`
        id,
        name,
        slug,
        annual_fee,
        default_earn_rate,
        default_perks_value,
        exclude_from_recommendations,
        primary_currency_id,
        secondary_currency_id,
        issuer_id,
        issuers:issuer_id (id, name),
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (id, name, code, currency_type, base_value_cents),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (id, name, code, currency_type, base_value_cents)
      `)
      .eq("is_active", true)
      .order("name"),
    
    // User's spending per category
    supabase
      .from("user_effective_spending")
      .select("category_id, category_name, category_slug, annual_spend_cents")
      .eq("user_id", user.id),
    
    // All earning rules
    supabase
      .from("card_earning_rules")
      .select("id, card_id, category_id, rate, has_cap, cap_amount, cap_period, cap_unit, post_cap_rate, booking_method, brand_name"),
    
    // All category bonuses
    supabase
      .from("card_caps")
      .select(`
        id,
        card_id,
        cap_type,
        cap_amount,
        cap_period,
        elevated_rate,
        post_cap_rate,
        card_cap_categories (category_id)
      `),
    
    // All currencies for default values
    supabase
      .from("reward_currencies")
      .select("id, base_value_cents"),
    
    // User's custom currency values
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", user.id),
    
    // User's perks values
    supabase
      .from("user_card_perks_values")
      .select("card_id, perks_value")
      .eq("user_id", user.id),
    
    // User's category selections
    supabase
      .from("user_card_selections")
      .select("cap_id, selected_category_id")
      .eq("user_id", user.id),
    
    // User's travel preferences
    supabase
      .from("user_travel_booking_preferences")
      .select("category_slug, preference_type, brand_name, portal_issuer_id")
      .eq("user_id", user.id),
    
    // All categories for parent lookups
    supabase
      .from("earning_categories")
      .select("id, name, slug, parent_category_id, excluded_by_default"),
    
    // User's feature flags (for debit pay)
    supabase
      .from("user_feature_flags")
      .select("debit_pay_enabled")
      .eq("user_id", user.id)
      .single(),
    
    // User's debit pay values
    supabase
      .from("user_card_debit_pay")
      .select("card_id, debit_pay_percent")
      .eq("user_id", user.id),
      
    // Multiplier programs for recommendations
    supabase
      .from("user_multiplier_tiers")
      .select(`
        program_id,
        tier_id,
        earning_multiplier_tiers:tier_id (multiplier),
        earning_multiplier_programs:program_id (
          earning_multiplier_currencies (currency_id),
          earning_multiplier_cards (card_id)
        )
      `)
      .eq("user_id", user.id),
  ]);

  // Type assertion for wallet cards since Supabase types don't infer relations correctly
  type WalletCardData = {
    id: string;
    card_id: string;
    added_at: string | null;
    cards: {
      id: string;
      name: string;
      slug: string;
      annual_fee: number;
      default_earn_rate: number;
      primary_currency_id: string;
      secondary_currency_id: string | null;
      issuer_id: string;
      issuers: { name: string } | null;
      primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
      secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    } | null;
  };
  const walletCards = (walletResult.data ?? []) as unknown as WalletCardData[];
  const userCardIds = walletCards.map((wc) => wc.card_id);
  
  // Build set of currency IDs the user "owns" (from cards in wallet)
  const userPrimaryCurrencyIds = new Set(
    walletCards
      .map((wc) => wc.cards?.primary_currency_id)
      .filter((id): id is string => !!id)
  );

  // Cards with secondary currency enabled if user has a card with that as primary
  const enabledSecondaryCards = new Set<string>();
  walletCards.forEach((wc) => {
    if (wc.cards?.secondary_currency_id && 
        userPrimaryCurrencyIds.has(wc.cards.secondary_currency_id)) {
      enabledSecondaryCards.add(wc.cards.id);
    }
  });

  // Build perks map
  const perksMap = new Map<string, number>();
  perksResult.data?.forEach((pv) => {
    perksMap.set(pv.card_id, pv.perks_value);
  });

  // Check if debit pay is enabled
  const debitPayEnabled = featureFlagsResult.data?.debit_pay_enabled ?? false;

  // Build debit pay map
  const debitPayMap = new Map<string, number>();
  debitPayResult.data?.forEach((dp) => {
    debitPayMap.set(dp.card_id, Number(dp.debit_pay_percent) ?? 0);
  });

  // Type for all cards
  type AllCardData = {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    default_perks_value: number | null;
    exclude_from_recommendations: boolean;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    issuer_id: string;
    issuers: { id: string; name: string } | null;
    primary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
    secondary_currency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
  };
  const allCards = (allCardsResult.data ?? []) as unknown as AllCardData[];
  
  const cardsNotInWallet = allCards.filter(
    (card) => card.id && !userCardIds.includes(card.id)
  );

  // Calculate portfolio returns
  const userCardIdsSet = new Set(userCardIds);
  
  // Process cards for returns calculator
  const cards: CardInput[] = walletCards
    .filter(w => w.cards)
    .map(w => w.cards as unknown as CardInput);

  // Process ALL earning rules (needed for recommendations)
  const allEarningRules: EarningRuleInput[] = (rulesResult.data ?? [])
    .map((r) => ({
      id: r.id,
      card_id: r.card_id,
      category_id: r.category_id,
      rate: Number(r.rate),
      has_cap: r.has_cap,
      cap_amount: r.cap_amount ? Number(r.cap_amount) : null,
      cap_period: r.cap_period,
      cap_unit: r.cap_unit,
      post_cap_rate: r.post_cap_rate ? Number(r.post_cap_rate) : null,
      booking_method: r.booking_method,
      brand_name: r.brand_name,
    }));

  // Filter earning rules to only user's cards (for current returns calculation)
  const earningRules = allEarningRules.filter((r) => userCardIdsSet.has(r.card_id));

  // Process ALL category bonuses (needed for recommendations)
  const allCategoryBonuses: CategoryBonusInput[] = (bonusesResult.data ?? [])
    .map((b) => ({
      id: b.id,
      card_id: b.card_id,
      cap_type: b.cap_type,
      cap_amount: b.cap_amount ? Number(b.cap_amount) : null,
      cap_period: b.cap_period,
      elevated_rate: Number(b.elevated_rate),
      post_cap_rate: b.post_cap_rate ? Number(b.post_cap_rate) : null,
      category_ids: ((b.card_cap_categories as unknown as { category_id: number }[]) ?? []).map(c => c.category_id),
    }));

  // Filter category bonuses to only user's cards (for current returns calculation)
  const categoryBonuses = allCategoryBonuses.filter((b) => userCardIdsSet.has(b.card_id));

  // Build category maps
  const categoryExclusionMap = new Map<number, boolean>();
  const categoryParentMap = new Map<number, number | null>();
  categoriesResult.data?.forEach((c) => {
    categoryExclusionMap.set(c.id, c.excluded_by_default);
    categoryParentMap.set(c.id, c.parent_category_id);
  });

  // Process spending
  const spending: CategorySpending[] = (spendingResult.data ?? []).map((s) => ({
    category_id: s.category_id!,
    category_name: s.category_name!,
    category_slug: s.category_slug!,
    annual_spend_cents: s.annual_spend_cents!,
    excluded_by_default: categoryExclusionMap.get(s.category_id!) ?? false,
    parent_category_id: categoryParentMap.get(s.category_id!) ?? null,
  }));

  // Build currency value maps
  const defaultCurrencyValues = new Map<string, number>();
  currenciesResult.data?.forEach((c) => {
    if (c.base_value_cents) {
      defaultCurrencyValues.set(c.id, c.base_value_cents);
    }
  });

  const userCurrencyValues = new Map<string, number>();
  userCurrencyValuesResult.data?.forEach((v) => {
    userCurrencyValues.set(v.currency_id, v.value_cents);
  });

  // Build user selections map
  const userSelections = new Map<string, number>();
  selectionsResult.data?.forEach((s) => {
    userSelections.set(s.cap_id, s.selected_category_id);
  });

  // Build travel preferences
  const travelPreferences: TravelPreference[] = (travelPrefsResult.data ?? []).map((p) => ({
    category_slug: p.category_slug,
    preference_type: p.preference_type,
    brand_name: p.brand_name,
    portal_issuer_id: p.portal_issuer_id,
  }));

  // Build multiplier programs for calculations
  type MultiplierTierData = {
    program_id: string;
    tier_id: string | null;
    earning_multiplier_tiers: { multiplier: number } | null;
    earning_multiplier_programs: {
      earning_multiplier_currencies: { currency_id: string }[] | null;
      earning_multiplier_cards: { card_id: string }[] | null;
    } | null;
  };
  const multiplierPrograms: MultiplierProgram[] = [];
  (multiplierTiersResult.data ?? []).forEach((t: unknown) => {
    const tier = t as MultiplierTierData;
    if (tier.tier_id && tier.earning_multiplier_tiers?.multiplier) {
      multiplierPrograms.push({
        programId: tier.program_id,
        multiplier: tier.earning_multiplier_tiers.multiplier,
        applicableCurrencyIds: tier.earning_multiplier_programs?.earning_multiplier_currencies?.map((c: { currency_id: string }) => c.currency_id) ?? [],
        applicableCardIds: tier.earning_multiplier_programs?.earning_multiplier_cards?.map((c: { card_id: string }) => c.card_id) ?? [],
      });
    }
  });

  // Calculate returns (only if user has cards)
  const calculatorInput = {
    cards,
    spending,
    earningRules,
    categoryBonuses,
    userCurrencyValues,
    defaultCurrencyValues,
    cashOutValues: new Map<string, number>(), // Not used on wallet summary
    perksValues: perksMap,
    debitPayValues: debitPayMap,
    multiplierPrograms,
    userSelections,
    travelPreferences,
    enabledSecondaryCards,
    earningsGoal: "maximize" as const, // Default to maximize for wallet summary
  };
  
  const returns = cards.length > 0 ? calculatePortfolioReturns(calculatorInput) : null;

  // Calculate card recommendations (only if user has spending data)
  const recommendations = returns && returns.totalSpend > 0 ? calculateCardRecommendations(
    {
      ...calculatorInput,
      allCards: allCards.map(c => ({
        ...c,
        issuer_id: c.issuer_id,
        primary_currency: c.primary_currency,
        secondary_currency: c.secondary_currency,
      })),
      allEarningRules,
      allCategoryBonuses,
    },
    returns,
    3 // Top 3 recommendations
  ) : [];

  async function addToWallet(cardId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    
    // Get the card's default perks value
    const { data: card } = await supabase
      .from("cards")
      .select("default_perks_value")
      .eq("id", cardId)
      .single();
    
    // Add card to wallet
    await supabase.from("user_wallets").insert({
      user_id: user.id,
      card_id: cardId,
    });
    
    // If card has a default perks value, set it for the user
    if (card?.default_perks_value && card.default_perks_value > 0) {
      await supabase.from("user_card_perks_values").upsert(
        {
          user_id: user.id,
          card_id: cardId,
          perks_value: card.default_perks_value,
        },
        { onConflict: "user_id,card_id" }
      );
    }
    
    revalidatePath("/wallet");
  }

  async function removeFromWallet(walletId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function updatePerksValue(cardId: string, perksValue: number) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_card_perks_values").upsert(
      {
        user_id: user.id,
        card_id: cardId,
        perks_value: perksValue,
      },
      { onConflict: "user_id,card_id" }
    );
    revalidatePath("/wallet");
  }

  async function enableDebitPay() {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_feature_flags").upsert(
      {
        user_id: user.id,
        debit_pay_enabled: true,
      },
      { onConflict: "user_id" }
    );
    revalidatePath("/wallet");
  }

  async function updateDebitPay(cardId: string, percent: number) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_card_debit_pay").upsert(
      {
        user_id: user.id,
        card_id: cardId,
        debit_pay_percent: percent,
      },
      { onConflict: "user_id,card_id" }
    );
    revalidatePath("/wallet");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Wallet</h1>
            <p className="text-zinc-400 mt-1">
              {walletCards.length} card{walletCards.length !== 1 ? "s" : ""} in your wallet
            </p>
          </div>
          <AddCardModal
            availableCards={cardsNotInWallet.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              annual_fee: c.annual_fee,
              issuer_name: c.issuers?.name,
              primary_currency_name: c.primary_currency?.name,
            }))}
            onAddCard={addToWallet}
            debitPayEnabled={debitPayEnabled}
            onEnableDebitPay={enableDebitPay}
          />
        </div>

        {/* Returns Summary */}
        {returns && returns.totalSpend > 0 && (
          <ReturnsSummary returns={returns} />
        )}

        {/* Card Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <CardRecommendations 
              recommendations={recommendations}
              onAddCard={addToWallet}
            />
          </div>
        )}

        {walletCards.length > 0 ? (
          <WalletCardList
            walletCards={walletCards}
            enabledSecondaryCards={enabledSecondaryCards}
            perksMap={perksMap}
            debitPayMap={debitPayMap}
            debitPayEnabled={debitPayEnabled}
            onRemove={removeFromWallet}
            onUpdatePerks={updatePerksValue}
            onUpdateDebitPay={updateDebitPay}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400 mb-4">Your wallet is empty.</p>
            <p className="text-zinc-500 text-sm">
              Add cards to track your rewards and see which currencies are active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
