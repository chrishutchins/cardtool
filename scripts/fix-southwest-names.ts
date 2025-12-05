// Run with: npx tsx scripts/fix-southwest-names.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Find Southwest currency (search by partial name)
  const { data: currencies } = await supabase
    .from("reward_currencies")
    .select("id, name")
    .ilike("name", "%southwest%");

  console.log("Southwest currencies:", currencies);

  if (!currencies || currencies.length === 0) {
    // Try searching for cards with SW in name
    const { data: swCards } = await supabase
      .from("cards")
      .select("id, name, slug")
      .ilike("name", "SW %");
    
    console.log("Cards starting with SW:", swCards);

    for (const card of swCards || []) {
      const newName = card.name.replace(/^SW /, "Southwest ");
      const newSlug = card.slug.replace(/^sw-/, "southwest-");

      const { error } = await supabase
        .from("cards")
        .update({ name: newName, slug: newSlug })
        .eq("id", card.id);

      if (error) {
        console.log(`❌ ${card.name}: ${error.message}`);
      } else {
        console.log(`✅ ${card.name} → ${newName}`);
        console.log(`   ${card.slug} → ${newSlug}`);
      }
    }
  } else {
    const swCurrencyId = currencies[0].id;

    // Find cards with Southwest currency
    const { data: cards } = await supabase
      .from("cards")
      .select("id, name, slug")
      .eq("primary_currency_id", swCurrencyId);

    console.log("Found cards:", cards);

    for (const card of cards || []) {
      const newName = card.name.replace(/^SW /, "Southwest ");
      const newSlug = card.slug.replace(/^sw-/, "southwest-");

      if (newName !== card.name || newSlug !== card.slug) {
        const { error } = await supabase
          .from("cards")
          .update({ name: newName, slug: newSlug })
          .eq("id", card.id);

        if (error) {
          console.log(`❌ ${card.name}: ${error.message}`);
        } else {
          console.log(`✅ ${card.name} → ${newName}`);
          if (newSlug !== card.slug) {
            console.log(`   ${card.slug} → ${newSlug}`);
          }
        }
      } else {
        console.log(`⏭️  ${card.name} (no change needed)`);
      }
    }
  }

  console.log("\n✨ Done!");
}

main();
