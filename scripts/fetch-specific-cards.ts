// @ts-nocheck
/**
 * Fetch specific cards from Kudos API and save to JSON
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KUDOS_API_URL = 'https://graph.prod.joinkudos.com/PublicAPI/';

const BROWSER_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.joinkudos.com',
  'Referer': 'https://www.joinkudos.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Cards to fetch
const CARDS_TO_FETCH = [
  'Bilt Obsidian',
  'PenFed Pathfinder',
  'Business Platinum Card from American Express',
  'Chase Sapphire Reserve',
];

const CARD_QUERY = `
query SearchCards($searchTerm: String!) {
  CreditCard_searchCardsV3(
    searchTerm: $searchTerm
    factorInWallet: false
    options: { from: 0, size: 5 }
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

async function fetchCard(searchTerm: string, token: string) {
  console.log(`Fetching: ${searchTerm}...`);
  
  const response = await fetch(KUDOS_API_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      query: CARD_QUERY, 
      variables: { searchTerm } 
    }),
  });

  const json = await response.json();
  
  if (json.errors) {
    console.warn(`  Warnings for ${searchTerm}:`, json.errors.length);
  }
  
  const cards = json.data?.CreditCard_searchCardsV3?.cards || [];
  console.log(`  Found ${cards.length} results`);
  
  // Return the first match that closely matches the search term
  const exactMatch = cards.find((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase().split(' ')[0])
  );
  
  return exactMatch || cards[0];
}

async function main() {
  const token = process.env.KUDOS_TOKEN;
  
  if (!token) {
    console.error('KUDOS_TOKEN required');
    process.exit(1);
  }

  const results: any[] = [];
  
  for (const cardName of CARDS_TO_FETCH) {
    const card = await fetchCard(cardName, token);
    if (card) {
      results.push(card);
      console.log(`  ✓ Got: ${card.name}`);
    } else {
      console.log(`  ✗ Not found: ${cardName}`);
    }
  }

  // Save to JSON file
  const outputPath = path.join(__dirname, '..', 'public', 'kudos-cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved ${results.length} cards to ${outputPath}`);
  
  // Also log card names
  console.log('\nCards fetched:');
  results.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (${c.bank})`);
  });
}

main();
