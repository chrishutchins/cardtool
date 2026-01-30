"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState } from "react";

interface EarningRule {
  id: string;
  category_id: number;
  rate: number;
  has_cap: boolean;
  cap_amount: number | null;
  cap_unit: string | null;
  cap_period: string | null;
  post_cap_rate: number | null;
  notes: string | null;
  booking_method: string | null;
  brand_name: string | null;
  earning_categories: { id: number; name: string } | null;
}

interface CapWithCategories {
  id: string;
  cap_type: string;
  elevated_rate: number;
  cap_amount: number | null;
  cap_period: string | null;
  post_cap_rate: number | null;
  notes: string | null;
  categories: { id: number; name: string; cap_amount: number | null }[];
}

interface Credit {
  id: string;
  name: string;
  brand_name: string | null;
  credit_count: number;
  reset_cycle: string;
  renewal_period_months: number | null;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  is_active: boolean;
  notes: string | null;
  must_be_earned: boolean;
}

interface SpreadsheetBenefit {
  id: string;
  title: string | null;
  description: string | null;
  detail: string | null;
  limitations: string | null;
  estimated_annual_value: string | null;
  display_order: number | null;
}

interface ProductionBenefit {
  id: string;
  title: string | null;
  description: string | null;
  detail: string | null;
  limitations: string | null;
  default_value: string | null;
}

interface KudosBenefit {
  id: string;
  title: string | null;
  name: string | null;
  description: string | null;
  detail: string | null;
  limitations: string | null;
}

interface KudosCredit {
  id: string;
  header: string;
  amount: number | null;
  frequency: string | null;
  limitations: string | null;
  label: string | null;
  currency: string | null;
}

type IgnoreAction = (formData: FormData) => Promise<void>;
type AddToCardBenefitsAction = (formData: FormData) => Promise<void>;
type DeleteProductionBenefitAction = (formData: FormData) => Promise<void>;
type UpdateProductionBenefitAction = (formData: FormData) => Promise<void>;

interface BenefitsViewerClientProps {
  cardId: string;
  card: { id: string; name: string | null; issuer_name: string | null };
  cardIds: string[];
  currentIndex: number;
  rules: EarningRule[];
  caps: CapWithCategories[];
  credits: Credit[];
  spreadsheetBenefits: SpreadsheetBenefit[];
  productionBenefits: ProductionBenefit[];
  kudosBenefits: KudosBenefit[];
  kudosCredits: KudosCredit[];
  onIgnore: IgnoreAction;
  onAddToCardBenefits: AddToCardBenefitsAction;
  onDeleteProductionBenefit: DeleteProductionBenefitAction;
  onUpdateProductionBenefit: UpdateProductionBenefitAction;
}

function IgnoreButton({
  cardId,
  source,
  sourceId,
  onIgnore,
}: {
  cardId: string;
  source: "spreadsheet" | "kudos_benefit" | "kudos_credit";
  sourceId: string;
  onIgnore: IgnoreAction;
}) {
  return (
    <form action={onIgnore} className="inline">
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <button type="submit" className="ml-2 text-xs text-zinc-500 hover:text-zinc-400" title="Hide this item">
        Ignore
      </button>
    </form>
  );
}

function AddButton({
  cardId,
  source,
  sourceId,
  onAdd,
}: {
  cardId: string;
  source: "spreadsheet" | "kudos_benefit" | "kudos_credit";
  sourceId: string;
  onAdd: AddToCardBenefitsAction;
}) {
  return (
    <form action={onAdd} className="inline">
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <button
        type="submit"
        className="ml-2 px-1.5 py-0.5 text-xs rounded bg-emerald-700 text-white hover:bg-emerald-600"
        title="Add to card benefits (production)"
      >
        +
      </button>
    </form>
  );
}

