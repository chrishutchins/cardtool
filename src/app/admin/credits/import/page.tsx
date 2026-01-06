import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ImportCreditsForm } from "./import-form";

export default async function ImportCreditsPage() {
  const supabase = await createClient();

  // Get all cards for reference
  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  async function importCredits(csvData: string) {
    "use server";
    const supabase = await createClient();

    const lines = csvData.trim().split("\n");
    const header = lines[0].toLowerCase().split(",").map(h => h.trim());

    const results: { success: number; errors: string[] } = { success: 0, errors: [] };

    // Get cards map
    const { data: allCards } = await supabase.from("cards").select("id, slug");
    const cardMap = new Map(allCards?.map(c => [c.slug.toLowerCase(), c.id]) ?? []);

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

        const name = row["name"] || row["credit_name"];
        if (!name) {
          results.errors.push(`Row ${i + 1}: Missing credit name`);
          continue;
        }

        const brandName = row["brand_name"] || row["brand"] || null;
        const resetCycle = row["reset_cycle"] || row["cycle"] || "monthly";
        const renewalPeriodStr = row["renewal_period_months"] || row["renewal_months"] || "";
        const defaultValueStr = row["default_value"] || row["value"] || "";
        const defaultQuantityStr = row["default_quantity"] || row["quantity"] || "";
        const unitName = row["unit_name"] || row["unit"] || null;
        const notes = row["notes"] || null;
        const mustBeEarnedStr = row["must_be_earned"] || "";
        const mustBeEarned = mustBeEarnedStr.toLowerCase() === "true" || mustBeEarnedStr === "1" || mustBeEarnedStr.toLowerCase() === "yes";

        const defaultValueCents = defaultValueStr ? Math.round(parseFloat(defaultValueStr) * 100) : null;
        const defaultQuantity = defaultQuantityStr ? parseInt(defaultQuantityStr) : null;
        const renewalPeriodMonths = renewalPeriodStr ? parseInt(renewalPeriodStr) : null;

        // Validate reset cycle
        const validCycles = ["monthly", "quarterly", "semiannual", "annual", "cardmember_year", "usage_based"];
        if (!validCycles.includes(resetCycle.toLowerCase())) {
          results.errors.push(`Row ${i + 1}: Invalid reset cycle: ${resetCycle}`);
          continue;
        }

        const { error } = await supabase.from("card_credits").insert({
          card_id: cardId,
          name,
          brand_name: brandName,
          reset_cycle: resetCycle.toLowerCase() as "monthly" | "quarterly" | "semiannual" | "annual" | "cardmember_year" | "usage_based",
          renewal_period_months: renewalPeriodMonths,
          default_value_cents: defaultValueCents,
          default_quantity: defaultQuantity,
          unit_name: unitName,
          notes,
          must_be_earned: mustBeEarned,
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

    revalidatePath("/admin/credits");
    return results;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/credits" className="text-sm text-zinc-400 hover:text-white mb-2 inline-block">
          ← Back to Credits
        </Link>
        <h1 className="text-3xl font-bold text-white">Import Credits</h1>
        <p className="text-zinc-400 mt-1">
          Import card credit data from a CSV file
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">CSV Format</h2>
        <div className="bg-zinc-800 rounded-lg p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
          <p className="text-zinc-400 mb-2"># Header row (required):</p>
          <p>card_slug,name,brand_name,reset_cycle,renewal_period_months,default_value,default_quantity,unit_name,notes</p>
          <p className="text-zinc-400 mt-4 mb-2"># Example rows:</p>
          <p>amex-platinum,Uber Credit,Uber,monthly,,15,,,$35 in December</p>
          <p>amex-platinum,Airline Fee Credit,,annual,,200,,,</p>
          <p>amex-platinum,SkyClub Visits,Delta SkyClub,annual,,,10,visit,</p>
          <p>amex-platinum,Global Entry Credit,,usage_based,48,100,,,Renews 4 years from last use</p>
          <p>chase-sapphire-reserve,DoorDash Credit,DoorDash,annual,,60,,,Monthly statement credit</p>
        </div>

        <div className="text-sm text-zinc-400 space-y-2">
          <p><strong>Columns:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code className="text-zinc-300">card_slug</code> - Card slug (e.g., amex-platinum, chase-sapphire-reserve)</li>
            <li><code className="text-zinc-300">name</code> - Credit name (e.g., &quot;Uber Credit&quot;, &quot;Airline Fee Credit&quot;)</li>
            <li><code className="text-zinc-300">brand_name</code> - Optional brand for grouping (e.g., &quot;Uber&quot;, &quot;Delta&quot;)</li>
            <li><code className="text-zinc-300">reset_cycle</code> - monthly, quarterly, semiannual, annual, cardmember_year, or <strong>usage_based</strong></li>
            <li><code className="text-zinc-300">renewal_period_months</code> - For usage_based only: months until renewal (e.g., 48 for 4 years)</li>
            <li><code className="text-zinc-300">default_value</code> - Dollar value (e.g., 15, 200)</li>
            <li><code className="text-zinc-300">default_quantity</code> - For non-dollar credits (e.g., 4 lounge passes)</li>
            <li><code className="text-zinc-300">unit_name</code> - Unit name (e.g., &quot;visit&quot;, &quot;pass&quot;)</li>
            <li><code className="text-zinc-300">notes</code> - Optional admin notes</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Paste CSV Data</h2>
        <ImportCreditsForm onImport={importCredits} />
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

