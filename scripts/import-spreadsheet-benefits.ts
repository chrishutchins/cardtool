/**
 * One-off import: spreadsheet benefits into card_benefits (source = 'spreadsheet').
 *
 * Usage:
 *   npx tsx scripts/import-spreadsheet-benefits.ts
 *   npx tsx scripts/import-spreadsheet-benefits.ts "/path/to/file.xlsx"
 *
 * Env: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import XLSX from "xlsx";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_FILE =
  "/Users/chrishutchins/Downloads/Copy of Which Premium Credit Cards are Keepers_.xlsx";

/** Best-guess overrides: spreadsheet sheet name → card slug (null = skip, not a card). */
const SHEET_TO_SLUG: Record<string, string | null> = {
  Intro: null,
  Summary: null,
  "Bank of America Premium Rewards": "bank-of-america-premium-rewards",
  "Capital One Venture X Biz": "capital-one-venture-x-business",
  "Amex Platinum Consumer": "amex-platinum",
  "Amex Platinum Biz": "amex-business-platinum",
  "Amex Platinum Schwab": "amex-schwab-platinum",
  "Amex Platinum Morgan Stanley": "amex-morgan-stanley-platinum",
  "Amex Gold Biz": "amex-business-gold",
  "Chase Sapphire Reserve for Busi": "chase-sapphire-reserve-business",
  "USB Altitude Reserve": "us-bank-altitude-reserve",
  "Delta Reserve Biz": "amex-delta-reserve-business",
  "Delta Platinum Biz": "amex-delta-platinum-business",
  "Delta Gold Biz": "amex-delta-gold-business",
  "United Club Biz": "chase-united-club-business",
  "United Biz": "chase-united-business",
  "AA Executive": "citi-aa-executive",
  "Hilton Aspire": "amex-hilton-aspire",
  "Hilton Surpass": "amex-hilton-surpass",
  "Hilton Biz": "amex-hilton-business",
  Ritz: "chase-ritz-carlton",
  "Bonvoy Brilliant": "amex-bonvoy-brilliant",
  "Bonvoy Bevy": "amex-bonvoy-bevy",
  "Bonvoy Bountiful": "chase-bonvoy-bountiful",
  "Bonvoy Biz": "amex-bonvoy-business",
  // CNB Crystal Visa Infinite — not in DB; add slug here when card exists or leave unmatched
};

function normalizeSheetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/®|™|℠/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCard(
  sheetName: string,
  byName: Map<string, { id: string; name: string }>,
  bySlug: Map<string, { id: string; name: string }>,
  byNormalized: Map<string, { id: string; name: string }>,
  bySlugLookup: Map<string, { id: string; name: string }>
): { id: string; name: string } | null {
  const trimmed = sheetName.trim();
  const override = SHEET_TO_SLUG[trimmed];
  if (override === null) return null;
  if (override !== undefined) return bySlugLookup.get(override.toLowerCase()) ?? null;
  const lower = trimmed.toLowerCase();
  if (byName.has(lower)) return byName.get(lower)!;
  if (bySlug.has(lower)) return bySlug.get(lower)!;
  const norm = normalizeSheetName(trimmed);
  if (byNormalized.has(norm)) return byNormalized.get(norm)!;
  return null;
}

const SKIP_ROW_PATTERNS = [
  "↖ RETURN TO SUMMARY TAB",
  "What else do you value?",
];

function parseBenefitRows(rows: unknown[][]): { title: string; description: string; estimated_annual_value: string }[] {
  const result: { title: string; description: string; estimated_annual_value: string }[] = [];
  const dataRows = rows.slice(3);
  for (const row of dataRows) {
    if (!Array.isArray(row)) continue;
    const a = row[0] != null ? String(row[0]).trim() : "";
    const b = row[1] != null ? String(row[1]).trim() : "";
    const c = row[2] != null ? String(row[2]).trim() : "";
    const line = [a, b, c].join(" ");
    if (SKIP_ROW_PATTERNS.some((p) => line.includes(p))) continue;
    if (!a && !b) continue;
    result.push({ title: a, description: b || a, estimated_annual_value: c });
  }
  return result;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const filePath = process.argv[2] ?? DEFAULT_FILE;
  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found:", filePath);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: cards } = await supabase
    .from("card_with_currency")
    .select("id, name, slug")
    .gt("annual_fee", 0)
    .order("issuer_name")
    .order("name");

  const cardsList = cards ?? [];
  const byName = new Map<string, { id: string; name: string }>();
  const bySlug = new Map<string, { id: string; name: string }>();
  const byNormalized = new Map<string, { id: string; name: string }>();
  for (const c of cardsList) {
    if (c.id) {
      const name = (c.name ?? "").trim();
      const slug = (c.slug ?? "").trim();
      byName.set(name.toLowerCase(), { id: c.id, name });
      if (slug) bySlug.set(slug.toLowerCase(), { id: c.id, name });
      const norm = normalizeSheetName(name);
      if (norm) byNormalized.set(norm, { id: c.id, name });
    }
  }
  const bySlugLookup = new Map(bySlug);

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames ?? [];

  console.log("📂 File:", path.basename(filePath));
  console.log("📋 Sheets:", sheetNames.length);
  console.log("🃏 Cards (paid) in DB:", cardsList.length);
  console.log("");

  let inserted = 0;
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    if (!rows?.length) continue;

    const card = matchCard(sheetName, byName, bySlug, byNormalized, bySlugLookup);
    if (!card) {
      unmatched.push(sheetName);
      continue;
    }
    matched.push(`${sheetName} → ${card.name}`);

    await supabase.from("spreadsheet_card_benefits").delete().eq("card_id", card.id);

    const benefitRows = parseBenefitRows(rows);
    if (benefitRows.length === 0) continue;
    const rowsToInsert = benefitRows.map(({ title, description, estimated_annual_value }, i) => ({
      card_id: card.id,
      sheet_name: sheetName,
      title: title || null,
      description: description || null,
      estimated_annual_value: estimated_annual_value || null,
      display_order: i + 1,
    }));
    const { error } = await supabase.from("spreadsheet_card_benefits").insert(rowsToInsert);
    if (error) {
      console.error(`  ❌ ${sheetName}:`, error.message);
    } else {
      inserted += rowsToInsert.length;
    }
  }

  console.log("✅ Matched sheets:", matched.length);
  matched.forEach((m) => console.log("   ", m));
  console.log("");
  if (unmatched.length) {
    console.log("⚠️  Unmatched sheet names (no card found):", unmatched.length);
    unmatched.forEach((s) => console.log("   ", s));
    console.log("");
  }
  console.log("📥 Inserted", inserted, "benefit(s) into spreadsheet_card_benefits (viewer only, not production).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
