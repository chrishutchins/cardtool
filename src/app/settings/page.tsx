import { createClient, createAdminClient, createUntypedClient } from "@/lib/supabase/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { CardCategorySelector } from "@/app/wallet/card-category-selector";
import { MultiplierSelector } from "@/app/wallet/multiplier-selector";
import { TravelPreferences } from "@/app/wallet/travel-preferences";
import { MobilePayCategories } from "@/app/wallet/mobile-pay-categories";
import { PaypalCategories } from "@/app/wallet/paypal-categories";
import { LargePurchaseCategories } from "./large-purchase-categories";
import { LinkedAccounts } from "@/app/wallet/linked-accounts";
import { isAdminEmail } from "@/lib/admin";
import { AccountManagement } from "./account-management";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | CardTool",
  description: "Configure your CardTool preferences and account settings",
};

export default async function SettingsPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // ============ BATCH 1: All independent queries in parallel ============
  const [
    walletCardsResult,
    issuersResult,
    travelPreferencesResult,
    travelCategoriesResult,
    allCategoriesResult,
    mobilePayCategoriesResult,
    paypalCategoriesResult,
    featureFlagsResult,
    largePurchaseCategoriesResult,
    everythingElseCategoryResult,
    linkedAccountsResult,
  ] = await Promise.all([
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
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
      .eq("user_id", user.id),
    supabase.from("issuers").select("id, name").order("name"),
    supabase
      .from("user_travel_booking_preferences")
      .select("category_slug, preference_type, brand_name, portal_issuer_id")
      .eq("user_id", user.id),
    // Get travel subcategories (Flights, Hotels, Rental Car - children of All Travel)
    supabase
      .from("earning_categories")
      .select("id, name, slug, parent_category_id, parent:earning_categories!parent_category_id(slug)")
      .not("parent_category_id", "is", null),
    supabase
      .from("earning_categories")
      .select("id, name, slug")
      .eq("excluded_by_default", false)
      .is("parent_category_id", null)
      .order("name"),
    supabase
      .from("user_mobile_pay_categories")
      .select("category_id")
      .eq("user_id", user.id),
    supabase
      .from("user_paypal_categories")
      .select("category_id")
      .eq("user_id", user.id),
    supabase
      .from("user_feature_flags")
      .select("debit_pay_enabled, account_linking_enabled")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_large_purchase_categories")
      .select("category_id")
      .eq("user_id", user.id),
    supabase
      .from("earning_categories")
      .select("id")
      .eq("slug", "everything-else")
      .single(),
    supabase
      .from("user_linked_accounts")
      .select(`
        id,
        name,
        official_name,
        type,
        subtype,
        mask,
        current_balance,
        available_balance,
        credit_limit,
        manual_credit_limit,
        iso_currency_code,
        last_balance_update,
        wallet_card_id,
        user_plaid_items:plaid_item_id (
          institution_name
        )
      `)
      .eq("user_id", user.id)
      .order("name"),
  ]);

  const walletCards = walletCardsResult.data;
  const issuers = issuersResult.data;
  const travelPreferences = travelPreferencesResult.data;
  const travelCategories = travelCategoriesResult.data;
  const allCategories = allCategoriesResult.data;
  const mobilePayCategories = mobilePayCategoriesResult.data;
  const paypalCategories = paypalCategoriesResult.data;
  const debitPayEnabled = featureFlagsResult.data?.debit_pay_enabled ?? false;
  const accountLinkingEnabled = featureFlagsResult.data?.account_linking_enabled ?? false;
  const largePurchaseCategories = largePurchaseCategoriesResult.data;
  const everythingElseCategoryId = everythingElseCategoryResult.data?.id ?? null;
  const linkedAccounts = linkedAccountsResult.data;

  // Process wallet cards
  const userCardIds = walletCards?.map((wc) => wc.card_id) ?? [];
  
  type WalletCardData = { 
    id: string;
    card_id: string; 
    cards: { 
      id: string; 
      name: string;
      primary_currency_id: string; 
      issuer_id: string;
      primary_currency: { id: string; name: string; currency_type: string } | null;
    } | null 
  };
  const typedWalletCards = (walletCards ?? []) as unknown as WalletCardData[];
  const userPrimaryCurrencyIds = new Set(
    typedWalletCards
      .map((wc) => wc.cards?.primary_currency_id)
      .filter((id): id is string => !!id)
  );

  // ============ BATCH 2: Queries that depend on wallet cards ============
  const [cardCapsResult, portalEarningRulesResult, programsByCurrencyResult, programsByCardResult] = 
    userCardIds.length > 0
      ? await Promise.all([
          supabase
            .from("card_caps")
            .select("id, card_id, cap_type, cap_amount")
            .eq("cap_type", "selected_category")
            .in("card_id", userCardIds),
          supabase
            .from("card_earning_rules")
            .select("card_id, booking_method, cards:card_id(issuer_id)")
            .eq("booking_method", "portal")
            .in("card_id", userCardIds),
          supabase
            .from("earning_multiplier_currencies")
            .select("program_id")
            .in("currency_id", Array.from(userPrimaryCurrencyIds)),
          supabase
            .from("earning_multiplier_cards")
            .select("program_id")
            .in("card_id", userCardIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const cardCaps = cardCapsResult.data ?? [];
  const portalEarningRules = portalEarningRulesResult.data;
  const programsByCurrency = programsByCurrencyResult.data;
  const programsByCard = programsByCardResult.data;

  // ============ BATCH 3: Queries that depend on caps ============
  const capIds = cardCaps?.map((c) => c.id) ?? [];
  const [capCategoriesResult, userSelectionsResult] = capIds.length > 0
    ? await Promise.all([
        supabase
          .from("card_cap_categories")
          .select("cap_id, category_id, earning_categories(id, name)")
          .in("cap_id", capIds),
        supabase
          .from("user_card_selections")
          .select("cap_id, selected_category_id")
          .eq("user_id", user.id)
          .in("cap_id", capIds),
      ])
    : [{ data: [] }, { data: [] }];

  const capCategories = capCategoriesResult.data;
  const userSelections = userSelectionsResult.data;

  // Build caps data structure
  type CapCategoryData = { cap_id: string; earning_categories: { id: number; name: string } | null };
  const cardCapsWithCategories = (cardCaps ?? []).map((cap) => ({
    ...cap,
    categories: ((capCategories ?? []) as unknown as CapCategoryData[])
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

  // ============ BATCH 4: Multiplier programs ============
  const applicableProgramIds = new Set([
    ...(programsByCurrency?.map((p) => p.program_id) ?? []),
    ...(programsByCard?.map((p) => p.program_id) ?? []),
  ]);

  const [multiplierProgramsResult, userMultiplierSelectionsResult] = applicableProgramIds.size > 0
    ? await Promise.all([
        supabase
          .from("earning_multiplier_programs")
          .select("id, name, description, earning_multiplier_tiers(id, name, multiplier, requirements, sort_order, has_cap, cap_amount, cap_period)")
          .in("id", Array.from(applicableProgramIds))
          .order("name"),
        supabase
          .from("user_multiplier_tiers")
          .select("program_id, tier_id")
          .eq("user_id", user.id)
          .in("program_id", Array.from(applicableProgramIds)),
      ])
    : [{ data: [] }, { data: [] }];

  const multiplierPrograms = multiplierProgramsResult.data;
  const userMultiplierSelections = userMultiplierSelectionsResult.data;

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
    // Revalidate compare page so mobile pay rates are recalculated
    revalidatePath("/compare");
    revalidatePath("/returns");
  }

  async function togglePaypalCategory(categoryId: number, selected: boolean) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    if (selected) {
      await supabase.from("user_paypal_categories").upsert(
        {
          user_id: user.id,
          category_id: categoryId,
        },
        { onConflict: "user_id,category_id" }
      );
    } else {
      await supabase
        .from("user_paypal_categories")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", categoryId);
    }
    // Revalidate compare page so PayPal rates are recalculated
    revalidatePath("/compare");
    revalidatePath("/returns");
  }

  async function toggleLargePurchaseCategory(categoryId: number, selected: boolean) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    if (selected) {
      await supabase.from("user_large_purchase_categories").upsert(
        {
          user_id: user.id,
          category_id: categoryId,
        },
        { onConflict: "user_id,category_id" }
      );
    } else {
      await supabase
        .from("user_large_purchase_categories")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", categoryId);
    }
    revalidatePath("/settings");
  }

  async function disableDebitPay() {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    
    // Set debit_pay_enabled to false
    await supabase
      .from("user_feature_flags")
      .update({ debit_pay_enabled: false })
      .eq("user_id", user.id);
    
    // Also clear all debit pay values for this user
    await supabase
      .from("user_card_debit_pay")
      .delete()
      .eq("user_id", user.id);

    revalidatePath("/settings");
    revalidatePath("/wallet");
    revalidatePath("/returns");
  }

  async function pairLinkedAccount(linkedAccountId: string, walletCardId: string | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_linked_accounts")
      .update({ wallet_card_id: walletCardId })
      .eq("id", linkedAccountId)
      .eq("user_id", user.id);

    revalidatePath("/settings");
  }

  async function unlinkLinkedAccount(linkedAccountId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    
    // First, get the plaid_item_id for this account
    const { data: accountData } = await supabase
      .from("user_linked_accounts")
      .select("plaid_item_id")
      .eq("id", linkedAccountId)
      .eq("user_id", user.id)
      .single();
    
    if (!accountData) return;
    
    const plaidItemId = accountData.plaid_item_id;
    
    // Delete the linked account
    await supabase
      .from("user_linked_accounts")
      .delete()
      .eq("id", linkedAccountId)
      .eq("user_id", user.id);
    
    // Check if there are any remaining accounts for this plaid item
    const { count } = await supabase
      .from("user_linked_accounts")
      .select("id", { count: "exact", head: true })
      .eq("plaid_item_id", plaidItemId)
      .eq("user_id", user.id);
    
    // If no accounts remain, delete the plaid item
    if ((count ?? 0) === 0) {
      await supabase
        .from("user_plaid_items")
        .delete()
        .eq("id", plaidItemId)
        .eq("user_id", user.id);
    }

    revalidatePath("/settings");
  }

  async function updateLinkedAccountCreditLimit(linkedAccountId: string, creditLimit: number | null) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_linked_accounts")
      .update({ manual_credit_limit: creditLimit })
      .eq("id", linkedAccountId)
      .eq("user_id", user.id);

    revalidatePath("/settings");
    revalidatePath("/compare");
  }

  // Cards that require category selection
  const cardsNeedingSelection = typedWalletCards.filter(
    (wc) => wc.cards && capsByCard[wc.cards.id]?.length > 0
  );

  // Build airline brands from user's cards with airline_miles currency
  const airlineBrands = typedWalletCards
    .filter((wc) => wc.cards?.primary_currency?.currency_type === "airline_miles")
    .map((wc) => ({
      name: wc.cards!.primary_currency!.name.replace(" Miles", "").replace(" Mileage Plan", ""),
      currencyName: wc.cards!.primary_currency!.name,
    }))
    .filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);

  // Build hotel brands from user's cards with hotel_points currency
  const hotelBrands = typedWalletCards
    .filter((wc) => wc.cards?.primary_currency?.currency_type === "hotel_points")
    .map((wc) => ({
      name: wc.cards!.primary_currency!.name.replace(" Points", "").replace(" Honors", "").replace(" Bonvoy", ""),
      currencyName: wc.cards!.primary_currency!.name,
    }))
    .filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);

  // Build portal issuers from user's cards that have portal earning rules
  type PortalRuleData = { card_id: string; cards: { issuer_id: string } | null };
  const portalIssuerIds = new Set(
    ((portalEarningRules ?? []) as unknown as PortalRuleData[])
      .map((r) => r.cards?.issuer_id)
      .filter((id): id is string => !!id)
  );
  const portalIssuers = (issuers ?? [])
    .filter((i) => portalIssuerIds.has(i.id))
    .map((i) => ({ issuerId: i.id, issuerName: i.name }));

  // Build travel subcategories (only those whose parent is "All Travel")
  type TravelCategoryData = {
    slug: string;
    name: string;
    parent: { slug: string } | null;
  };
  const travelSubcategories = ((travelCategories ?? []) as unknown as TravelCategoryData[])
    .filter((c) => c.parent?.slug === "all-travel")
    .map((c) => ({
      slug: c.slug,
      name: c.name,
    }));

  // Build programs with tiers
  type TierData = {
    id: string;
    name: string;
    multiplier: number;
    requirements: string | null;
    sort_order: number;
    has_cap: boolean;
    cap_amount: number | null;
    cap_period: string | null;
  };
  const programsWithTiers = (multiplierPrograms ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    tiers: ((p.earning_multiplier_tiers as unknown as TierData[]) ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  // Check if user has any cards with mobile pay earning rules
  const hasMobilePayCards = userCardIds.length > 0;
  
  const hasAnySettings = cardsNeedingSelection.length > 0 || programsWithTiers.length > 0 || 
    (travelSubcategories.length > 0 && (airlineBrands.length > 0 || hotelBrands.length > 0 || portalIssuers.length > 0)) ||
    (hasMobilePayCards && (allCategories ?? []).length > 0);

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} />
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

            {/* PayPal Categories */}
            {(allCategories ?? []).length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">
                  PayPal Categories
                </h2>
                <PaypalCategories
                  categories={(allCategories ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                  }))}
                  selectedCategoryIds={(paypalCategories ?? []).map((p) => p.category_id)}
                  onToggleCategory={togglePaypalCategory}
                />
              </div>
            )}

            {/* Large Purchase Categories (>$5k tracking) */}
            {(allCategories ?? []).length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Large Purchase Tracking (&gt;$5k)
                </h2>
                <LargePurchaseCategories
                  categories={(allCategories ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                  }))}
                  selectedCategoryIds={
                    (largePurchaseCategories ?? []).length > 0
                      ? (largePurchaseCategories ?? []).map((l) => l.category_id)
                      : everythingElseCategoryId ? [everythingElseCategoryId] : []
                  }
                  everythingElseCategoryId={everythingElseCategoryId}
                  onToggleCategory={toggleLargePurchaseCategory}
                />
              </div>
            )}

            {/* Debit Pay Disable - only show if enabled */}
            {debitPayEnabled && (
              <div className="rounded-xl border border-pink-800/50 bg-pink-950/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-pink-400 mb-1">
                      Debit Pay Feature
                    </h2>
                    <p className="text-sm text-zinc-400">
                      You have the secret Debit Pay feature enabled. This adds an extra earning percentage to your cards.
                    </p>
                  </div>
                  <form action={disableDebitPay}>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg border border-pink-600 text-pink-400 hover:bg-pink-950 transition-colors text-sm font-medium"
                    >
                      Disable Debit Pay
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Linked Bank Accounts - only show if account linking is enabled */}
            {accountLinkingEnabled && (
              <LinkedAccounts
                initialAccounts={(linkedAccounts ?? []).map(account => ({
                  id: account.id,
                  name: account.name,
                  official_name: account.official_name,
                  type: account.type,
                  subtype: account.subtype,
                  mask: account.mask,
                  current_balance: account.current_balance != null ? Number(account.current_balance) : null,
                  available_balance: account.available_balance != null ? Number(account.available_balance) : null,
                  credit_limit: account.credit_limit != null ? Number(account.credit_limit) : null,
                  manual_credit_limit: account.manual_credit_limit != null ? Number(account.manual_credit_limit) : null,
                  iso_currency_code: account.iso_currency_code,
                  last_balance_update: account.last_balance_update,
                  wallet_card_id: account.wallet_card_id,
                  user_plaid_items: account.user_plaid_items as { institution_name: string | null } | null,
                }))}
                walletCards={
                  // Show each wallet instance separately - linking is now by wallet instance, not card type
                  typedWalletCards
                    .filter(wc => wc.cards?.id)
                    .map(wc => ({
                      // Use wallet instance ID (user_wallets.id) for pairing
                      id: wc.id,
                      // Use custom name if set, otherwise card name
                      name: (wc as unknown as { custom_name?: string | null }).custom_name ?? wc.cards!.name,
                      issuer_name: (wc.cards as unknown as { issuers?: { name: string } | null })?.issuers?.name ?? null,
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                }
                onPairCard={pairLinkedAccount}
                onUnlinkCard={unlinkLinkedAccount}
                onUpdateCreditLimit={updateLinkedAccountCreditLimit}
              />
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

        {/* Account Management */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <AccountManagement
            userId={user.id}
            userEmail={user.emailAddresses[0]?.emailAddress}
            onDeleteAccount={async () => {
              "use server";
              const user = await currentUser();
              if (!user) return { success: false };

              const supabase = createAdminClient();
              const untypedSupabase = createUntypedClient();
              const userId = user.id;

              // Get wallet IDs first
              const { data: wallets } = await supabase
                .from("user_wallets")
                .select("id")
                .eq("user_id", userId);
              const walletIds = wallets?.map((w) => w.id) || [];

              // Delete in correct order (foreign keys)
              // Use untyped client for tables not in generated types
              await untypedSupabase.from("user_feedback").delete().eq("user_id", userId);
              await supabase.from("user_linked_accounts").delete().eq("user_id", userId);
              await supabase.from("user_plaid_items").delete().eq("user_id", userId);
              if (walletIds.length > 0) {
                await supabase.from("user_credit_usage").delete().in("user_wallet_id", walletIds);
              }
              await supabase.from("user_wallets").delete().eq("user_id", userId);
              await supabase.from("user_category_spend").delete().eq("user_id", userId);
              await supabase.from("user_feature_flags").delete().eq("user_id", userId);
              await supabase.from("user_card_selections").delete().eq("user_id", userId);
              await supabase.from("user_multiplier_tiers").delete().eq("user_id", userId);
              await supabase.from("user_travel_booking_preferences").delete().eq("user_id", userId);
              await supabase.from("user_mobile_pay_categories").delete().eq("user_id", userId);
              await supabase.from("user_paypal_categories").delete().eq("user_id", userId);
              await supabase.from("user_large_purchase_categories").delete().eq("user_id", userId);
              await supabase.from("user_card_debit_pay").delete().eq("user_id", userId);

              // Delete from Clerk
              const client = await clerkClient();
              await client.users.deleteUser(userId);

              redirect("/account-deleted");
            }}
          />
        </div>
      </div>
    </div>
  );
}

