// Run with: npx tsx scripts/update-amex-names.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get Amex issuer ID
  const { data: amexIssuer } = await supabase
    .from("issuers")
    .select("id")
    .eq("name", "Amex")
    .single();

  if (!amexIssuer) {
    console.log("Amex issuer not found");
    return;
  }

  // Get Membership Rewards currency ID
  const { data: mrCurrency } = await supabase
    .from("reward_currencies")
    .select("id")
    .eq("name", "Membership Rewards")
    .single();

  if (!mrCurrency) {
    console.log("Membership Rewards currency not found");
    return;
  }

  // Find matching cards
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name")
    .eq("issuer_id", amexIssuer.id)
    .eq("primary_currency_id", mrCurrency.id);

  console.log("Found cards:", cards);

  // Update each card that doesn't already start with "Amex "
  for (const card of cards || []) {
    if (!card.name.startsWith("Amex ")) {
      const newName = `Amex ${card.name}`;
      const { error } = await supabase
        .from("cards")
        .update({ name: newName })
        .eq("id", card.id);

      if (error) {
        console.log(`Error updating ${card.name}:`, error.message);
      } else {
        console.log(`Updated: ${card.name} → ${newName}`);
      }
    } else {
      console.log(`Skipped (already has Amex prefix): ${card.name}`);
    }
  }

  console.log("Done!");
}

main();

