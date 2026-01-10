"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

export interface CardBasicInfo {
  id: string;
  name: string;
  slug: string;
  annual_fee: number;
  default_earn_rate: number;
  issuer_name: string | null;
  card_charge_type?: "credit" | "charge" | null;
}

export interface CardCurrency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
}

export interface CardEarningRule {
  category_id: number;
  category_name: string;
  rate: number;
  has_cap: boolean;
  cap_amount: number | null;
  cap_period: string | null;
  cap_unit: string | null;
  post_cap_rate: number | null;
  booking_method: string;
  brand_name: string | null;
}

export interface CardCategoryBonus {
  id: string;
  cap_type: string;
  cap_amount: number | null;
  cap_period: string | null;
  elevated_rate: number;
  post_cap_rate: number | null;
  categories: { id: number; name: string }[];
}

export interface CardCredit {
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

export interface CardWelcomeBonus {
  id: string;
  component_type: "points" | "cash" | "benefit";
  spend_requirement_cents: number;
  time_period_months: number;
  points_amount: number | null;
  currency_name: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  default_benefit_value_cents: number | null;
}

export interface CardPreviewData {
  card: CardBasicInfo;
  primaryCurrency: CardCurrency | null;
  secondaryCurrency?: CardCurrency | null;
  earningRules: CardEarningRule[];
  categoryBonuses: CardCategoryBonus[];
  credits: CardCredit[];
  welcomeBonuses: CardWelcomeBonus[];
  isOwned?: boolean;
}

interface CardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CardPreviewData | null;
  onAddToWallet?: (cardId: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCapPeriod(period: string | null): string {
  switch (period) {
    case "month": return "/month";
    case "quarter": return "/quarter";
    case "year": return "/year";
    case "lifetime": return " lifetime";
    default: return "";
  }
}

function formatResetCycle(cycle: string): string {
  const labels: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    semiannual: "Semi-Annual",
    annual: "Annual",
    cardmember_year: "Cardmember Year",
    usage_based: "Usage Based",
  };
  return labels[cycle] || cycle;
}

const currencyTypeConfig: Record<string, { label: string; className: string }> = {
  airline_miles: { 
    label: "Airline Miles", 
    className: "bg-sky-500/20 text-sky-300 border-sky-500/30" 
  },
  hotel_points: { 
    label: "Hotel Points", 
    className: "bg-amber-500/20 text-amber-300 border-amber-500/30" 
  },
  transferable_points: { 
    label: "Transferable Points", 
    className: "bg-violet-500/20 text-violet-300 border-violet-500/30" 
  },
  non_transferable_points: { 
    label: "Non-Transferable Points", 
    className: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
  },
  cash_back: { 
    label: "Cash Back", 
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
  },
  crypto: { 
    label: "Crypto", 
    className: "bg-orange-500/20 text-orange-300 border-orange-500/30" 
  },
};

// ============================================================================
// Component
// ============================================================================

export function CardPreviewModal({
  isOpen,
  onClose,
  data,
  onAddToWallet,
}: CardPreviewModalProps) {
  // Group earning rules by category for display
  const groupedEarningRules = useMemo(() => {
    if (!data) return [];
    
    // Filter to only "any" booking method rules (direct) and dedupe by category
    const directRules = data.earningRules.filter(r => r.booking_method === "any");
    const byCategory = new Map<number, CardEarningRule>();
    
    for (const rule of directRules) {
      const existing = byCategory.get(rule.category_id);
      if (!existing || rule.rate > existing.rate) {
        byCategory.set(rule.category_id, rule);
      }
    }
    
    return Array.from(byCategory.values())
      .filter(r => r.rate > (data.card.default_earn_rate || 1))
      .sort((a, b) => b.rate - a.rate);
  }, [data]);

  // Calculate total annual credit value
  const totalCreditValue = useMemo(() => {
    if (!data) return 0;
    
    let total = 0;
    for (const credit of data.credits) {
      if (!credit.default_value_cents) continue;
      
      // Multiply by credit_count (for multiple slots) and frequency
      const count = credit.credit_count || 1;
      const valuePerPeriod = credit.default_value_cents * count;
      
      switch (credit.reset_cycle) {
        case "monthly":
          total += valuePerPeriod * 12;
          break;
        case "quarterly":
          total += valuePerPeriod * 4;
          break;
        case "semiannual":
          total += valuePerPeriod * 2;
          break;
        case "annual":
        case "cardmember_year":
          total += valuePerPeriod;
          break;
        // usage_based credits are not counted in annual value
      }
    }
    
    return total;
  }, [data]);

  // Calculate welcome bonus value
  const welcomeBonusValue = useMemo(() => {
    if (!data || data.welcomeBonuses.length === 0) return null;
    
    let total = 0;
    const components: string[] = [];
    
    for (const bonus of data.welcomeBonuses) {
      if (bonus.component_type === "points" && bonus.points_amount) {
        // Use base value of 1 cent per point as default
        const pointValue = data.primaryCurrency?.base_value_cents || 1;
        const value = (bonus.points_amount * pointValue) / 100;
        total += value;
        components.push(`${bonus.points_amount.toLocaleString()} ${bonus.currency_name || "points"}`);
      } else if (bonus.component_type === "cash" && bonus.cash_amount_cents) {
        total += bonus.cash_amount_cents / 100;
        components.push(formatCurrency(bonus.cash_amount_cents));
      } else if (bonus.component_type === "benefit") {
        const value = bonus.default_benefit_value_cents || 0;
        total += value / 100;
        components.push(bonus.benefit_description || "Benefit");
      }
    }
    
    // Get spend requirement from first bonus
    const spendReq = data.welcomeBonuses[0]?.spend_requirement_cents || 0;
    const months = data.welcomeBonuses[0]?.time_period_months || 3;
    
    return { total, components, spendRequirement: spendReq, months };
  }, [data]);

  if (!data) return null;

  const { card, primaryCurrency, secondaryCurrency, categoryBonuses, credits } = data;
  const currencyConfig = primaryCurrency 
    ? currencyTypeConfig[primaryCurrency.currency_type] 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {card.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="flex flex-wrap items-center gap-3">
            {card.issuer_name && (
              <span className="text-sm text-zinc-400">{card.issuer_name}</span>
            )}
            <span className="text-sm px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300">
              {card.annual_fee > 0 ? `$${card.annual_fee}/yr` : "No Annual Fee"}
            </span>
            {card.card_charge_type === "charge" && (
              <span className="text-sm px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Charge Card
              </span>
            )}
            {primaryCurrency && currencyConfig && (
              <span className={`text-sm px-2 py-1 rounded-lg border ${currencyConfig.className}`}>
                {primaryCurrency.name}
              </span>
            )}
            {secondaryCurrency && (
              <span className="text-sm px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
                + {secondaryCurrency.name}
              </span>
            )}
          </div>

          {/* Welcome Bonus */}
          {welcomeBonusValue && welcomeBonusValue.total > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">
                Welcome Bonus
              </h3>
              <div className="space-y-1">
                <div className="text-lg font-bold text-white">
                  {welcomeBonusValue.components.join(" + ")}
                </div>
                <div className="text-sm text-zinc-400">
                  Spend {formatCurrency(welcomeBonusValue.spendRequirement)} in {welcomeBonusValue.months} months
                </div>
                <div className="text-xs text-emerald-400/70">
                  ≈ {formatCurrency(welcomeBonusValue.total * 100)} value
                </div>
              </div>
            </div>
          )}

          {/* Bonus Earning Categories */}
          {(groupedEarningRules.length > 0 || categoryBonuses.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                Bonus Earning Categories
              </h3>
              <div className="space-y-2">
                {/* Direct earning rules */}
                {groupedEarningRules.map((rule) => (
                  <div 
                    key={rule.category_id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50"
                  >
                    <span className="text-sm text-white">{rule.category_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-400">
                        {rule.rate}x
                      </span>
                      {rule.has_cap && rule.cap_amount && (
                        <span className="text-xs text-amber-400">
                          (${rule.cap_amount.toLocaleString()}{formatCapPeriod(rule.cap_period)} cap)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Category bonuses (caps with elevated rates) */}
                {categoryBonuses.map((bonus) => (
                  <div 
                    key={bonus.id}
                    className="px-3 py-2 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        {bonus.cap_type === "all_categories" 
                          ? "All Spending" 
                          : bonus.cap_type === "selected_category"
                          ? "Selected Category"
                          : bonus.cap_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {bonus.elevated_rate}x
                      </span>
                    </div>
                    {bonus.categories.length > 0 && (
                      <div className="text-xs text-zinc-400">
                        {bonus.categories.map(c => c.name).join(", ")}
                      </div>
                    )}
                    {bonus.cap_amount && (
                      <div className="text-xs text-amber-400 mt-1">
                        ${bonus.cap_amount.toLocaleString()}{formatCapPeriod(bonus.cap_period)} cap
                        {bonus.post_cap_rate && `, then ${bonus.post_cap_rate}x`}
                      </div>
                    )}
                  </div>
                ))}

                {/* Default rate */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/30">
                  <span className="text-sm text-zinc-400">Everything Else</span>
                  <span className="text-sm text-zinc-400">
                    {card.default_earn_rate}x
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Credits */}
          {credits.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Card Credits
                </h3>
                {totalCreditValue > 0 && (
                  <span className="text-xs text-emerald-400">
                    Up to {formatCurrency(totalCreditValue)}/yr in credits
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {credits.map((credit) => (
                  <div 
                    key={credit.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">
                        {credit.name}
                        {credit.brand_name && (
                          <span className="text-zinc-400"> ({credit.brand_name})</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatResetCycle(credit.reset_cycle)}
                        {credit.credit_count > 1 && ` × ${credit.credit_count}`}
                      </div>
                    </div>
                    <div className="text-right">
                      {credit.default_value_cents ? (
                        <span className="text-sm font-medium text-emerald-400">
                          {formatCurrency(credit.default_value_cents)}
                        </span>
                      ) : credit.default_quantity && credit.unit_name ? (
                        <span className="text-sm text-zinc-300">
                          {credit.default_quantity} {credit.unit_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Point Value Info */}
          {primaryCurrency && primaryCurrency.base_value_cents && (
            <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-4">
              <span className="text-zinc-400">{primaryCurrency.name}</span> valued at{" "}
              <span className="text-zinc-300">{primaryCurrency.base_value_cents}¢</span> per point
            </div>
          )}

          {/* Add to Wallet Button */}
          {onAddToWallet && !data.isOwned && (
            <button
              onClick={() => {
                onAddToWallet(card.id);
                onClose();
              }}
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
            >
              Add to Wallet
            </button>
          )}
          
          {data.isOwned && (
            <div className="text-center text-sm text-zinc-500 border-t border-zinc-800 pt-4">
              ✓ This card is in your wallet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Credits Popup (Simpler version for table cell clicks)
// ============================================================================

export interface CreditsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  credits: CardCredit[];
}

// Format value with period suffix
function formatValueWithPeriod(cents: number, cycle: string): string {
  const value = formatCurrency(cents);
  switch (cycle) {
    case "monthly": return `${value}/mo`;
    case "quarterly": return `${value}/qtr`;
    case "semiannual": return `${value}/6mo`;
    case "annual": return `${value}/yr`;
    case "cardmember_year": return `${value}/yr`;
    case "usage_based": return `${value}/4yr`;
    default: return value;
  }
}

export function CreditsPopup({ isOpen, onClose, cardName, credits }: CreditsPopupProps) {
  // Sort credits alphabetically by name
  const sortedCredits = useMemo(() => {
    return [...credits].sort((a, b) => a.name.localeCompare(b.name));
  }, [credits]);

  // Calculate annual total (usage_based credits amortized over 4 years)
  const annualTotal = useMemo(() => {
    let total = 0;
    
    for (const credit of credits) {
      if (!credit.default_value_cents) continue;
      const count = credit.credit_count || 1;
      const valuePerPeriod = credit.default_value_cents * count;
      
      switch (credit.reset_cycle) {
        case "monthly": total += valuePerPeriod * 12; break;
        case "quarterly": total += valuePerPeriod * 4; break;
        case "semiannual": total += valuePerPeriod * 2; break;
        case "annual":
        case "cardmember_year": total += valuePerPeriod; break;
        // Usage-based credits (like Global Entry) amortized over 4 years
        case "usage_based": total += Math.round(valuePerPeriod / 4); break;
      }
    }
    return total;
  }, [credits]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            {cardName} Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2 overflow-y-auto flex-1">
          {sortedCredits.length === 0 ? (
            <p className="text-sm text-zinc-400">No credits associated with this card.</p>
          ) : (
            <>
              {sortedCredits.map((credit) => {
                // Check if this is a benefit that must be earned (has notes or is a non-cash benefit)
                const isEarnedBenefit = !credit.default_value_cents && credit.default_quantity && credit.unit_name;
                const hasWarningNote = credit.notes && credit.notes.length > 0;
                
                return (
                  <div 
                    key={credit.id}
                    className="px-3 py-2 rounded-lg bg-zinc-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white">
                          {credit.name}
                          {credit.brand_name && (
                            <span className="text-white"> ({credit.brand_name})</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {formatResetCycle(credit.reset_cycle)}
                          {credit.credit_count > 1 && ` × ${credit.credit_count}`}
                        </div>
                      </div>
                      <div className="text-right">
                        {credit.default_value_cents ? (
                          <span className="text-sm font-medium text-emerald-400">
                            {formatValueWithPeriod(credit.default_value_cents, credit.reset_cycle)}
                          </span>
                        ) : credit.default_quantity && credit.unit_name ? (
                          <span className="text-sm font-medium text-emerald-400">
                            {credit.default_quantity} {credit.unit_name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {/* Show warning for earned benefits or credits with notes */}
                    {(isEarnedBenefit || hasWarningNote) && (
                      <div className="mt-1 text-xs text-amber-400 flex items-start gap-1">
                        <span>⚠️</span>
                        <span>{credit.notes || "Must be earned through qualifying activity"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        {annualTotal > 0 && (
          <div className="text-sm text-right text-emerald-400 pt-2 border-t border-zinc-800 mt-2">
            Up to {formatCurrency(annualTotal)}/yr total
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

