// @ts-nocheck
/**
 * Find cards that are in Kudos but not in our database
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const KUDOS_API_URL = 'https://graph.prod.joinkudos.com/PublicAPI/';

const BROWSER_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Origin': 'https://www.joinkudos.com',
  'Referer': 'https://www.joinkudos.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

// Simple query to get just IDs and names
const IDS_QUERY = `
query GetCardIds($from: Int, $size: Int) {
  CreditCard_searchCardsV3(
    searchTerm: ""
    factorInWallet: false
    options: { from: $from, size: $size }
  ) {
    totalResults
    cards {
      id
      name
      bank
      status
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase env vars required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all card IDs from Kudos
  console.log('Fetching all card IDs from Kudos...');
  const kudosCards: { id: string; name: string; bank: string; status: string }[] = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const response = await fetch(KUDOS_API_URL, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Authorization': token,
      },
      body: JSON.stringify({
        query: IDS_QUERY,
        variables: { from: offset, size: pageSize },
      }),
    });

    const json = await response.json();
    const cards = json.data?.CreditCard_searchCardsV3?.cards || [];
    kudosCards.push(...cards);

    if (cards.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`Found ${kudosCards.length} cards in Kudos`);

  // Get all card IDs from our database
  console.log('Fetching card IDs from database...');
  const { data: dbCards, error } = await supabase
    .from('kudos_cards')
    .select('id, name, bank');

  if (error) {
    console.error('Error fetching from DB:', error);
    process.exit(1);
  }

  console.log(`Found ${dbCards.length} cards in database`);

  // Find missing cards
  const dbIds = new Set(dbCards.map((c: any) => c.id));
  const missingCards = kudosCards.filter((c) => !dbIds.has(c.id));

  console.log(`\n=== Missing ${missingCards.length} cards ===\n`);

  if (missingCards.length > 0) {
    console.log('ID\tStatus\tBank\tName');
    console.log('-'.repeat(80));
    missingCards.forEach((c) => {
      console.log(`${c.id}\t${c.status || 'N/A'}\t${c.bank || 'N/A'}\t${c.name}`);
    });
  }
}

main();