export function BenefitsViewerClient({
  cardId,
  card,
  cardIds,
  currentIndex,
  rules,
  caps,
  credits,
  spreadsheetBenefits,
  productionBenefits,
  kudosBenefits,
  kudosCredits,
  onIgnore,
  onAddToCardBenefits,
  onDeleteProductionBenefit,
  onUpdateProductionBenefit,
}: BenefitsViewerClientProps) {
  const router = useRouter();
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const prevId = currentIndex > 0 ? cardIds[currentIndex - 1]! : null;
  const nextId = currentIndex < cardIds.length - 1 ? cardIds[currentIndex + 1]! : null;

  const goPrev = useCallback(() => {
    if (prevId) router.push(`/admin/benefits-viewer/${prevId}`);
  }, [prevId, router]);

  const goNext = useCallback(() => {
    if (nextId) router.push(`/admin/benefits-viewer/${nextId}`);
  }, [nextId, router]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "ArrowLeft" || e.key === "j") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" || e.key === "k") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [goPrev, goNext]);

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <h1 className="font-semibold text-white">{card.name}</h1>
        <p className="text-zinc-400">{card.issuer_name}</p>
      </div>

      {/* Our data */}
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <h2 className="mb-2 font-semibold text-zinc-300">Earning &amp; credits</h2>
        <div className="grid gap-2 text-xs">
          <div className="font-medium text-zinc-400">Earning rules</div>
          {rules.length === 0 ? (
            <div className="text-zinc-500">None</div>
          ) : (
            <ul className="list-inside list-disc space-y-0.5 text-zinc-300">
              {rules.map((r) => (
                <li key={r.id}>
                  {r.earning_categories?.name ?? "?"}: {r.rate}x
                  {r.has_cap && r.cap_amount != null && ` (cap ${r.cap_amount} ${r.cap_unit ?? ""}/${r.cap_period ?? ""})`}
                  {r.brand_name ? ` [${r.brand_name}]` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="font-medium text-zinc-400 pt-1">Category bonuses (caps)</div>
          {caps.length === 0 ? (
            <div className="text-zinc-500">None</div>
          ) : (
            <ul className="list-inside list-disc space-y-0.5 text-zinc-300">
              {caps.map((cap) => (
                <li key={cap.id}>
                  {cap.cap_type}: {cap.elevated_rate}x
                  {cap.categories.length ? ` (${cap.categories.map((c) => c.name).join(", ")})` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="font-medium text-zinc-400 pt-1">Credits</div>
          {credits.length === 0 ? (
            <div className="text-zinc-500">None</div>
          ) : (
            <ul className="list-inside list-disc space-y-0.5 text-zinc-300">
              {credits.filter((c) => c.is_active).map((c) => (
                <li key={c.id}>
                  {c.name}
                  {c.brand_name ? ` (${c.brand_name})` : ""}: {c.credit_count} / {c.reset_cycle}
                  {c.default_value_cents != null ? ` ~$${(c.default_value_cents / 100).toFixed(0)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Card benefits (production) */}
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <h2 className="mb-2 font-semibold text-zinc-300">Card benefits (production)</h2>
        {productionBenefits.length === 0 ? (
          <p className="text-zinc-500 text-xs">None yet. Use + on items below to add.</p>
        ) : (
          <ul className="space-y-2 text-zinc-300">
            {productionBenefits.map((b) => {
              // Use only description for display and edit so list and form always match (detail is legacy/unused here)
              const desc = (b.description ?? "").trim();
              return (
              <li key={b.id} className="border-l-2 border-emerald-800 pl-2">
                {editingBenefitId === b.id ? (
                  <form
                    key={`edit-${b.id}`}
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      await onUpdateProductionBenefit(formData);
                      router.refresh();
                      setEditingBenefitId(null);
                    }}
                  >
                    <input type="hidden" name="benefitId" value={b.id} />
                    <input type="hidden" name="cardId" value={cardId} />
                    <div className="grid gap-1.5 text-xs">
                      <label className="text-zinc-500">Title</label>
                      <input
                        type="text"
                        name="title"
                        defaultValue={b.title ?? ""}
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-200"
                        placeholder="Title"
                      />
                      <label className="text-zinc-500">Description</label>
                      <textarea
                        name="description"
                        defaultValue={b.description ?? ""}
                        rows={2}
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-200"
                        placeholder="Description"
                      />
                      <label className="text-zinc-500">Default Value</label>
                      <input
                        type="text"
                        name="default_value"
                        defaultValue={b.default_value ?? ""}
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-200"
                        placeholder="Default value"
                      />
                      <label className="text-zinc-500">Limitations (optional)</label>
                      <input
                        type="text"
                        name="limitations"
                        defaultValue={b.limitations ?? ""}
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-200"
                        placeholder="Limitations"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-2 py-1 text-xs rounded bg-emerald-700 text-white hover:bg-emerald-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBenefitId(null)}
                        className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {b.title && <span className="font-medium">{b.title}. </span>}
                        {desc || "—"}
                        {b.default_value != null && b.default_value !== "" && (
                          <span className="text-zinc-400 ml-1">({b.default_value})</span>
                        )}
                        {b.limitations && <span className="text-zinc-500"> ({b.limitations})</span>}
                      </div>
                      <form action={onDeleteProductionBenefit} className="inline">
                        <input type="hidden" name="benefitId" value={b.id} />
                        <button
                          type="submit"
                          className="text-xs text-zinc-500 hover:text-red-400"
                          title="Remove from production"
                        >
                          Remove
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setEditingBenefitId(b.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-400"
                        title="Edit inline"
                      >
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Spreadsheet benefits (viewer only, not production) */}
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <h2 className="mb-2 font-semibold text-zinc-300">Spreadsheet benefits</h2>
        {spreadsheetBenefits.length === 0 ? (
          <p className="text-zinc-500 text-xs">None imported yet.</p>
        ) : (
          <ul className="space-y-1.5 text-zinc-300">
            {spreadsheetBenefits.map((b) => (
              <li key={b.id} className="flex items-start gap-1 border-l-2 border-zinc-700 pl-2">
                <span className="flex-1 min-w-0">
                  {b.title && <span className="font-medium">{b.title}. </span>}
                  {b.description ?? b.detail ?? "—"}
                  {b.estimated_annual_value && (
                    <span className="text-emerald-400/90 ml-1">({b.estimated_annual_value})</span>
                  )}
                  {b.limitations && <span className="text-zinc-500"> ({b.limitations})</span>}
                </span>
                <AddButton cardId={cardId} source="spreadsheet" sourceId={b.id} onAdd={onAddToCardBenefits} />
                <IgnoreButton cardId={cardId} source="spreadsheet" sourceId={b.id} onIgnore={onIgnore} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Kudos benefits */}
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <h2 className="mb-2 font-semibold text-zinc-300">Kudos benefits</h2>
        {kudosBenefits.length === 0 ? (
          <p className="text-zinc-500 text-xs">No Kudos match or no benefits in Kudos.</p>
        ) : (
          <ul className="space-y-1.5 text-zinc-300">
            {kudosBenefits.map((b) => (
              <li key={b.id} className="flex items-start gap-1 border-l-2 border-zinc-700 pl-2">
                <span className="flex-1 min-w-0">
                  {(b.title ?? b.name) && <span className="font-medium">{b.title ?? b.name}. </span>}
                  {b.description ?? b.detail ?? "—"}
                  {b.limitations && <span className="text-zinc-500"> ({b.limitations})</span>}
                </span>
                <AddButton cardId={cardId} source="kudos_benefit" sourceId={b.id} onAdd={onAddToCardBenefits} />
                <IgnoreButton cardId={cardId} source="kudos_benefit" sourceId={b.id} onIgnore={onIgnore} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Kudos credits */}
      <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
        <h2 className="mb-2 font-semibold text-zinc-300">Kudos credits</h2>
        {kudosCredits.length === 0 ? (
          <p className="text-zinc-500 text-xs">No Kudos match or no credits in Kudos.</p>
        ) : (
          <ul className="space-y-1.5 text-zinc-300">
            {kudosCredits.map((c) => (
              <li key={c.id} className="flex items-start gap-1 border-l-2 border-zinc-700 pl-2">
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{c.header}</span>
                  {c.amount != null && (
                    <span>
                      {" "}
                      {c.currency === "USD" ? "$" : ""}
                      {c.amount}
                      {c.currency && c.currency !== "USD" ? ` ${c.currency}` : ""}
                    </span>
                  )}
                  {c.frequency && <span className="text-zinc-500"> / {c.frequency}</span>}
                  {c.limitations && <span className="text-zinc-500"> ({c.limitations})</span>}
                </span>
                <AddButton cardId={cardId} source="kudos_credit" sourceId={c.id} onAdd={onAddToCardBenefits} />
                <IgnoreButton cardId={cardId} source="kudos_credit" sourceId={c.id} onIgnore={onIgnore} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500">Keyboard: ← / j = prev card, → / k = next card. + = add to production card benefits.</p>
    </div>
  );
}
