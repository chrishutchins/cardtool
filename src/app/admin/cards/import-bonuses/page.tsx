import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ImportBonusForm } from "./import-form";

export default async function ImportBonusesPage() {
  const supabase = await createClient();

  // Get all cards for reference
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  // Get all currencies for reference
  const { data: currencies } = await supabase
    .from("reward_currencies")
    .select("id, name, code")
    .order("name");

  async function importWelcomeBonuses(csvData: string) {
    "use server";
    const supabase = await createClient();
    
    const lines = csvData.trim().split("\n");
    const header = lines[0].toLowerCase().split(",").map(h => h.trim());
    
    // Expected columns: card_slug, spend_requirement, time_period_months, component_type, 
    // points_amount, currency_code, cash_amount, benefit_description, default_benefit_value
    const results: { success: number; errors: string[] } = { success: 0, errors: [] };
    
    // Get cards and currencies maps
    const { data: allCards } = await supabase.from("cards").select("id, slug");
    const { data: allCurrencies } = await supabase.from("reward_currencies").select("id, code");
    
    const cardMap = new Map(allCards?.map(c => [c.slug.toLowerCase(), c.id]) ?? []);
    const currencyMap = new Map(allCurrencies?.map(c => [c.code.toLowerCase(), c.id]) ?? []);
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handles quoted values)
      const values = parseCSVLine(line);
      
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = values[idx]?.trim() ?? "";
      });
      
      try {
        const cardSlug = row["card_slug"] || row["card"];
        const cardId = cardMap.get(cardSlug?.toLowerCase());
        
        if (!cardId) {
          results.errors.push(`Row ${i + 1}: Card not found: ${cardSlug}`);
          continue;
        }
        
        const componentType = (row["component_type"] || row["type"] || "points").toLowerCase();
        const spendRequirement = parseFloat(row["spend_requirement"] || row["spend"] || "0") * 100;
        const timePeriod = parseInt(row["time_period_months"] || row["months"] || "3");
        
        let points_amount: number | null = null;
        let currency_id: string | null = null;
        let cash_amount_cents: number | null = null;
        let benefit_description: string | null = null;
        let default_benefit_value_cents: number | null = null;
        
        if (componentType === "points") {
          const currencyCode = row["currency_code"] || row["currency"];
          const currencyIdFound = currencyMap.get(currencyCode?.toLowerCase());
          if (!currencyIdFound) {
            results.errors.push(`Row ${i + 1}: Currency not found: ${currencyCode}`);
            continue;
          }
          points_amount = parseInt(row["points_amount"] || row["points"] || "0");
          currency_id = currencyIdFound;
        } else if (componentType === "cash") {
          cash_amount_cents = parseFloat(row["cash_amount"] || row["cash"] || "0") * 100;
        } else if (componentType === "benefit") {
          benefit_description = row["benefit_description"] || row["benefit"] || "";
          default_benefit_value_cents = parseFloat(row["default_benefit_value"] || row["value"] || "0") * 100;
        }
        
        const { error } = await supabase.from("card_welcome_bonuses").insert({
          card_id: cardId,
          component_type: componentType,
          spend_requirement_cents: spendRequirement,
          time_period_months: timePeriod,
          points_amount,
          currency_id,
          cash_amount_cents,
          benefit_description,
          default_benefit_value_cents,
        });
        if (error) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        } else {
          results.success++;
        }
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
    
    revalidatePath("/admin/cards");
    return results;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/cards" className="text-sm text-zinc-400 hover:text-white mb-2 inline-block">
          ← Back to Cards
        </Link>
        <h1 className="text-3xl font-bold text-white">Import Welcome Bonuses</h1>
        <p className="text-zinc-400 mt-1">
          Import welcome bonus data from a CSV file
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">CSV Format</h2>
        <div className="bg-zinc-800 rounded-lg p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
          <p className="text-zinc-400 mb-2"># Header row (required):</p>
          <p>card_slug,spend_requirement,time_period_months,component_type,points_amount,currency_code,cash_amount,benefit_description,default_benefit_value</p>
          <p className="text-zinc-400 mt-4 mb-2"># Example rows:</p>
          <p>chase-sapphire-preferred,4000,3,points,60000,UR,,,</p>
          <p>amex-platinum,8000,6,points,80000,MR,,,</p>
          <p>amex-platinum,8000,6,cash,,,$200,,</p>
          <p>hilton-aspire,5000,3,benefit,,,,Free Night Certificate,400</p>
        </div>
        
        <div className="text-sm text-zinc-400 space-y-2">
          <p><strong>Columns:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code className="text-zinc-300">card_slug</code> - Card slug (e.g., chase-sapphire-preferred)</li>
            <li><code className="text-zinc-300">spend_requirement</code> - Dollars to spend (e.g., 4000)</li>
            <li><code className="text-zinc-300">time_period_months</code> - Months to complete spend (e.g., 3)</li>
            <li><code className="text-zinc-300">component_type</code> - points, cash, or benefit</li>
            <li><code className="text-zinc-300">points_amount</code> - Number of points (for points type)</li>
            <li><code className="text-zinc-300">currency_code</code> - Currency code like UR, MR, TYP (for points type)</li>
            <li><code className="text-zinc-300">cash_amount</code> - Dollar amount (for cash type)</li>
            <li><code className="text-zinc-300">benefit_description</code> - Description (for benefit type)</li>
            <li><code className="text-zinc-300">default_benefit_value</code> - Dollar value (for benefit type)</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Paste CSV Data</h2>
        <ImportBonusForm onImport={importWelcomeBonuses} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Reference: Available Cards</h2>
        <div className="max-h-64 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {cards?.map((card) => (
              <div key={card.id} className="text-zinc-400">
                <code className="text-zinc-300">{card.slug}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Reference: Available Currencies</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {currencies?.map((currency) => (
            <div key={currency.id} className="text-zinc-400">
              <code className="text-zinc-300">{currency.code}</code> - {currency.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}
