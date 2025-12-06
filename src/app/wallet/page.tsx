import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { WalletCardList } from "./wallet-card-list";
import { AddCardModal } from "./add-card-modal";
import { UserHeader } from "@/components/user-header";
import { CardCategorySelector } from "./card-category-selector";
import { MultiplierSelector } from "./multiplier-selector";
import { TravelPreferences } from "./travel-preferences";

export default async function WalletPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get user's wallet cards with full card info
  const { data: walletCards } = await supabase
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
        issuers:issuer_id (name),
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (name, code, currency_type),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (name, code, currency_type)
      )
    `)
    .eq("user_id", user.id);

  // Get card IDs for queries
  const userCardIds = walletCards?.map((wc) => wc.card_id) ?? [];
  
  // Build set of currency IDs the user "owns" (from cards in wallet)
  const userPrimaryCurrencyIds = new Set(
    walletCards
      ?.map((wc) => wc.cards?.primary_currency_id)
      .filter((id): id is string => !!id)
  );

  // Cards with secondary currency enabled if user has a card with that as primary
  // This is automatic - no manual enablers needed
  const enabledSecondaryCards = new Set<string>();
  walletCards?.forEach((wc) => {
    if (wc.cards?.secondary_currency_id && 
        userPrimaryCurrencyIds.has(wc.cards.secondary_currency_id)) {
      enabledSecondaryCards.add(wc.cards.id);
    }
  });

  // Get caps with selectable categories for user's cards
  const { data: cardCaps } = userCardIds.length > 0
    ? await supabase
        .from("card_caps")
        .select("id, card_id, cap_type, cap_amount")
        .eq("cap_type", "selected_category")
        .in("card_id", userCardIds)
    : { data: [] };

  // Get cap categories
  const capIds = cardCaps?.map((c) => c.id) ?? [];
  const { data: capCategories } = capIds.length > 0
    ? await supabase
        .from("card_cap_categories")
        .select("cap_id, category_id, earning_categories(id, name)")
        .in("cap_id", capIds)
    : { data: [] };

  // Get user's current selections
  const { data: userSelections } = capIds.length > 0
    ? await supabase
        .from("user_card_selections")
        .select("cap_id, selected_category_id")
        .eq("user_id", user.id)
        .in("cap_id", capIds)
    : { data: [] };

  // Build caps data structure
  const cardCapsWithCategories = (cardCaps ?? []).map((cap) => ({
    ...cap,
    categories: (capCategories ?? [])
      .filter((cc) => cc.cap_id === cap.id)
      .map((cc) => cc.earning_categories)
      .filter((cat): cat is { id: number; name: string } => cat !== null),
  }));

  // Group caps by card
  const capsByCard = cardCapsWithCategories.reduce((acc, cap) => {
    if (!acc[cap.card_id]) acc[cap.card_id] = [];
    acc[cap.card_id].push(cap);
    return acc;
  }, {} as Record<string, typeof cardCapsWithCategories>);

  // Get all available cards for adding
  const { data: allCards } = await supabase
    .from("card_with_currency")
    .select("*")
    .eq("is_active", true)
    .order("issuer_name")
    .order("name");

  const cardsNotInWallet = allCards?.filter(
    (card) => card.id && !userCardIds.includes(card.id)
  ) ?? [];

  // Get issuers for travel portal options
  const { data: issuers } = await supabase
    .from("issuers")
    .select("id, name")
    .order("name");

  // Get user's travel booking preferences
  const { data: travelPreferences } = await supabase
    .from("user_travel_booking_preferences")
    .select("category_slug, preference_type, brand_name, portal_issuer_id")
    .eq("user_id", user.id);

  // Get travel subcategories
  const { data: travelCategories } = await supabase
    .from("earning_categories")
    .select("id, name, slug, parent_category_id")
    .not("parent_category_id", "is", null);

  // Get earning rules with portal rates for user's cards
  const { data: portalEarningRules } = userCardIds.length > 0
    ? await supabase
        .from("card_earning_rules")
        .select("card_id, booking_method, cards:card_id(issuer_id)")
        .eq("booking_method", "portal")
        .in("card_id", userCardIds)
    : { data: [] };

  // Get multiplier programs that apply to user's cards
  // First, get programs that apply by currency
  const { data: programsByCurrency } = await supabase
    .from("earning_multiplier_currencies")
    .select("program_id")
    .in("currency_id", Array.from(userPrimaryCurrencyIds));

  // Then, get programs that apply by specific card
  const { data: programsByCard } = userCardIds.length > 0
    ? await supabase
        .from("earning_multiplier_cards")
        .select("program_id")
        .in("card_id", userCardIds)
    : { data: [] };

  // Combine program IDs
  const applicableProgramIds = new Set([
    ...(programsByCurrency?.map((p) => p.program_id) ?? []),
    ...(programsByCard?.map((p) => p.program_id) ?? []),
  ]);

  // Get full program data with tiers
  const { data: multiplierPrograms } = applicableProgramIds.size > 0
    ? await supabase
        .from("earning_multiplier_programs")
        .select("id, name, description, earning_multiplier_tiers(id, name, multiplier, requirements, sort_order, has_cap, cap_amount, cap_period)")
        .in("id", Array.from(applicableProgramIds))
        .order("name")
    : { data: [] };

  // Get user's current tier selections
  const { data: userMultiplierSelections } = applicableProgramIds.size > 0
    ? await supabase
        .from("user_multiplier_tiers")
        .select("program_id, tier_id")
        .eq("user_id", user.id)
        .in("program_id", Array.from(applicableProgramIds))
    : { data: [] };

  // Build programs data structure - cast tiers to avoid type inference issues with newly added columns
  const programsWithTiers = (multiplierPrograms ?? []).map((program) => ({
    id: program.id,
    name: program.name,
    description: program.description,
    tiers: (program.earning_multiplier_tiers || []) as Array<{
      id: string;
      name: string;
      multiplier: number;
      requirements: string | null;
      sort_order: number | null;
      has_cap: boolean | null;
      cap_amount: number | null;
      cap_period: string | null;
    }>,
  }));

  async function addToWallet(cardId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_wallets").insert({
      user_id: user.id,
      card_id: cardId,
    });
    revalidatePath("/wallet");
  }

  async function removeFromWallet(walletId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    // Only delete if the wallet entry belongs to the current user
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function selectCategory(capId: string, categoryId: number) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_card_selections").upsert(
      {
        user_id: user.id,
        cap_id: capId,
        selected_category_id: categoryId,
      },
      { onConflict: "user_id,cap_id" }
    );
    revalidatePath("/wallet");
  }

  async function selectMultiplierTier(programId: string, tierId: string | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    if (tierId) {
      await supabase.from("user_multiplier_tiers").upsert(
        {
          user_id: user.id,
          program_id: programId,
          tier_id: tierId,
        },
        { onConflict: "user_id,program_id" }
      );
    } else {
      // Delete the selection if no tier selected
      await supabase
        .from("user_multiplier_tiers")
        .delete()
        .eq("user_id", user.id)
        .eq("program_id", programId);
    }
    revalidatePath("/wallet");
  }

  async function updateTravelPreference(
    categorySlug: string,
    preferenceType: "direct" | "brand" | "portal",
    brandName: string | null,
    portalIssuerId: string | null
  ) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_travel_booking_preferences").upsert(
      {
        user_id: user.id,
        category_slug: categorySlug,
        preference_type: preferenceType,
        brand_name: brandName,
        portal_issuer_id: portalIssuerId,
      },
      { onConflict: "user_id,category_slug" }
    );
    revalidatePath("/wallet");
  }

  // Cards that require category selection
  const cardsNeedingSelection = (walletCards ?? []).filter(
    (wc) => wc.cards && capsByCard[wc.cards.id]?.length > 0
  );

  // Build airline brands from user's cards with airline_miles currency
  const airlineBrands = (walletCards ?? [])
    .filter((wc) => wc.cards?.primary_currency?.currency_type === "airline_miles")
    .map((wc) => ({
      name: wc.cards!.primary_currency!.name,
      currencyName: wc.cards!.primary_currency!.name,
    }))
    .filter((brand, index, self) => 
      self.findIndex(b => b.name === brand.name) === index
    );

  // Build hotel brands from user's cards with hotel_points currency
  const hotelBrands = (walletCards ?? [])
    .filter((wc) => wc.cards?.primary_currency?.currency_type === "hotel_points")
    .map((wc) => ({
      name: wc.cards!.primary_currency!.name,
      currencyName: wc.cards!.primary_currency!.name,
    }))
    .filter((brand, index, self) => 
      self.findIndex(b => b.name === brand.name) === index
    );

  // Build portal issuers from cards that have portal earning rules
  const portalIssuerIds = new Set(
    (portalEarningRules ?? [])
      .map((rule) => (rule.cards as { issuer_id: string } | null)?.issuer_id)
      .filter((id): id is string => !!id)
  );
  
  const portalIssuers = (issuers ?? [])
    .filter((issuer) => portalIssuerIds.has(issuer.id))
    .map((issuer) => ({
      issuerId: issuer.id,
      issuerName: issuer.name,
    }));

  // Travel subcategories for preference selection
  const travelSubcategories = (travelCategories ?? []).map((cat) => ({
    slug: cat.slug,
    name: cat.name,
  }));

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Wallet</h1>
            <p className="text-zinc-400 mt-1">
              {walletCards?.length ?? 0} card{walletCards?.length !== 1 ? "s" : ""} in your wallet
            </p>
          </div>
          <AddCardModal
            availableCards={cardsNotInWallet}
            onAddCard={addToWallet}
          />
        </div>

        {walletCards && walletCards.length > 0 ? (
          <>
            <WalletCardList
              walletCards={walletCards}
              enabledSecondaryCards={enabledSecondaryCards}
              onRemove={removeFromWallet}
            />

            {/* Category Selection for cards that need it */}
            {cardsNeedingSelection.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Category Selection
                </h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Some cards earn bonus rewards on a category you choose. Select which category to use for each card.
                </p>
                <div className="space-y-3">
                  {cardsNeedingSelection.map((wc) => {
                    if (!wc.cards) return null;
                    return (
                      <CardCategorySelector
                        key={wc.id}
                        cardId={wc.cards.id}
                        cardName={wc.cards.name}
                        caps={capsByCard[wc.cards.id]}
                        userSelections={userSelections ?? []}
                        onSelectCategory={selectCategory}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Earning Multiplier Programs */}
            {programsWithTiers.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Earning Multipliers
                </h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Select your tier in these reward programs to boost your earning rates.
                </p>
                <MultiplierSelector
                  programs={programsWithTiers}
                  userSelections={userMultiplierSelections ?? []}
                  onSelectTier={selectMultiplierTier}
                />
              </div>
            )}

            {/* Travel Booking Preferences */}
            {travelSubcategories.length > 0 && (airlineBrands.length > 0 || hotelBrands.length > 0 || portalIssuers.length > 0) && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Travel Booking Preferences
                </h2>
                <TravelPreferences
                  categories={travelSubcategories}
                  userPreferences={(travelPreferences ?? []).map((p) => ({
                    category_slug: p.category_slug,
                    preference_type: p.preference_type,
                    brand_name: p.brand_name,
                    portal_issuer_id: p.portal_issuer_id,
                  }))}
                  airlineBrands={airlineBrands}
                  hotelBrands={hotelBrands}
                  portalIssuers={portalIssuers}
                  onUpdatePreference={updateTravelPreference}
                />
              </div>
            )}
          </>
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

