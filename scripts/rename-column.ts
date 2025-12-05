// Run with: npx tsx scripts/rename-column.ts

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Renaming annual_fee_cents to annual_fee...");
  
  // Using rpc to execute raw SQL isn't available with anon key
  // We need to use the Supabase dashboard or service role key for DDL
  
  // Try to verify the column exists by querying
  const { data, error } = await supabase
    .from("cards")
    .select("id, name, annual_fee_cents")
    .limit(1);

  if (error) {
    if (error.message.includes("annual_fee_cents")) {
      console.log("Column may already be renamed to annual_fee");
      
      // Try with new name
      const { data: data2, error: error2 } = await supabase
        .from("cards")
        .select("id, name, annual_fee")
        .limit(1);
      
      if (!error2) {
        console.log("✅ Column is already named 'annual_fee'");
        console.log("Sample:", data2);
        return;
      }
    }
    console.log("Error:", error.message);
    return;
  }

  console.log("Column is still 'annual_fee_cents'");
  console.log("Sample:", data);
  console.log("\n⚠️  Cannot rename column via client API.");
  console.log("Please run this SQL in Supabase Dashboard → SQL Editor:");
  console.log("\n  ALTER TABLE cards RENAME COLUMN annual_fee_cents TO annual_fee;\n");
}

main();

