// Run with: npx tsx scripts/check-view.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Check the cards table directly
  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("name, annual_fee")
    .limit(5);

  console.log("Direct cards table:");
  console.log(cards);
  if (cardsError) console.log("Error:", cardsError.message);

  // Check the view
  const { data: view, error: viewError } = await supabase
    .from("card_with_currency")
    .select("name, annual_fee")
    .limit(5);

  console.log("\ncard_with_currency view:");
  console.log(view);
  if (viewError) console.log("Error:", viewError.message);
}

main();

