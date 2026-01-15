"use client";

import { useState } from "react";
import Link from "next/link";
import { CardPreviewModal, CardPreviewData } from "@/components/card-preview-modal";

interface CardPreviewEarningRule {
  category_id: number;
  category_name: string;
  rate: number;
  booking_method: string;
  has_cap: boolean;
  cap_amount: number | null;
  cap_period: string | null;
  cap_unit: string | null;
  post_cap_rate: number | null;
  brand_name: string | null;
}

interface CardPreviewCategoryBonus {
  id: string;
  cap_type: string;
  cap_amount: number | null;
  cap_period: string | null;
  elevated_rate: number;
  post_cap_rate: number | null;
  categories: { id: number; name: string }[];
}

interface CardPreviewCredit {
  id: string;
  name: string;
  brand_name: string | null;
  reset_cycle: string;
  default_value_cents: number | null;
  default_quantity: number | null;
  unit_name: string | null;
  notes: string | null;
  credit_count: number;
}

interface DashboardCardRecommendation {
  cardId: string;
  cardName: string;
  cardSlug: string;
  issuerName: string | null;
  currencyName: string;
  annualFee: number;
  defaultEarnRate: number;
  defaultPerksValue: number;
  netFee: number;
  spendingEarnings: number;
  totalEarnings: number;
  chargeType: "credit" | "charge" | "debit" | null;
  primaryCurrency: { id: string; name: string; code: string; currency_type: string; base_value_cents: number | null } | null;
  previewEarningRules: CardPreviewEarningRule[];
  previewCategoryBonuses: CardPreviewCategoryBonus[];
  previewCredits: CardPreviewCredit[];
}

interface CardRecommendationsSectionProps {
  recommendations: DashboardCardRecommendation[];
  existingCardIds: Set<string>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CardRecommendationsSection({ 
  recommendations, 
  existingCardIds 
}: CardRecommendationsSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [previewCard, setPreviewCard] = useState<CardPreviewData | null>(null);

  // Filter out cards the user already has
  const filteredRecommendations = recommendations.filter(
    (r) => !existingCardIds.has(r.cardId)
  );

  const openCardPreview = (rec: DashboardCardRecommendation) => {
    setPreviewCard({
      card: {
        id: rec.cardId,
        name: rec.cardName,
        slug: rec.cardSlug,
        annual_fee: rec.annualFee,
        default_earn_rate: rec.defaultEarnRate,
        issuer_name: rec.issuerName,
        card_charge_type: rec.chargeType,
      },
      primaryCurrency: rec.primaryCurrency,
      earningRules: rec.previewEarningRules,
      categoryBonuses: rec.previewCategoryBonuses,
      credits: rec.previewCredits,
      welcomeBonuses: [],
      isOwned: false,
    });
  };

  if (filteredRecommendations.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-zinc-900 p-5">
      {/* Header - always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-start justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Boost Your Earnings</h3>
            <p className="text-sm text-zinc-400">
              Based on your spending, these cards could increase your annual return
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-zinc-400 transition-transform flex-shrink-0 mt-2 ${isCollapsed ? "" : "rotate-180"}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - collapsible */}
      {!isCollapsed && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredRecommendations.map((rec, index) => (
              <div 
                key={rec.cardId}
                className="relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 hover:border-emerald-500/50 transition-colors"
              >
                {/* Rank Badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-1">
                    <h4 className="font-medium text-white truncate flex-1">{rec.cardName}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardPreview(rec);
                      }}
                      className="shrink-0 p-1 text-zinc-500 hover:text-blue-400 transition-colors"
                      title="View card details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">{rec.currencyName}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Spending Earnings</span>
                    <span className="text-zinc-300">
                      +{formatCurrency(rec.spendingEarnings)}/yr
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Net Annual Fee</span>
                    <span className="text-zinc-300">
                      {rec.netFee > 0 ? `-${formatCurrency(rec.netFee)}` : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-zinc-700 pt-2 mt-2">
                    <span className="text-zinc-300 font-medium">Total Earnings</span>
                    <span className="text-emerald-400 font-semibold">
                      +{formatCurrency(rec.totalEarnings)}/yr
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/compare?tab=evaluate"
            className="block text-center text-sm text-blue-400 hover:text-blue-300 pt-2"
          >
            Compare all cards →
          </Link>
        </div>
      )}

      {/* Card Preview Modal */}
      <CardPreviewModal
        isOpen={previewCard !== null}
        onClose={() => setPreviewCard(null)}
        data={previewCard}
      />
    </div>
  );
}
