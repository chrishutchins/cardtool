// Run with: npx tsx scripts/add-categories.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// New categories needed from the CSV
const newCategories = [
  { name: "Ads", slug: "ads", sort_order: 50 },
  { name: "Shipping", slug: "shipping", sort_order: 51 },
  { name: "Software", slug: "software", sort_order: 52 },
  { name: "Fitness", slug: "fitness", sort_order: 53 },
  { name: "Pet Supply", slug: "pet-supply", sort_order: 54 },
  { name: "Personal Care", slug: "personal-care", sort_order: 55 },
  { name: "Office Supply", slug: "office-supply", sort_order: 56 },
  { name: "Business Services", slug: "business-services", sort_order: 57 },
  { name: "Rental Car", slug: "rental-car", sort_order: 58 },
  { name: "Home Improvement", slug: "home-improvement", sort_order: 59 },
  { name: "Apparel", slug: "apparel", sort_order: 60 },
  { name: "Entertainment", slug: "entertainment", sort_order: 61 },
  { name: "Online Retail", slug: "online-retail", sort_order: 62 },
  { name: "Rent", slug: "rent", sort_order: 63 },
  { name: "Phone", slug: "phone", sort_order: 64 },
  { name: "Internet/Cable", slug: "internet-cable", sort_order: 65 },
];

async function main() {
  console.log("Adding missing categories...\n");

  // Get existing categories
  const { data: existing } = await supabase
    .from("earning_categories")
    .select("name, slug");

  const existingSlugs = new Set(existing?.map((c) => c.slug) || []);

  for (const category of newCategories) {
    if (existingSlugs.has(category.slug)) {
      console.log(`⏭️  ${category.name} (already exists)`);
      continue;
    }

    const { error } = await supabase
      .from("earning_categories")
      .insert(category);

    if (error) {
      console.log(`❌ ${category.name}: ${error.message}`);
    } else {
      console.log(`✅ Added: ${category.name}`);
    }
  }

  console.log("\n✨ Done!");
}

main();

