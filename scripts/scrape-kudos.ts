/**
 * Kudos Credit Card Database Scraper
 * 
 * This script scrapes all credit card data from the Kudos GraphQL API.
 * 
 * Prerequisites:
 * 1. Get your access token from joinkudos.com:
 *    - Open browser DevTools (F12)
 *    - Go to Network tab
 *    - Look for requests to graph.prod.joinkudos.com
 *    - Copy the Authorization header value (should be "Bearer <token>")
 * 
 * Usage:
 *   KUDOS_TOKEN="your_token_here" npx ts-node scripts/scrape-kudos.ts
 * 
 * Or export the token first:
 *   export KUDOS_TOKEN="your_token_here"
 *   npx ts-node scripts/scrape-kudos.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KUDOS_API_URL = 'https://graph.prod.joinkudos.com/PublicAPI/';

// Comprehensive Card fragment with all available fields
const CARD_FRAGMENT = `
fragment CardFields on Card {
  id
  name
  bank
  network
  type
  typeDescription
  currency
  accountType
  
  # Images
  imageUri
  thumbnailUri
  discoveryImageUri
  discoveryThumbnailUri
  
  # URLs
  url
  learnMoreURL
  payBillURL
  kudosReviewUrl
  
  # Fees
  annual_fee
  foreignTransactionFeePercent
  hasForeignTransactionFees
  balanceTransferFee
  balanceTransferFeePercent
  balanceTransferFeeMinPercent
  balanceTransferFeeMaxPercent
  lateFee
  overLimitFee
  cashAdvanceFee
  cashAdvanceFeePercent
  
  # APR
  aprType
  minApr
  maxApr
  initialApr
  initialAprPeriod {
    value
    unit
  }
  cashAdvanceAPR
  balanceTransferInitialApr
  introBalanceTransferPeriod
  introAnnualFee
  
  # Credit Score
  minCreditScore
  maxCreditScore
  recommendedCreditScore
  
  # Rewards
  pointCashMultiplier
  
  # Status/Flags
  status
  reviewStatus
  isBoostEligible
  isDiamondSet
  isKickstartEligible
  hasWelcomeOfferGuarantee
  isGoldenSet
  isRecommendable
  hasBalanceTransfer
  monetizedStatus
  
  # Issuer
  issuerId
  issuer {
    id
    name
    phone
    url
    imageUri
    status
  }
  
  # Support
  supportPhoneNumber
  
  # Ratings
  kudosRatingScore
  kudosRatingEditorial
  
  # Alternative Names
  alternativeNames
  
  # Tiers
  tiers {
    id
    name
    description
    requirements
    isDefault
  }
  
  # Ownership
  ownershipTypeV2
  
  # Dates
  dateCreated
  
  # Version
  version
}
`;

const REWARDS_FRAGMENT = `
fragment RewardFields on StandardReward {
  id
  cardId
  description
  amount
  multiplier
  currency
  tier {
    id
    name
  }
  categories {
    id
    name
    imageUri
  }
  merchants {
    id
    name
    imageUri
  }
}
`;

const BENEFIT_FRAGMENT = `
fragment BenefitFields on Benefit {
  id
  title
  name
  description
  detail
  summaryTypes
  limitations
  categories {
    id
    name
  }
  merchants {
    id
    name
  }
}
`;

const CASH_CREDIT_FRAGMENT = `
fragment CashCreditFields on CardCashCredit {
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
  type {
    id
    name
    description
    isUserEnabled
  }
  merchants {
    id
    name
  }
  categoryId
}
`;

const WELCOME_OFFER_FRAGMENT = `
fragment WelcomeOfferFields on WelcomeOffer {
  current {
    id
    captureDate
    rewardValue
    rewardCurrency
    offerCashValue {
      amount
      currency
    }
    spendRequirement {
      amount
      currency
    }
    timeLimit {
      value
      unit
    }
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
    captureDate
    rewardValue
    rewardCurrency
    offerCashValue {
      amount
      currency
    }
    spendRequirement {
      amount
      currency
    }
    timeLimit {
      value
      unit
    }
    description
    startDate
    endDate
    isTargeted
    isPromotional
    isFeatured
    isGuaranteeEligible
  }
}
`;

const EDITORIAL_FRAGMENT = `
fragment EditorialFields on CardEditorial {
  id
  cardId
  type
  category
  text
  sortOrder
}
`;

const ROTATING_REWARD_FRAGMENT = `
fragment RotatingRewardFields on RotatingReward {
  id
  cardId
  amount
  currency
  startDate
  endDate
  description
  categories {
    id
    name
  }
  merchants {
    id
    name
  }
}
`;

// Search query to get card IDs with basic info
const SEARCH_CARDS_QUERY = `
${CARD_FRAGMENT}
${REWARDS_FRAGMENT}
${BENEFIT_FRAGMENT}
${CASH_CREDIT_FRAGMENT}
${WELCOME_OFFER_FRAGMENT}
${EDITORIAL_FRAGMENT}
${ROTATING_REWARD_FRAGMENT}

query SearchCards($searchTerm: String!, $from: Int, $size: Int) {
  CreditCard_searchCardsV3(
    searchTerm: $searchTerm
    factorInWallet: false
    options: {
      from: $from
      size: $size
    }
  ) {
    totalResults
    cards {
      ...CardFields
      rewards {
        ...RewardFields
      }
      benefitsV2 {
        ...BenefitFields
      }
      cashCredits {
        ...CashCreditFields
      }
      welcomeOffer {
        ...WelcomeOfferFields
      }
      editorials {
        ...EditorialFields
      }
      highlights {
        ...EditorialFields
      }
      prosCons {
        ...EditorialFields
      }
      rotatingRewardsV2 {
        ...RotatingRewardFields
      }
      topRewards {
        id
        description
        amount
        currency
        categories {
          id
          name
        }
        merchants {
          id
          name
        }
      }
      redemptionOptions {
        id
        name
        description
        multiplier
        imageUri
        redemptionType
      }
      applicationUrlInfo {
        id
        url
        partner {
          id
          name
        }
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

// Get all issuers
const GET_ISSUERS_QUERY = `
query GetIssuers {
  CreditCard_getTopIssuers {
    id
    name
    phone
    url
    imageUri
    status
  }
}
`;

// Get all categories
const GET_CATEGORIES_QUERY = `
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

async function graphqlRequest<T>(
  query: string, 
  variables: Record<string, unknown> = {},
  token: string
): Promise<T> {
  const response = await fetch(KUDOS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    console.error('GraphQL Errors:', JSON.stringify(json.errors, null, 2));
    throw new Error(`GraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return json.data;
}

interface SearchResult {
  CreditCard_searchCardsV3: {
    totalResults: number;
    cards: unknown[];
  };
}

interface IssuerResult {
  CreditCard_getTopIssuers: unknown[];
}

interface CategoryResult {
  Categories_getPublicAll: unknown[];
}

async function scrapeAllCards(token: string): Promise<unknown[]> {
  const allCards: unknown[] = [];
  const pageSize = 50;
  let offset = 0;
  let totalResults = 0;

  console.log('Starting card scrape...');

  // First request to get total count
  const firstResult = await graphqlRequest<SearchResult>(
    SEARCH_CARDS_QUERY,
    { searchTerm: '', from: 0, size: pageSize },
    token
  );
  
  totalResults = firstResult.CreditCard_searchCardsV3.totalResults;
  allCards.push(...firstResult.CreditCard_searchCardsV3.cards);
  offset = pageSize;

  console.log(`Total cards to fetch: ${totalResults}`);
  console.log(`Fetched ${allCards.length}/${totalResults} cards`);

  // Fetch remaining pages
  while (offset < totalResults) {
    const result = await graphqlRequest<SearchResult>(
      SEARCH_CARDS_QUERY,
      { searchTerm: '', from: offset, size: pageSize },
      token
    );
    
    allCards.push(...result.CreditCard_searchCardsV3.cards);
    offset += pageSize;
    
    console.log(`Fetched ${allCards.length}/${totalResults} cards`);
    
    // Small delay to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return allCards;
}

async function scrapeIssuers(token: string): Promise<unknown[]> {
  console.log('Fetching issuers...');
  const result = await graphqlRequest<IssuerResult>(GET_ISSUERS_QUERY, {}, token);
  return result.CreditCard_getTopIssuers;
}

async function scrapeCategories(token: string): Promise<unknown[]> {
  console.log('Fetching categories...');
  const result = await graphqlRequest<CategoryResult>(GET_CATEGORIES_QUERY, {}, token);
  return result.Categories_getPublicAll;
}

async function main() {
  const token = process.env.KUDOS_TOKEN;
  
  if (!token) {
    console.error(`
Error: KUDOS_TOKEN environment variable is required.

To get your token:
1. Go to https://joinkudos.com and log in
2. Open browser DevTools (F12) -> Network tab
3. Refresh the page or navigate around
4. Find a request to graph.prod.joinkudos.com
5. Copy the Authorization header value

Then run:
  KUDOS_TOKEN="Bearer eyJ..." npx ts-node scripts/scrape-kudos.ts
`);
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '..', 'kudos-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Scrape categories first (useful for reference)
    const categories = await scrapeCategories(token);
    fs.writeFileSync(
      path.join(outputDir, 'categories.json'),
      JSON.stringify(categories, null, 2)
    );
    console.log(`Saved ${categories.length} categories`);

    // Scrape issuers
    const issuers = await scrapeIssuers(token);
    fs.writeFileSync(
      path.join(outputDir, 'issuers.json'),
      JSON.stringify(issuers, null, 2)
    );
    console.log(`Saved ${issuers.length} issuers`);

    // Scrape all cards
    const cards = await scrapeAllCards(token);
    fs.writeFileSync(
      path.join(outputDir, 'cards.json'),
      JSON.stringify(cards, null, 2)
    );
    console.log(`Saved ${cards.length} cards`);

    // Create a summary file
    const summary = {
      scrapedAt: new Date().toISOString(),
      totalCards: cards.length,
      totalIssuers: issuers.length,
      totalCategories: categories.length,
    };
    fs.writeFileSync(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n✅ Scrape complete!');
    console.log(`Data saved to: ${outputDir}`);
    console.log(`  - cards.json (${cards.length} cards)`);
    console.log(`  - issuers.json (${issuers.length} issuers)`);
    console.log(`  - categories.json (${categories.length} categories)`);
    console.log(`  - summary.json`);

  } catch (error) {
    console.error('Scrape failed:', error);
    process.exit(1);
  }
}

main();
