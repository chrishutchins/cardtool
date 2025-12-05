// Run with: npx tsx scripts/convert-cents-to-dollars.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Converting annual_fee_cents to annual_fee (dollars)...\n");

  // Step 1: Get all cards with their current fee
  const { data: cards, error: fetchError } = await supabase
    .from("cards")
    .select("id, name, annual_fee_cents");

  if (fetchError) {
    console.log("Error fetching cards:", fetchError.message);
    return;
  }

  console.log(`Found ${cards?.length} cards to update\n`);

  // Step 2: Update each card - divide cents by 100 to get dollars
  for (const card of cards || []) {
    const feeInDollars = (card.annual_fee_cents || 0) / 100;
    
    const { error } = await supabase
      .from("cards")
      .update({ annual_fee_cents: feeInDollars })
      .eq("id", card.id);

    if (error) {
      console.log(`❌ ${card.name}: ${error.message}`);
    } else {
      console.log(`✅ ${card.name}: ${card.annual_fee_cents}¢ → $${feeInDollars}`);
    }
  }

  console.log("\n✨ Done! Now rename the column in Supabase and update code.");
  console.log("\nRun this SQL in Supabase to rename the column:");
  console.log("ALTER TABLE cards RENAME COLUMN annual_fee_cents TO annual_fee;");
}

main();

