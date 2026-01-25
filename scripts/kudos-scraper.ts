// @ts-nocheck
/**
 * Kudos Credit Card Database Scraper
 * Fetches all cards from Kudos GraphQL API and stores in Supabase
 * 
 * Usage:
 *   KUDOS_TOKEN="Bearer eyJ..." npx ts-node scripts/kudos-scraper.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// Config
const KUDOS_API_URL = 'https://graph.prod.joinkudos.com/PublicAPI/';
const PAGE_SIZE = 50;
const DELAY_BETWEEN_PAGES = 500; // ms

// Browser-like headers
const BROWSER_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.joinkudos.com',
  'Referer': 'https://www.joinkudos.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
};

// GraphQL query for fetching cards
const CARDS_QUERY = `
query SearchCards($searchTerm: String!, $from: Int, $size: Int) {
  CreditCard_searchCardsV3(
    searchTerm: $searchTerm
    factorInWallet: false
    options: { from: $from, size: $size }
  ) {
    totalResults
    cards {
      id
      name
      bank
      network
      type
      typeDescription
      currency
      accountType
      status
      issuerId
      dateCreated
      version
      alternativeNames
      
      imageUri
      thumbnailUri
      discoveryImageUri
      discoveryThumbnailUri
      url
      learnMoreURL
      payBillURL
      kudosReviewUrl
      
      annual_fee
      foreignTransactionFeePercent
      hasForeignTransactionFees
      balanceTransferFee
      balanceTransferFeePercent
      lateFee
      overLimitFee
      cashAdvanceFee
      cashAdvanceFeePercent
      introAnnualFee
      
      aprType
      minApr
      maxApr
      initialApr
      initialAprPeriod
      cashAdvanceAPR
      balanceTransferInitialApr
      introBalanceTransferPeriod
      hasBalanceTransfer
      
      minCreditScore
      maxCreditScore
      recommendedCreditScore
      
      pointCashMultiplier
      
      isBoostEligible
      isDiamondSet
      isKickstartEligible
      hasWelcomeOfferGuarantee
      isGoldenSet
      isRecommendable
      monetizedStatus
      ownershipTypeV2
      
      supportPhoneNumber
      
      kudosRatingScore
      kudosRatingEditorial
      
      issuer {
        id
        name
        phone
        url
        imageUri
        status
      }
      
      tiers { name }
      
      rewards {
        id
        cardId
        description
        amount
        multiplier
        currency
        tier { name }
        categories { id name }
        merchants { id name }
      }
      
      benefitsV2 {
        id
        title
        name
        description
        detail
        summaryTypes
        limitations
        categories { id name }
        merchants { id name }
      }
      
      cashCredits {
        id
        header
        limitations
        amount
        frequency
        calendarYearMaxAmount
        expirationDate
        imageURLS
        currency
        label
        sortOrder
        redemptionType
        type { id name description isUserEnabled }
        merchants { id name }
        categoryId
      }
      
      welcomeOffer {
        current {
          id
          captureDate
          rewardValue
          rewardCurrency
          offerCashValue
          spendRequirement
          timeLimit
          description
          startDate
          endDate
          isTargeted
          isPromotional
          isFeatured
          isGuaranteeEligible
        }
        default {
          id
          rewardValue
          rewardCurrency
          offerCashValue
          spendRequirement
          timeLimit
          description
        }
      }
      
      editorials { id cardId sortOrder }
      highlights { id cardId sortOrder }
      prosCons { id cardId sortOrder }
      
      rotatingRewardsV2 {
        id
        cardId
        amount
        currency
        description
        categories { id name }
        merchants { id name }
      }
      
      topRewards {
        amount
        currency
        categoryId
        categoryName
        merchantId
        merchantName
      }
      
      redemptionOptions { id name }
      
      applicationUrlInfo {
        id
        url
        partner { id name }
        trackingLinkTemplate
        clickThroughPartnerDisplayName
        clickThroughPartnerUrl
        finalApplicationPageDisplayName
        finalApplicationPageUrl
      }
    }
  }
}
`;

// Categories query
const CATEGORIES_QUERY = `
query GetCategories {
  Categories_getPublicAll {
    id
    name
    parentId
    averageAnnualSpend
    iconSlug
    keywords
    isSelectable
    maxRewardAmount
    maxRewardCurrency
  }
}
`;

// Types
interface KudosCard {
  id: string;
  name: string;
  bank: string | null;
  network: string | null;
  type: string | null;
  typeDescription: string | null;
  currency: string | null;
  accountType: string | null;
  status: string | null;
  issuerId: string | null;
  dateCreated: string | null;
  version: number | null;
  alternativeNames: string[] | null;
  imageUri: string | null;
  thumbnailUri: string | null;
  discoveryImageUri: string | null;
  discoveryThumbnailUri: string | null;
  url: string | null;
  learnMoreURL: string | null;
  payBillURL: string | null;
  kudosReviewUrl: string | null;
  annual_fee: string | null;
  foreignTransactionFeePercent: number | null;
  hasForeignTransactionFees: boolean | null;
  balanceTransferFee: number | null;
  balanceTransferFeePercent: number | null;
  lateFee: number | null;
  overLimitFee: number | null;
  cashAdvanceFee: number | null;
  cashAdvanceFeePercent: number | null;
  introAnnualFee: number | null;
  aprType: string | null;
  minApr: number | null;
  maxApr: number | null;
  initialApr: number | null;
  initialAprPeriod: string | null;
  cashAdvanceAPR: number | null;
  balanceTransferInitialApr: number | null;
  introBalanceTransferPeriod: string | null;
  hasBalanceTransfer: boolean | null;
  minCreditScore: number | null;
  maxCreditScore: number | null;
  recommendedCreditScore: number | null;
  pointCashMultiplier: number | null;
  isBoostEligible: boolean | null;
  isDiamondSet: boolean | null;
  isKickstartEligible: boolean | null;
  hasWelcomeOfferGuarantee: boolean | null;
  isGoldenSet: boolean | null;
  isRecommendable: boolean | null;
  monetizedStatus: string | null;
  ownershipTypeV2: string | null;
  supportPhoneNumber: string | null;
  kudosRatingScore: number | null;
  kudosRatingEditorial: string | null;
  issuer: { id: string; name: string; phone: string | null; url: string | null; imageUri: string | null; status: string | null } | null;
  tiers: { name: string }[] | null;
  rewards: KudosReward[] | null;
  benefitsV2: KudosBenefit[] | null;
  cashCredits: KudosCashCredit[] | null;
  welcomeOffer: { current: KudosWelcomeOffer | null; default: KudosWelcomeOffer | null } | null;
  editorials: { id: string; cardId: string; sortOrder: number }[] | null;
  highlights: { id: string; cardId: string; sortOrder: number }[] | null;
  prosCons: { id: string; cardId: string; sortOrder: number }[] | null;
  rotatingRewardsV2: KudosRotatingReward[] | null;
  topRewards: unknown[] | null;
  redemptionOptions: { id: string; name: string }[] | null;
  applicationUrlInfo: {
    id: string;
    url: string;
    partner: { id: string; name: string } | null;
    trackingLinkTemplate: string | null;
    clickThroughPartnerDisplayName: string | null;
    clickThroughPartnerUrl: string | null;
    finalApplicationPageDisplayName: string | null;
    finalApplicationPageUrl: string | null;
  } | null;
}

interface KudosReward {
  id: string;
  cardId: string;
  description: string | null;
  amount: number | null;
  multiplier: number | null;
  currency: string | null;
  tier: { name: string } | null;
  categories: { id: string; name: string }[];
  merchants: { id: string; name: string }[];
}

interface KudosBenefit {
  id: string;
  title: string | null;
  name: string | null;
  description: string | null;
  detail: string | null;
  summaryTypes: string[] | null;
  limitations: string | null;
  categories: { id: string; name: string }[];
  merchants: { id: string; name: string }[];
}

interface KudosCashCredit {
  id: string;
  header: string;
  limitations: string | null;
  amount: number | null;
  frequency: string | null;
  calendarYearMaxAmount: number | null;
  expirationDate: string | null;
  imageURLS: string[] | null;
  currency: string | null;
  label: string | null;
  sortOrder: number | null;
  redemptionType: string | null;
  type: { id: string; name: string; description: string | null; isUserEnabled: boolean } | null;
  merchants: { id: string; name: string }[];
  categoryId: string | null;
}

interface KudosWelcomeOffer {
  id: string;
  captureDate?: string;
  rewardValue: number | null;
  rewardCurrency: string | null;
  offerCashValue: { amount: number; currencyCode: string } | null;
  spendRequirement: { amount: number; currencyCode: string } | null;
  timeLimit: string | null;
  description: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isTargeted?: boolean;
  isPromotional?: boolean;
  isFeatured?: boolean;
  isGuaranteeEligible?: boolean;
}

interface KudosRotatingReward {
  id: string;
  cardId: string;
  amount: number | null;
  currency: string | null;
  description: string | null;
  categories: { id: string; name: string }[];
  merchants: { id: string; name: string }[];
}

interface KudosCategory {
  id: string;
  name: string;
  parentId: string | null;
  averageAnnualSpend: number | null;
  iconSlug: string | null;
  keywords: string | null;
  isSelectable: boolean;
  maxRewardAmount: number | null;
  maxRewardCurrency: string | null;
}

// Supabase client
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GraphQL request helper
async function graphqlRequest<T>(
  query: string, 
  variables: Record<string, unknown> = {},
  token: string
): Promise<T> {
  const response = await fetch(KUDOS_API_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const json = await response.json();
  
  // Log errors but don't throw - some cards have data issues
  if (json.errors) {
    console.warn('GraphQL warnings:', json.errors.length, 'errors (data still returned)');
  }

  return json.data;
}

// Fetch categories
async function fetchCategories(token: string): Promise<KudosCategory[]> {
  console.log('Fetching categories...');
  const data = await graphqlRequest<{ Categories_getPublicAll: KudosCategory[] }>(
    CATEGORIES_QUERY,
    {},
    token
  );
  return data.Categories_getPublicAll || [];
}

// Fetch all cards with pagination
async function fetchAllCards(token: string): Promise<KudosCard[]> {
  const allCards: KudosCard[] = [];
  let offset = 0;
  let totalResults = 0;

  // First request to get total count
  console.log('Fetching cards...');
  const firstResult = await graphqlRequest<{ 
    CreditCard_searchCardsV3: { totalResults: number; cards: KudosCard[] } 
  }>(CARDS_QUERY, { searchTerm: '', from: 0, size: PAGE_SIZE }, token);
  
  totalResults = firstResult.CreditCard_searchCardsV3.totalResults;
  allCards.push(...firstResult.CreditCard_searchCardsV3.cards);
  offset = PAGE_SIZE;

  console.log(`Total cards: ${totalResults}`);
  console.log(`Fetched ${allCards.length}/${totalResults}`);

  // Fetch remaining pages
  while (offset < totalResults) {
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES));
    
    const result = await graphqlRequest<{ 
      CreditCard_searchCardsV3: { totalResults: number; cards: KudosCard[] } 
    }>(CARDS_QUERY, { searchTerm: '', from: offset, size: PAGE_SIZE }, token);
    
    allCards.push(...result.CreditCard_searchCardsV3.cards);
    offset += PAGE_SIZE;
    
    console.log(`Fetched ${allCards.length}/${totalResults}`);
  }

  return allCards;
}

// Save categories to Supabase
async function saveCategories(supabase: ReturnType<typeof createClient>, categories: KudosCategory[]) {
  console.log(`Saving ${categories.length} categories...`);
  
  // Sort by parent_id to insert parents first (handle foreign key constraints)
  const sorted = [...categories].sort((a, b) => {
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return 0;
  });
  
  for (const cat of sorted) {
    const { error } = await supabase
      .from('kudos_categories')
      .upsert({
        id: cat.id,
        name: cat.name,
        parent_id: cat.parentId,
        average_annual_spend: cat.averageAnnualSpend,
        icon_slug: cat.iconSlug,
        keywords: cat.keywords,
        is_selectable: cat.isSelectable,
        max_reward_amount: cat.maxRewardAmount,
        max_reward_currency: cat.maxRewardCurrency,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error saving category ${cat.id}:`, error.message);
    }
  }
}

// Extract unique merchants from all cards
function extractMerchants(cards: KudosCard[]): Map<string, { id: string; name: string; imageUri?: string }> {
  const merchants = new Map<string, { id: string; name: string; imageUri?: string }>();
  
  for (const card of cards) {
    // From rewards
    for (const reward of card.rewards || []) {
      for (const merchant of reward.merchants || []) {
        if (!merchants.has(merchant.id)) {
          merchants.set(merchant.id, merchant);
        }
      }
    }
    // From benefits
    for (const benefit of card.benefitsV2 || []) {
      for (const merchant of benefit.merchants || []) {
        if (!merchants.has(merchant.id)) {
          merchants.set(merchant.id, merchant);
        }
      }
    }
    // From cash credits
    for (const credit of card.cashCredits || []) {
      for (const merchant of credit.merchants || []) {
        if (!merchants.has(merchant.id)) {
          merchants.set(merchant.id, merchant);
        }
      }
    }
    // From rotating rewards
    for (const rr of card.rotatingRewardsV2 || []) {
      for (const merchant of rr.merchants || []) {
        if (!merchants.has(merchant.id)) {
          merchants.set(merchant.id, merchant);
        }
      }
    }
  }
  
  return merchants;
}

// Extract unique issuers from all cards
function extractIssuers(cards: KudosCard[]): Map<string, NonNullable<KudosCard['issuer']>> {
  const issuers = new Map<string, NonNullable<KudosCard['issuer']>>();
  
  for (const card of cards) {
    if (card.issuer && !issuers.has(card.issuer.id)) {
      issuers.set(card.issuer.id, card.issuer);
    }
  }
  
  return issuers;
}

// Save issuers to Supabase
async function saveIssuers(
  supabase: ReturnType<typeof createClient>, 
  issuers: Map<string, NonNullable<KudosCard['issuer']>>
) {
  console.log(`Saving ${issuers.size} issuers...`);
  
  const records = Array.from(issuers.values()).map(issuer => ({
    id: issuer.id,
    name: issuer.name,
    phone: issuer.phone,
    url: issuer.url,
    image_uri: issuer.imageUri,
    status: issuer.status,
    updated_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('kudos_issuers')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving issuers:', error.message);
  }
}

// Save merchants to Supabase
async function saveMerchants(
  supabase: ReturnType<typeof createClient>, 
  merchants: Map<string, { id: string; name: string; imageUri?: string }>
) {
  console.log(`Saving ${merchants.size} merchants...`);
  
  const records = Array.from(merchants.values()).map(m => ({
    id: m.id,
    name: m.name,
    image_uri: m.imageUri || null,
    updated_at: new Date().toISOString(),
  }));
  
  // Batch insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('kudos_merchants')
      .upsert(chunk, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error saving merchants batch ${i}:`, error.message);
    }
  }
}

// Save a single card and all its related data
async function saveCard(supabase: ReturnType<typeof createClient>, card: KudosCard) {
  // Main card record
  const cardRecord = {
    id: card.id,
    name: card.name,
    bank: card.bank,
    network: card.network,
    type: card.type,
    type_description: card.typeDescription,
    currency: card.currency,
    account_type: card.accountType,
    status: card.status,
    issuer_id: card.issuerId,
    version: card.version,
    alternative_names: card.alternativeNames,
    image_uri: card.imageUri,
    thumbnail_uri: card.thumbnailUri,
    discovery_image_uri: card.discoveryImageUri,
    discovery_thumbnail_uri: card.discoveryThumbnailUri,
    url: card.url,
    learn_more_url: card.learnMoreURL,
    pay_bill_url: card.payBillURL,
    kudos_review_url: card.kudosReviewUrl,
    annual_fee: card.annual_fee,
    foreign_transaction_fee_percent: card.foreignTransactionFeePercent,
    has_foreign_transaction_fees: card.hasForeignTransactionFees,
    balance_transfer_fee: card.balanceTransferFee,
    balance_transfer_fee_percent: card.balanceTransferFeePercent,
    late_fee: card.lateFee,
    over_limit_fee: card.overLimitFee,
    cash_advance_fee: card.cashAdvanceFee,
    cash_advance_fee_percent: card.cashAdvanceFeePercent,
    intro_annual_fee: card.introAnnualFee,
    apr_type: card.aprType,
    min_apr: card.minApr,
    max_apr: card.maxApr,
    initial_apr: card.initialApr,
    initial_apr_period: card.initialAprPeriod,
    cash_advance_apr: card.cashAdvanceAPR,
    balance_transfer_initial_apr: card.balanceTransferInitialApr,
    intro_balance_transfer_period: card.introBalanceTransferPeriod,
    has_balance_transfer: card.hasBalanceTransfer,
    min_credit_score: card.minCreditScore,
    max_credit_score: card.maxCreditScore,
    recommended_credit_score: card.recommendedCreditScore,
    point_cash_multiplier: card.pointCashMultiplier,
    is_boost_eligible: card.isBoostEligible,
    is_diamond_set: card.isDiamondSet,
    is_kickstart_eligible: card.isKickstartEligible,
    has_welcome_offer_guarantee: card.hasWelcomeOfferGuarantee,
    is_golden_set: card.isGoldenSet,
    is_recommendable: card.isRecommendable,
    monetized_status: card.monetizedStatus,
    ownership_type: card.ownershipTypeV2,
    support_phone_number: card.supportPhoneNumber,
    kudos_rating_score: card.kudosRatingScore,
    kudos_rating_editorial: card.kudosRatingEditorial,
    application_url: card.applicationUrlInfo?.url,
    application_partner_id: card.applicationUrlInfo?.partner?.id,
    application_partner_name: card.applicationUrlInfo?.partner?.name,
    application_tracking_link_template: card.applicationUrlInfo?.trackingLinkTemplate,
    click_through_partner_name: card.applicationUrlInfo?.clickThroughPartnerDisplayName,
    click_through_partner_url: card.applicationUrlInfo?.clickThroughPartnerUrl,
    final_application_page_name: card.applicationUrlInfo?.finalApplicationPageDisplayName,
    final_application_page_url: card.applicationUrlInfo?.finalApplicationPageUrl,
    raw_data: card,
    kudos_date_created: card.dateCreated,
    updated_at: new Date().toISOString(),
  };
  
  const { error: cardError } = await supabase
    .from('kudos_cards')
    .upsert(cardRecord, { onConflict: 'id' });
  
  if (cardError) {
    console.error(`Error saving card ${card.id}:`, cardError.message);
    return;
  }
  
  // Save tiers
  if (card.tiers && card.tiers.length > 0) {
    // Delete existing tiers for this card
    await supabase.from('kudos_card_tiers').delete().eq('card_id', card.id);
    
    const tierRecords = card.tiers.map(t => ({
      card_id: card.id,
      tier_name: t.name,
    }));
    
    await supabase.from('kudos_card_tiers').insert(tierRecords);
  }
  
  // Save rewards
  if (card.rewards && card.rewards.length > 0) {
    // Delete existing rewards for this card
    await supabase.from('kudos_rewards').delete().eq('card_id', card.id);
    
    for (const reward of card.rewards) {
      const { error: rewardError } = await supabase
        .from('kudos_rewards')
        .upsert({
          id: reward.id,
          card_id: card.id,
          description: reward.description,
          amount: reward.amount,
          multiplier: reward.multiplier,
          currency: reward.currency,
          tier_name: reward.tier?.name,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (rewardError) {
        console.error(`Error saving reward ${reward.id}:`, rewardError.message);
        continue;
      }
      
      // Save reward categories
      if (reward.categories && reward.categories.length > 0) {
        await supabase.from('kudos_reward_categories').delete().eq('reward_id', reward.id);
        const catRecords = reward.categories.map(c => ({
          reward_id: reward.id,
          category_id: c.id,
        }));
        await supabase.from('kudos_reward_categories').insert(catRecords);
      }
      
      // Save reward merchants
      if (reward.merchants && reward.merchants.length > 0) {
        await supabase.from('kudos_reward_merchants').delete().eq('reward_id', reward.id);
        const merchantRecords = reward.merchants.map(m => ({
          reward_id: reward.id,
          merchant_id: m.id,
        }));
        await supabase.from('kudos_reward_merchants').insert(merchantRecords);
      }
    }
  }
  
  // Save benefits
  if (card.benefitsV2 && card.benefitsV2.length > 0) {
    await supabase.from('kudos_benefits').delete().eq('card_id', card.id);
    
    for (const benefit of card.benefitsV2) {
      const { error: benefitError } = await supabase
        .from('kudos_benefits')
        .upsert({
          id: benefit.id,
          card_id: card.id,
          title: benefit.title,
          name: benefit.name,
          description: benefit.description,
          detail: benefit.detail,
          summary_types: benefit.summaryTypes,
          limitations: benefit.limitations,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (benefitError) {
        console.error(`Error saving benefit ${benefit.id}:`, benefitError.message);
        continue;
      }
      
      // Save benefit categories
      if (benefit.categories && benefit.categories.length > 0) {
        await supabase.from('kudos_benefit_categories').delete().eq('benefit_id', benefit.id);
        const catRecords = benefit.categories.map(c => ({
          benefit_id: benefit.id,
          category_id: c.id,
        }));
        await supabase.from('kudos_benefit_categories').insert(catRecords);
      }
      
      // Save benefit merchants
      if (benefit.merchants && benefit.merchants.length > 0) {
        await supabase.from('kudos_benefit_merchants').delete().eq('benefit_id', benefit.id);
        const merchantRecords = benefit.merchants.map(m => ({
          benefit_id: benefit.id,
          merchant_id: m.id,
        }));
        await supabase.from('kudos_benefit_merchants').insert(merchantRecords);
      }
    }
  }
  
  // Save cash credits
  if (card.cashCredits && card.cashCredits.length > 0) {
    await supabase.from('kudos_cash_credits').delete().eq('card_id', card.id);
    
    for (const credit of card.cashCredits) {
      const { error: creditError } = await supabase
        .from('kudos_cash_credits')
        .upsert({
          id: credit.id,
          card_id: card.id,
          header: credit.header,
          limitations: credit.limitations,
          amount: credit.amount,
          frequency: credit.frequency,
          calendar_year_max_amount: credit.calendarYearMaxAmount,
          expiration_date: credit.expirationDate,
          image_urls: credit.imageURLS,
          currency: credit.currency,
          label: credit.label,
          sort_order: credit.sortOrder,
          redemption_type: credit.redemptionType,
          credit_type_id: credit.type?.id,
          credit_type_name: credit.type?.name,
          credit_type_description: credit.type?.description,
          category_id: credit.categoryId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (creditError) {
        console.error(`Error saving cash credit ${credit.id}:`, creditError.message);
        continue;
      }
      
      // Save cash credit merchants
      if (credit.merchants && credit.merchants.length > 0) {
        await supabase.from('kudos_cash_credit_merchants').delete().eq('cash_credit_id', credit.id);
        const merchantRecords = credit.merchants.map(m => ({
          cash_credit_id: credit.id,
          merchant_id: m.id,
        }));
        await supabase.from('kudos_cash_credit_merchants').insert(merchantRecords);
      }
    }
  }
  
  // Save welcome offers
  if (card.welcomeOffer) {
    await supabase.from('kudos_welcome_offers').delete().eq('card_id', card.id);
    
    const saveWelcomeOffer = async (offer: KudosWelcomeOffer, offerType: 'current' | 'default') => {
      const { error } = await supabase
        .from('kudos_welcome_offers')
        .upsert({
          id: `${card.id}_${offerType}`,
          card_id: card.id,
          offer_type: offerType,
          capture_date: offer.captureDate,
          reward_value: offer.rewardValue,
          reward_currency: offer.rewardCurrency,
          offer_cash_value_amount: offer.offerCashValue?.amount,
          offer_cash_value_currency: offer.offerCashValue?.currencyCode,
          spend_requirement_amount: offer.spendRequirement?.amount,
          spend_requirement_currency: offer.spendRequirement?.currencyCode,
          time_limit: offer.timeLimit,
          description: offer.description,
          start_date: offer.startDate,
          end_date: offer.endDate,
          is_targeted: offer.isTargeted,
          is_promotional: offer.isPromotional,
          is_featured: offer.isFeatured,
          is_guarantee_eligible: offer.isGuaranteeEligible,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error saving welcome offer for card ${card.id}:`, error.message);
      }
    };
    
    if (card.welcomeOffer.current) {
      await saveWelcomeOffer(card.welcomeOffer.current, 'current');
    }
    if (card.welcomeOffer.default) {
      await saveWelcomeOffer(card.welcomeOffer.default, 'default');
    }
  }
  
  // Save rotating rewards
  if (card.rotatingRewardsV2 && card.rotatingRewardsV2.length > 0) {
    await supabase.from('kudos_rotating_rewards').delete().eq('card_id', card.id);
    
    for (const rr of card.rotatingRewardsV2) {
      const { error } = await supabase
        .from('kudos_rotating_rewards')
        .upsert({
          id: rr.id,
          card_id: card.id,
          amount: rr.amount,
          currency: rr.currency,
          description: rr.description,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error saving rotating reward ${rr.id}:`, error.message);
        continue;
      }
      
      // Save categories
      if (rr.categories && rr.categories.length > 0) {
        await supabase.from('kudos_rotating_reward_categories').delete().eq('rotating_reward_id', rr.id);
        const catRecords = rr.categories.map(c => ({
          rotating_reward_id: rr.id,
          category_id: c.id,
        }));
        await supabase.from('kudos_rotating_reward_categories').insert(catRecords);
      }
      
      // Save merchants
      if (rr.merchants && rr.merchants.length > 0) {
        await supabase.from('kudos_rotating_reward_merchants').delete().eq('rotating_reward_id', rr.id);
        const merchantRecords = rr.merchants.map(m => ({
          rotating_reward_id: rr.id,
          merchant_id: m.id,
        }));
        await supabase.from('kudos_rotating_reward_merchants').insert(merchantRecords);
      }
    }
  }
  
  // Save redemption options
  if (card.redemptionOptions && card.redemptionOptions.length > 0) {
    await supabase.from('kudos_redemption_options').delete().eq('card_id', card.id);
    
    const optionRecords = card.redemptionOptions.map(o => ({
      id: `${card.id}_${o.id}`,
      card_id: card.id,
      name: o.name,
    }));
    
    await supabase.from('kudos_redemption_options').insert(optionRecords);
  }
  
  // Save editorials
  const allEditorials = [
    ...(card.editorials || []).map(e => ({ ...e, type: 'editorial' })),
    ...(card.highlights || []).map(e => ({ ...e, type: 'highlight' })),
    ...(card.prosCons || []).map(e => ({ ...e, type: 'pros_cons' })),
  ];
  
  if (allEditorials.length > 0) {
    await supabase.from('kudos_editorials').delete().eq('card_id', card.id);
    
    const editorialRecords = allEditorials.map(e => ({
      id: `${card.id}_${e.type}_${e.id}`,
      card_id: card.id,
      editorial_type: e.type,
      sort_order: e.sortOrder,
    }));
    
    await supabase.from('kudos_editorials').insert(editorialRecords);
  }
}

// Main function
async function main() {
  const token = process.env.KUDOS_TOKEN;
  
  if (!token) {
    console.error(`
Error: KUDOS_TOKEN environment variable is required.

To get your token:
1. Go to https://joinkudos.com and log in
2. Open browser DevTools (F12) -> Network tab
3. Find a request to graph.prod.joinkudos.com
4. Copy the Authorization header value

Then run:
  KUDOS_TOKEN="Bearer eyJ..." npx ts-node scripts/kudos-scraper.ts
`);
    process.exit(1);
  }

  const supabase = getSupabase();
  
  // Create scrape log entry
  const { data: logEntry, error: logError } = await supabase
    .from('kudos_scrape_log')
    .insert({
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .select()
    .single();
  
  if (logError) {
    console.error('Error creating scrape log:', logError.message);
    process.exit(1);
  }
  
  const scrapeId = logEntry.id;
  
  try {
    // Fetch categories first
    const categories = await fetchCategories(token);
    await saveCategories(supabase, categories);
    console.log(`✓ Saved ${categories.length} categories`);
    
    // Fetch all cards
    const cards = await fetchAllCards(token);
    
    // Update log with total count
    await supabase
      .from('kudos_scrape_log')
      .update({ total_cards: cards.length })
      .eq('id', scrapeId);
    
    // Extract and save issuers
    const issuers = extractIssuers(cards);
    await saveIssuers(supabase, issuers);
    console.log(`✓ Saved ${issuers.size} issuers`);
    
    // Extract and save merchants
    const merchants = extractMerchants(cards);
    await saveMerchants(supabase, merchants);
    console.log(`✓ Saved ${merchants.size} merchants`);
    
    // Save cards one by one
    console.log(`Saving ${cards.length} cards...`);
    let savedCount = 0;
    
    for (const card of cards) {
      await saveCard(supabase, card);
      savedCount++;
      
      if (savedCount % 100 === 0) {
        console.log(`  Saved ${savedCount}/${cards.length} cards`);
        
        // Update log progress
        await supabase
          .from('kudos_scrape_log')
          .update({ cards_scraped: savedCount })
          .eq('id', scrapeId);
      }
    }
    
    // Mark scrape as complete
    await supabase
      .from('kudos_scrape_log')
      .update({
        completed_at: new Date().toISOString(),
        cards_scraped: savedCount,
        status: 'completed',
      })
      .eq('id', scrapeId);
    
    console.log(`
✅ Scrape complete!
   Categories: ${categories.length}
   Issuers: ${issuers.size}
   Merchants: ${merchants.size}
   Cards: ${savedCount}
`);
    
  } catch (error) {
    // Mark scrape as failed
    await supabase
      .from('kudos_scrape_log')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq('id', scrapeId);
    
    console.error('Scrape failed:', error);
    process.exit(1);
  }
}

main();
