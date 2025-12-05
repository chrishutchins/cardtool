// Run with: npx tsx scripts/fix-southwest-slugs.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Find cards with sw- in slug
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, slug")
    .ilike("slug", "%-sw-%");

  console.log("Cards with sw- in slug:", cards);

  for (const card of cards || []) {
    const newSlug = card.slug.replace("-sw-", "-southwest-");

    const { error } = await supabase
      .from("cards")
      .update({ slug: newSlug })
      .eq("id", card.id);

    if (error) {
      console.log(`❌ ${card.slug}: ${error.message}`);
    } else {
      console.log(`✅ ${card.slug} → ${newSlug}`);
    }
  }

  console.log("\n✨ Done!");
}

main();

