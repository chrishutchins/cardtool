import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { BenefitsImportForm } from "./import-form";

export default async function BenefitsImportPage() {
  const supabase = createClient();

  // Cards we can match to (same as viewer: paid cards only)
  const { data: cards } = await supabase
    .from("card_with_currency")
    .select("id, name, slug")
    .gt("annual_fee", 0)
    .order("issuer_name")
    .order("name");

  async function importSpreadsheetBenefits(formData: FormData) {
    "use server";
    const supabase = createClient();
    const file = formData.get("file") as File | null;
    if (!file?.size) {
      return { success: 0, matched: 0, skipped: 0, errors: ["No file selected."] };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const XLSX = (await import("xlsx")).default;
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames ?? [];

    const { data: allCards } = await supabase
      .from("card_with_currency")
      .select("id, name, slug")
      .gt("annual_fee", 0)
      .order("issuer_name")
      .order("name");

    const cardsList = allCards ?? [];
    const byName = new Map<string, { id: string }>();
    const bySlug = new Map<string, { id: string }>();
    const byNormalized = new Map<string, { id: string }>();
    for (const c of cardsList) {
      if (c.id) {
        byName.set((c.name ?? "").toLowerCase().trim(), { id: c.id });
        if (c.slug) bySlug.set(c.slug.toLowerCase().trim(), { id: c.id });
        const norm = normalizeSheetName((c.name ?? "").trim());
        if (norm) byNormalized.set(norm, { id: c.id });
      }
    }

    let success = 0;
    let matched = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
      if (!rows?.length) continue;

      const card = matchCard(sheetName, byName, bySlug, byNormalized);
      if (!card) {
        skipped += 1;
        continue;
      }
      matched += 1;

      const benefitRows = parseBenefitRows(rows);
      for (let i = 0; i < benefitRows.length; i++) {
        const { title, description, estimated_annual_value } = benefitRows[i]!;
        const { error } = await supabase.from("spreadsheet_card_benefits").insert({
          card_id: card.id,
          sheet_name: sheetName,
          title: title || null,
          description: description || null,
          estimated_annual_value: estimated_annual_value || null,
          display_order: i + 1,
        });
        if (error) {
          errors.push(`Sheet "${sheetName}" row ${i + 1}: ${error.message}`);
        } else {
          success += 1;
        }
      }
    }

    revalidatePath("/admin/benefits-viewer");
    return { success, matched, skipped, errors };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/benefits-viewer" className="text-sm text-zinc-400 hover:text-white">
          ← Benefits viewer
        </Link>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-lg font-semibold text-white mb-2">Import spreadsheet benefits</h1>
        <p className="text-sm text-zinc-400 mb-4">
          Upload an xlsx file where each <strong>sheet/tab name</strong> is a card name (matched to our cards with annual fee &gt; 0).
          Each row in a sheet = one benefit. First row can be headers (Benefit, Description, etc.); we use the first column as title and second as description when present.
        </p>
        <p className="text-xs text-zinc-500 mb-4">{cards?.length ?? 0} cards available to match (paid cards only).</p>
        <BenefitsImportForm onImport={importSpreadsheetBenefits} />
      </div>
    </div>
  );
}

function normalizeSheetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/®|™|℠/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCard(
  sheetName: string,
  byName: Map<string, { id: string }>,
  bySlug: Map<string, { id: string }>,
  byNormalized: Map<string, { id: string }>
): { id: string } | null {
  const trimmed = sheetName.trim();
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
