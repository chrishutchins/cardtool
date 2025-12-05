// Run with: npx tsx scripts/prefix-card-names.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define prefix rules: issuer name -> prefix to add
const prefixRules: { issuer: string; prefix: string; currencies?: string[] }[] = [
  { issuer: "Chase", prefix: "Chase", currencies: ["Ultimate Rewards"] },
  { issuer: "Bank of America", prefix: "BoA", currencies: ["Cash Back"] },
  { issuer: "Capital One", prefix: "Capital One" }, // all currencies
  { issuer: "Citi", prefix: "Citi", currencies: ["ThankYou Points", "Cash Back"] },
  { issuer: "Paypal", prefix: "Paypal" }, // all currencies
  { issuer: "Sam's Club", prefix: "Sam's Club" }, // all currencies
  { issuer: "US Bank", prefix: "US Bank" }, // all currencies
  { issuer: "Wells Fargo", prefix: "Wells Fargo" }, // all currencies
];

async function main() {
  // Get all issuers
  const { data: issuers } = await supabase.from("issuers").select("id, name");
  const issuerMap = new Map(issuers?.map((i) => [i.name, i.id]) || []);

  // Get all currencies
  const { data: currencies } = await supabase.from("reward_currencies").select("id, name");
  const currencyMap = new Map(currencies?.map((c) => [c.name, c.id]) || []);

  for (const rule of prefixRules) {
    const issuerId = issuerMap.get(rule.issuer);
    if (!issuerId) {
      console.log(`⚠️  Issuer not found: ${rule.issuer}`);
      continue;
    }

    console.log(`\n📌 Processing ${rule.issuer}...`);

    // Build query
    let query = supabase
      .from("cards")
      .select("id, name, primary_currency_id")
      .eq("issuer_id", issuerId);

    // Filter by currencies if specified
    if (rule.currencies) {
      const currencyIds = rule.currencies
        .map((c) => currencyMap.get(c))
        .filter(Boolean);
      if (currencyIds.length === 0) {
        console.log(`⚠️  No matching currencies for ${rule.issuer}`);
        continue;
      }
      query = query.in("primary_currency_id", currencyIds);
    }

    const { data: cards } = await query;

    if (!cards || cards.length === 0) {
      console.log(`   No cards found`);
      continue;
    }

    for (const card of cards) {
      // Skip if already has the prefix
      if (card.name.startsWith(rule.prefix + " ")) {
        console.log(`   ⏭️  ${card.name} (already prefixed)`);
        continue;
      }

      const newName = `${rule.prefix} ${card.name}`;
      const { error } = await supabase
        .from("cards")
        .update({ name: newName })
        .eq("id", card.id);

      if (error) {
        console.log(`   ❌ ${card.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${card.name} → ${newName}`);
      }
    }
  }

  console.log("\n✨ Done!");
}

main();

