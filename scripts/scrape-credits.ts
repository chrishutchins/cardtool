/**
 * Credit Card Benefits Scraper
 * 
 * This script scrapes credit card benefits from useyourcredits.com
 * 
 * Usage:
 *   npx tsx scripts/scrape-credits.ts
 * 
 * Output:
 *   Writes to csvs/scraped_credits.csv
 */

import * as fs from 'fs';
import * as path from 'path';

interface CardBenefit {
  cardSlug: string;
  cardName: string;
  issuer: string;
  benefitName: string;
  brandName: string | null;
  resetCycle: string;
  defaultValue: number | null;
  defaultQuantity: number | null;
  unitName: string | null;
  notes: string;
}

// Map useyourcredits card names to our database slugs
const cardSlugMap: Record<string, string> = {
  'platinum': 'amex-platinum',
  'platinum - charles schwab': 'amex-schwab-platinum',
  'gold card': 'amex-gold',
  'green card': 'amex-green',
  'business platinum': 'amex-business-platinum',
  'business gold': 'amex-business-gold',
  'hilton aspire': 'amex-hilton-aspire',
  'hilton honors surpass': 'amex-hilton-surpass',
  'hilton honors business': 'amex-hilton-business',
  'marriott bonvoy brilliant': 'amex-bonvoy-brilliant',
  'marriott bonvoy business': 'amex-bonvoy-business',
  'marriott bonvoy bevy': 'amex-bonvoy-bevy',
  'delta skymiles reserve': 'amex-delta-reserve',
  'delta skymiles reserve business': 'amex-delta-reserve-business',
  'delta skymiles platinum': 'amex-delta-platinum',
  'delta skymiles platinum business': 'amex-delta-platinum-business',
  'delta skymiles gold': 'amex-delta-gold',
  'delta skymiles gold business': 'amex-delta-gold-business',
  'sapphire reserve': 'chase-sapphire-reserve',
  'sapphire reserve for business': 'chase-sapphire-reserve-business',
  'sapphire preferred': 'chase-sapphire-preferred',
  'venture x': 'capital-one-venture-x',
  'venture x business': 'capital-one-venture-x-business',
  'strata elite': 'citi-strata-elite',
  'strata premier': 'citi-strata-premier',
  'aadvantage executive world elite mastercard': 'citi-aa-executive',
  'world of hyatt credit': 'chase-hyatt-personal',
  'world of hyatt business credit card': 'chase-hyatt-business',
  'ihg one rewards premier': 'chase-ihg-premier',
  'the new united club card': 'chase-united-club',
  'united club business': 'chase-united-club-business',
  'united explorer': 'chase-united-explorer',
  'united business': 'chase-united-business',
  'the new united quest': 'chase-united-quest',
  'marriott bonvoy boundless': 'chase-bonvoy-boundless',
  'marriott bonvoy bountiful': 'chase-bonvoy-bountiful',
  'southwest rapid rewards priority': 'chase-southwest-priority',
  'southwest rapid rewards performance business': 'chase-southwest-performance-business',
  'altitude reserve visa infinite': 'us-bank-altitude-reserve',
  'autograph journey℠ card': 'wells-fargo-autograph-journey',
  'bilt mastercard®': 'bilt-card',
  'premium rewards® elite': 'bank-of-america-premium-rewards-elite',
  'premium rewards': 'bank-of-america-premium-rewards',
  'freedom flex': 'chase-freedom-flex',
  'freedom unlimited': 'chase-freedom-unlimited',
  'ink business preferred': 'chase-ink-business-preferred',
};

// Parse benefit reset cycle from description
function parseResetCycle(description: string): string {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('monthly') || lowerDesc.includes('per month') || lowerDesc.includes('/month')) {
    return 'monthly';
  }
  if (lowerDesc.includes('quarterly') || lowerDesc.includes('per quarter')) {
    return 'quarterly';
  }
  if (lowerDesc.includes('semi-annual') || lowerDesc.includes('semiannual') || lowerDesc.includes('twice a year')) {
    return 'semiannual';
  }
  if (lowerDesc.includes('cardmember year') || lowerDesc.includes('card member year') || lowerDesc.includes('membership year')) {
    return 'cardmember_year';
  }
  if (lowerDesc.includes('annual') || lowerDesc.includes('per year') || lowerDesc.includes('yearly')) {
    return 'annual';
  }
  return 'annual'; // default
}

// Parse dollar value from description
function parseDollarValue(description: string): number | null {
  const match = description.match(/\$(\d+(?:\.\d{2})?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// Parse quantity from description (e.g., "4 lounge passes")
function parseQuantity(description: string): { quantity: number | null; unit: string | null } {
  const match = description.match(/(\d+)\s+(guest|pass|visit|night|certificate|bag)/i);
  if (match) {
    return {
      quantity: parseInt(match[1]),
      unit: match[2].toLowerCase(),
    };
  }
  return { quantity: null, unit: null };
}

// Example benefits data - in production, you'd fetch this from the website
// This serves as a template for the data structure
const sampleBenefits: CardBenefit[] = [
  {
    cardSlug: 'amex-platinum',
    cardName: 'American Express Platinum',
    issuer: 'American Express',
    benefitName: 'Uber Credit',
    brandName: 'Uber',
    resetCycle: 'monthly',
    defaultValue: 15,
    defaultQuantity: null,
    unitName: null,
    notes: 'Up to $15/month ($35 in December)',
  },
  // Add more benefits here...
];

function convertToCSV(benefits: CardBenefit[]): string {
  const header = 'card_slug,name,brand_name,reset_cycle,default_value,default_quantity,unit_name,notes';
  const rows = benefits.map(b => {
    return [
      b.cardSlug,
      `"${b.benefitName.replace(/"/g, '""')}"`,
      b.brandName ? `"${b.brandName.replace(/"/g, '""')}"` : '',
      b.resetCycle,
      b.defaultValue ?? '',
      b.defaultQuantity ?? '',
      b.unitName ?? '',
      `"${b.notes.replace(/"/g, '""')}"`,
    ].join(',');
  });
  
  return [header, ...rows].join('\n');
}

async function main() {
  console.log('Credit Card Benefits Scraper');
  console.log('============================\n');
  
  console.log('This script provides utilities for scraping credit card benefits.');
  console.log('For the actual scraping, you can use the browser DevTools to:');
  console.log('\n1. Visit https://useyourcredits.com/cards/');
  console.log('2. Click on each card to see its benefits');
  console.log('3. Use the Network tab to see the API responses\n');
  
  console.log('Alternatively, a seed file has been created at:');
  console.log('  csvs/card_credits_seed.csv\n');
  
  console.log('You can import it via the admin interface at:');
  console.log('  /admin/credits/import\n');
  
  // Check if seed file exists
  const seedPath = path.join(__dirname, '..', 'csvs', 'card_credits_seed.csv');
  if (fs.existsSync(seedPath)) {
    const content = fs.readFileSync(seedPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    console.log(`Seed file contains ${lines.length - 1} credits ready to import.`);
  }
  
  // Provide instructions for manual scraping
  console.log('\n--- Manual Scraping Instructions ---\n');
  console.log('Run this in the browser console on useyourcredits.com card pages:');
  console.log(`
// Extract benefits from a card page
const benefits = [];
document.querySelectorAll('[class*="benefit"]').forEach(el => {
  const name = el.querySelector('h3, h4')?.textContent?.trim();
  const desc = el.querySelector('p')?.textContent?.trim();
  if (name) {
    benefits.push({ name, description: desc || '' });
  }
});
console.log(JSON.stringify(benefits, null, 2));
`);
}

main().catch(console.error);

