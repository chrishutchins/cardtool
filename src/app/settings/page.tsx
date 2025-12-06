import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { CardCategorySelector } from "@/app/wallet/card-category-selector";
import { MultiplierSelector } from "@/app/wallet/multiplier-selector";
import { TravelPreferences } from "@/app/wallet/travel-preferences";
import { MobilePayCategories } from "@/app/wallet/mobile-pay-categories";

export default async function SettingsPage() {
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
      cards:card_id (
        id,
        name,
        slug,
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

  // Get all non-excluded categories for mobile pay selection
  const { data: allCategories } = await supabase
    .from("earning_categories")
    .select("id, name, slug")
    .eq("excluded_by_default", false)
    .is("parent_category_id", null)
    .order("name");

  // Get user's mobile pay category selections
  const { data: mobilePayCategories } = await supabase
    .from("user_mobile_pay_categories")
    .select("category_id")
    .eq("user_id", user.id);

  // Get earning rules with portal rates for user's cards
  const { data: portalEarningRules } = userCardIds.length > 0
    ? await supabase
        .from("card_earning_rules")
        .select("card_id, booking_method, cards:card_id(issuer_id)")
        .eq("booking_method", "portal")
        .in("card_id", userCardIds)
    : { data: [] };

  // Get multiplier programs that apply to user's cards
  const { data: programsByCurrency } = await supabase
    .from("earning_multiplier_currencies")
    .select("program_id")
    .in("currency_id", Array.from(userPrimaryCurrencyIds));

  const { data: programsByCard } = userCardIds.length > 0
    ? await supabase
        .from("earning_multiplier_cards")
        .select("program_id")
        .in("card_id", userCardIds)
    : { data: [] };

  const applicableProgramIds = new Set([
    ...(programsByCurrency?.map((p) => p.program_id) ?? []),
    ...(programsByCard?.map((p) => p.program_id) ?? []),
  ]);

  const { data: multiplierPrograms } = applicableProgramIds.size > 0
    ? await supabase
        .from("earning_multiplier_programs")
        .select("id, name, description, earning_multiplier_tiers(id, name, multiplier, requirements, sort_order, has_cap, cap_amount, cap_period)")
        .in("id", Array.from(applicableProgramIds))
        .order("name")
    : { data: [] };

  const { data: userMultiplierSelections } = applicableProgramIds.size > 0
    ? await supabase
        .from("user_multiplier_tiers")
        .select("program_id, tier_id")
        .eq("user_id", user.id)
        .in("program_id", Array.from(applicableProgramIds))
    : { data: [] };

  // Server actions
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
    revalidatePath("/settings");
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
      await supabase
        .from("user_multiplier_tiers")
        .delete()
        .eq("user_id", user.id)
        .eq("program_id", programId);
    }
    revalidatePath("/settings");
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
    revalidatePath("/settings");
  }

  async function toggleMobilePayCategory(categoryId: number, selected: boolean) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    if (selected) {
      await supabase.from("user_mobile_pay_categories").upsert(
        {
          user_id: user.id,
          category_id: categoryId,
        },
        { onConflict: "user_id,category_id" }
      );
    } else {
      await supabase
        .from("user_mobile_pay_categories")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", categoryId);
    }
    revalidatePath("/settings");
  }

  // Cards that require category selection
  const cardsNeedingSelection = (walletCards ?? []).filter(
    (wc) => wc.cards && capsByCard[wc.cards.id]?.length > 0
  );

  // Build airline brands from user's cards with airline_miles currency
  const airlineBrands = (walletCards ?? [])
    .filter((wc) => wc.cards?.primary_currency?.currency_type === "airline_miles")
    .map((wc) => ({
      name: wc.cards!.primary_currency!.name.replace(" Miles", "").replace(" Mileage Plan", ""),
      currencyName: wc.cards!.primary_currency!.name,
    }))
    .filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);

  // Build hotel brands from user's cards with hotel_points currency
  const hotelBrands = (walletCards ?? [])
    .filter((wc) => wc.cards?.primary_currency?.currency_type === "hotel_points")
    .map((wc) => ({
      name: wc.cards!.primary_currency!.name.replace(" Points", "").replace(" Honors", "").replace(" Bonvoy", ""),
      currencyName: wc.cards!.primary_currency!.name,
    }))
    .filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);

  // Build portal issuers from user's cards that have portal earning rules
  const portalIssuerIds = new Set(
    (portalEarningRules ?? [])
      .map((r) => (r.cards as { issuer_id: string } | null)?.issuer_id)
      .filter((id): id is string => !!id)
  );
  const portalIssuers = (issuers ?? [])
    .filter((i) => portalIssuerIds.has(i.id))
    .map((i) => ({ issuerId: i.id, issuerName: i.name }));

  // Build travel subcategories
  const travelSubcategories = (travelCategories ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  // Build programs with tiers
  const programsWithTiers = (multiplierPrograms ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    tiers: ((p.earning_multiplier_tiers as Array<{
      id: string;
      name: string;
      multiplier: number;
      requirements: string | null;
      sort_order: number;
      has_cap: boolean;
      cap_amount: number | null;
      cap_period: string | null;
    }>) ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  // Check if user has any cards with mobile pay earning rules
  const hasMobilePayCards = userCardIds.length > 0;
  
  const hasAnySettings = cardsNeedingSelection.length > 0 || programsWithTiers.length > 0 || 
    (travelSubcategories.length > 0 && (airlineBrands.length > 0 || hotelBrands.length > 0 || portalIssuers.length > 0)) ||
    (hasMobilePayCards && (allCategories ?? []).length > 0);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400 mt-1">
            Configure your card bonuses, multiplier programs, and travel preferences
          </p>
        </div>

        {hasAnySettings ? (
          <div className="space-y-8">
            {/* Card Category Selections */}
            {cardsNeedingSelection.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Bonus Category Selections
                </h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Some cards let you choose which category earns a bonus. Select your preferred category for each card.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
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
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">
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
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">
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

            {/* Mobile Pay Categories */}
            {hasMobilePayCards && (allCategories ?? []).length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Mobile Pay Categories
                </h2>
                <MobilePayCategories
                  categories={(allCategories ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                  }))}
                  selectedCategoryIds={(mobilePayCategories ?? []).map((m) => m.category_id)}
                  onToggleCategory={toggleMobilePayCategory}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400 mb-2">No settings available yet.</p>
            <p className="text-zinc-500 text-sm">
              Add cards to your wallet to unlock bonus category selections, earning multipliers, and travel preferences.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

