import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { OffersTable } from "./offers-table";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";

export const metadata: Metadata = {
  title: "Card Offers | CardTool",
  description: "Compare credit card signup bonuses and offers",
};

export default async function OffersPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();

  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  // Fetch all data in parallel
  const [
    cardsResult,
    userWalletResult,
    userPlayersResult,
    userCurrencyValuesResult,
    userPointSettingsResult,
    defaultTemplateResult,
    allCurrenciesResult,
    allIssuersResult,
    allBrandsResult,
    allCategoriesResult,
  ] = await Promise.all([
    supabase.from("cards").select(`
      id,
      name,
      slug,
      annual_fee,
      default_earn_rate,
      image_url,
      official_name,
      product_type,
      exclude_from_recommendations,
      no_foreign_transaction_fees,
      secondary_currency_id,
      issuers:issuer_id (id, name),
      brands:brand_id (id, name),
      primary_currency:reward_currencies!cards_primary_currency_id_fkey (
        id, name, code, base_value_cents, currency_type
      ),
      secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (
        id, name, code, base_value_cents, currency_type
      ),
      card_offers!inner (
        id,
        is_active,
        is_archived,
        offer_description,
        internal_description,
        offer_type,
        first_year_af_waived,
        expires_at,
        application_url,
        card_offer_bonuses (
          id,
          component_type,
          spend_requirement_cents,
          time_period,
          time_period_unit,
          points_amount,
          currency_id,
          cash_amount_cents,
          benefit_description,
          default_benefit_value_cents
        ),
        card_offer_elevated_earnings (
          id,
          elevated_rate,
          duration_months,
          duration_unit,
          category_id
        ),
        card_offer_intro_apr (
          id,
          apr_type,
          apr_rate,
          duration,
          duration_unit
        )
      )
    `)
    .eq("is_active", true)
    .eq("card_offers.is_active", true)
    .eq("card_offers.is_archived", false)
    .order("name"),
    // Get user's wallet with player numbers and approval dates for card rules
    supabase.from("user_wallets")
      .select(`
        card_id, 
        player_number, 
        approval_date,
        cards!inner (
          id,
          product_type,
          card_charge_type,
          issuer_id,
          brand_id,
          primary_currency_id,
          issuers!inner (id, name),
          brands:brand_id (id, name)
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),
    // Get user's player descriptions
    supabase.from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId),
    // Get user's custom currency values
    supabase.from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", effectiveUserId),
    // Get user's selected template
    supabase.from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    // Get default template
    supabase.from("point_value_templates")
      .select("id")
      .eq("is_default", true)
      .single(),
    // Get all currencies for bonus value calculation
    supabase.from("reward_currencies")
      .select("id, name, code, base_value_cents, currency_type"),
    // Get all issuers for filtering
    supabase.from("issuers")
      .select("id, name")
      .order("name"),
    // Get all brands for filtering
    supabase.from("brands")
      .select("id, name")
      .order("name"),
    // Get all categories for elevated earnings display
    supabase.from("earning_categories")
      .select("id, name"),
  ]);

  // Get template values
  const selectedTemplateId = userPointSettingsResult.data?.selected_template_id ?? defaultTemplateResult.data?.id;
  let templateValuesByCurrency = new Map<string, number>();
  if (selectedTemplateId) {
    const { data: templateValues } = await supabase
      .from("template_currency_values")
      .select("currency_id, value_cents")
      .eq("template_id", selectedTemplateId);

    templateValuesByCurrency = new Map(
      templateValues?.map((v) => [v.currency_id, parseFloat(String(v.value_cents))]) ?? []
    );
  }

  const allCurrencies = allCurrenciesResult.data;
  const allIssuers = allIssuersResult.data;
  const allBrands = allBrandsResult.data;
  const allCategories = allCategoriesResult.data;

  // User overrides take precedence
  const userValuesByCurrency = new Map(
    userCurrencyValuesResult.data?.map((v) => [v.currency_id, v.value_cents]) ?? []
  );

  // Build player descriptions map
  const playerDescriptions = new Map(
    userPlayersResult.data?.map((p) => [p.player_number, p.description ?? `P${p.player_number}`]) ?? []
  );

  // Get all unique player numbers from wallet
  const allPlayerNumbers = new Set<number>();
  (userWalletResult.data ?? []).forEach((w) => {
    if (w.player_number) allPlayerNumbers.add(w.player_number);
  });
  // Also add any from user_players
  (userPlayersResult.data ?? []).forEach((p) => {
    if (p.player_number) allPlayerNumbers.add(p.player_number);
  });

  // Build players array for filters
  const players = Array.from(allPlayerNumbers).sort().map((pn) => ({
    playerNumber: pn,
    description: playerDescriptions.get(pn) ?? `P${pn}`,
  }));

  // Build wallet map: card_id -> Set of player numbers (deduplicated)
  const walletByCard = new Map<string, Set<number>>();
  (userWalletResult.data ?? []).forEach((w) => {
    if (!w.player_number) return;
    if (!walletByCard.has(w.card_id)) {
      walletByCard.set(w.card_id, new Set());
    }
    walletByCard.get(w.card_id)!.add(w.player_number);
  });

  // Build playerCurrencies map: player -> Set of currency IDs their cards earn
  const playerCurrencies = new Map<number, Set<string>>();
  (userWalletResult.data ?? []).forEach((w) => {
    if (!w.player_number || !w.cards) return;
    const cardData = w.cards as unknown as { primary_currency_id: string | null };
    const currencyId = cardData.primary_currency_id;
    if (!currencyId) return;
    
    if (!playerCurrencies.has(w.player_number)) {
      playerCurrencies.set(w.player_number, new Set());
    }
    playerCurrencies.get(w.player_number)!.add(currencyId);
  });

  // Build wallet cards for card rules (with issuer/product type/brand info)
  type WalletCardForRules = {
    cardId: string;
    playerNumber: number;
    approvalDate: string | null;
    issuerId: string;
    issuerName: string;
    brandName: string | null;
    productType: "personal" | "business";
    cardChargeType: "credit" | "charge" | null;
  };
  
  const walletCardsForRules: WalletCardForRules[] = (userWalletResult.data ?? [])
    .filter((w) => w.player_number && w.cards)
    .map((w) => {
      const cardData = w.cards as unknown as {
        id: string;
        product_type: "personal" | "business";
        card_charge_type: "credit" | "charge" | null;
        issuer_id: string;
        issuers: { id: string; name: string };
        brands: { id: string; name: string } | null;
      };
      return {
        cardId: cardData.id,
        playerNumber: w.player_number!,
        approvalDate: w.approval_date,
        issuerId: cardData.issuer_id,
        issuerName: cardData.issuers?.name ?? "Unknown",
        brandName: cardData.brands?.name ?? null,
        productType: cardData.product_type ?? "personal",
        cardChargeType: cardData.card_charge_type,
      };
    });

  const currencyMap = new Map(allCurrencies?.map((c) => [c.id, c]) ?? []);
  const categoryMap = new Map(allCategories?.map((c) => [c.id, c.name]) ?? []);

  // Helper to get currency value
  const getCurrencyValue = (currencyId: string | null) => {
    if (!currencyId) return 1;
    return userValuesByCurrency.get(currencyId)
      ?? templateValuesByCurrency.get(currencyId)
      ?? currencyMap.get(currencyId)?.base_value_cents
      ?? 1;
  };

  // Transform cards for the table
  type CardData = {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    image_url: string | null;
    official_name: string | null;
    product_type: "personal" | "business";
    exclude_from_recommendations: boolean;
    no_foreign_transaction_fees: boolean | null;
    secondary_currency_id: string | null;
    issuers: { id: string; name: string } | null;
    brands: { id: string; name: string } | null;
    primary_currency: { id: string; name: string; code: string; base_value_cents: number | null; currency_type: string } | null;
    secondary_currency: { id: string; name: string; code: string; base_value_cents: number | null; currency_type: string } | null;
    card_offers: Array<{
      id: string;
      is_active: boolean | null;
      is_archived: boolean | null;
      offer_description: string | null;
      internal_description: string | null;
      offer_type: string;
      first_year_af_waived: boolean | null;
      expires_at: string | null;
      application_url: string | null;
      card_offer_bonuses: Array<{
        id: string;
        component_type: string;
        spend_requirement_cents: number;
        time_period: number;
        time_period_unit: string;
        points_amount: number | null;
        currency_id: string | null;
        cash_amount_cents: number | null;
        benefit_description: string | null;
        default_benefit_value_cents: number | null;
      }>;
      card_offer_elevated_earnings: Array<{
        id: string;
        elevated_rate: number;
        duration_months: number | null;
        duration_unit: string;
        category_id: number | null;
      }>;
      card_offer_intro_apr: Array<{
        id: string;
        apr_type: string;
        apr_rate: number;
        duration: number;
        duration_unit: string;
      }>;
    }>;
  };

  // Create one row per offer (a card with multiple offers will appear multiple times)
  const cardsWithOffers = ((cardsResult.data ?? []) as unknown as CardData[]).flatMap((card) => {
    // Get players who own this card (from Set, already deduplicated)
    const playerNumbers = walletByCard.get(card.id);
    const cardPlayers = playerNumbers 
      ? Array.from(playerNumbers).map((pn) => ({
          playerNumber: pn,
          playerName: playerDescriptions.get(pn) ?? `P${pn}`,
        }))
      : [];

    const cardCurrencyValue = getCurrencyValue(card.primary_currency?.id ?? null);

    // Map each offer to a row
    return card.card_offers.map((offer) => {
      const bonuses = offer?.card_offer_bonuses ?? [];
      const elevatedEarnings = offer?.card_offer_elevated_earnings ?? [];
      const introAprs = offer?.card_offer_intro_apr ?? [];

      // Calculate total bonus value
      let totalBonusValue = 0;
      let primarySpendRequirement = 0;

      for (const bonus of bonuses) {
        if (bonus.spend_requirement_cents > primarySpendRequirement) {
          primarySpendRequirement = bonus.spend_requirement_cents;
        }

        if (bonus.component_type === "points" && bonus.points_amount && bonus.currency_id) {
          const currencyValue = getCurrencyValue(bonus.currency_id);
          totalBonusValue += (bonus.points_amount * currencyValue) / 100;
        } else if (bonus.component_type === "cash" && bonus.cash_amount_cents) {
          totalBonusValue += bonus.cash_amount_cents / 100;
        } else if (bonus.component_type === "benefit" && bonus.default_benefit_value_cents) {
          totalBonusValue += bonus.default_benefit_value_cents / 100;
        }
      }

      // Calculate return on spend (including points earned from spend)
      const spendDollars = primarySpendRequirement / 100;
      let returnOnSpend = 0;
      
      if (spendDollars > 1) {
        // Normal calculation for spend > $1
        const earnRate = card.default_earn_rate ?? 1;
        const earnedValue = (spendDollars * earnRate * cardCurrencyValue) / 100;
        returnOnSpend = ((totalBonusValue + earnedValue) / spendDollars) * 100;
      } else if (totalBonusValue > 0) {
        // $0 or $1 spend requirement with a bonus = infinite return
        returnOnSpend = Infinity;
      }

      return {
        id: `${card.id}-${offer.id}`, // Unique key combining card and offer
        cardId: card.id,
        name: card.name,
        slug: card.slug,
        officialName: card.official_name,
        imageUrl: card.image_url,
        annualFee: card.annual_fee,
        productType: card.product_type,
        issuerName: card.issuers?.name ?? "Unknown",
        issuerId: card.issuers?.id ?? "",
        brandName: card.brands?.name ?? null,
        brandId: card.brands?.id ?? null,
        currencyCode: card.primary_currency?.code ?? "???",
        currencyName: card.primary_currency?.name ?? "Unknown",
        currencyType: card.primary_currency?.currency_type ?? "other",
        currencyId: card.primary_currency?.id ?? null,
        currencyValue: cardCurrencyValue,
        secondaryCurrencyId: card.secondary_currency_id,
        secondaryCurrencyName: card.secondary_currency?.name ?? null,
        secondaryCurrencyCode: card.secondary_currency?.code ?? null,
        secondaryCurrencyValue: card.secondary_currency?.id ? getCurrencyValue(card.secondary_currency.id) : null,
        defaultEarnRate: card.default_earn_rate ?? 1,
        players: cardPlayers,
        isExcluded: card.exclude_from_recommendations,
        offer: {
          id: offer.id,
          description: offer.offer_description,
          internalDescription: offer.internal_description,
          offerType: offer.offer_type as "referral" | "affiliate" | "direct" | "nll" | "elevated" | "targeted",
          firstYearAfWaived: offer.first_year_af_waived ?? false,
          expiresAt: offer.expires_at,
          applicationUrl: offer.application_url,
          bonuses: bonuses.map((b) => ({
            id: b.id,
            type: b.component_type as "points" | "cash" | "benefit",
            spendRequirement: b.spend_requirement_cents / 100,
            timePeriod: b.time_period,
            timePeriodUnit: b.time_period_unit,
            pointsAmount: b.points_amount,
            currencyId: b.currency_id,
            currencyName: b.currency_id ? currencyMap.get(b.currency_id)?.name ?? null : null,
            currencyValue: b.currency_id ? getCurrencyValue(b.currency_id) : null,
            cashAmount: b.cash_amount_cents ? b.cash_amount_cents / 100 : null,
            benefitDescription: b.benefit_description,
            benefitValue: b.default_benefit_value_cents ? b.default_benefit_value_cents / 100 : null,
          })),
          elevatedEarnings: elevatedEarnings.map((e) => ({
            id: e.id,
            elevatedRate: e.elevated_rate,
            durationMonths: e.duration_months,
            durationUnit: e.duration_unit,
            categoryId: e.category_id,
            categoryName: e.category_id ? categoryMap.get(e.category_id) ?? null : null,
          })),
          introAprs: introAprs.map((a) => ({
            id: a.id,
            aprType: a.apr_type,
            aprRate: a.apr_rate,
            duration: a.duration,
            durationUnit: a.duration_unit,
          })),
        },
        bonusValue: totalBonusValue,
        spendRequirement: spendDollars,
        returnOnSpend,
      };
    });
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Card Offers</h1>
          <p className="text-zinc-400">
            Compare credit card signup bonuses and offers
          </p>
        </div>

        <OffersTable
          cards={cardsWithOffers}
          brands={allBrands ?? []}
          currencies={allCurrencies?.map((c) => ({ id: c.id, name: c.name, code: c.code })) ?? []}
          players={players}
          walletCardsForRules={walletCardsForRules}
          playerCurrencies={Object.fromEntries(
            Array.from(playerCurrencies.entries()).map(([pn, set]) => [pn, Array.from(set)])
          )}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
