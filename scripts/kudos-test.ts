/**
 * Simple test to fetch one card from Kudos API
 * Emulates browser requests with proper headers
 */

const KUDOS_API_URL = 'https://graph.prod.joinkudos.com/PublicAPI/';

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

// Fixed query - removed fields that don't exist on the actual API
const TEST_QUERY = `
query TestSearch {
  CreditCard_searchCardsV3(
    searchTerm: ""
    factorInWallet: false
    options: { from: 0, size: 1 }
  ) {
    totalResults
    cards {
      # Basic Info
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
      
      # Images/URLs
      imageUri
      thumbnailUri
      discoveryImageUri
      discoveryThumbnailUri
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
      lateFee
      overLimitFee
      cashAdvanceFee
      cashAdvanceFeePercent
      introAnnualFee
      
      # APR
      aprType
      minApr
      maxApr
      initialApr
      initialAprPeriod
      cashAdvanceAPR
      balanceTransferInitialApr
      introBalanceTransferPeriod
      hasBalanceTransfer
      
      # Credit Score
      minCreditScore
      maxCreditScore
      recommendedCreditScore
      
      # Points/Rewards
      pointCashMultiplier
      
      # Flags
      isBoostEligible
      isDiamondSet
      isKickstartEligible
      hasWelcomeOfferGuarantee
      isGoldenSet
      isRecommendable
      monetizedStatus
      ownershipTypeV2
      
      # Support
      supportPhoneNumber
      
      # Ratings
      kudosRatingScore
      kudosRatingEditorial
      
      # Issuer
      issuer {
        id
        name
        phone
        url
        imageUri
        status
      }
      
      # Tiers
      tiers {
        name
      }
      
      # Rewards (earn rates)
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
      
      # Benefits (perks like insurance)
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
      
      # Cash Credits (airline credits, etc)
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
      
      # Welcome Offer
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
      
      # Editorials (reviews, pros/cons)
      editorials { id cardId sortOrder }
      highlights { id cardId sortOrder }
      prosCons { id cardId sortOrder }
      
      # Rotating Rewards
      rotatingRewardsV2 {
        id
        cardId
        amount
        currency
        description
        categories { id name }
        merchants { id name }
      }
      
      # Top Rewards
      topRewards {
        amount
        currency
        categoryId
        categoryName
        merchantId
        merchantName
      }
      
      # Redemption Options
      redemptionOptions {
        id
        name
      }
      
      # Application URL
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

async function main() {
  const token = process.env.KUDOS_TOKEN;
  
  if (!token) {
    console.error('KUDOS_TOKEN required');
    process.exit(1);
  }

  const response = await fetch(KUDOS_API_URL, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    body: JSON.stringify({ query: TEST_QUERY }),
  });

  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

main();
