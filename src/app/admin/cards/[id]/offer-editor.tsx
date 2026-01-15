"use client";

import { useState, useTransition } from "react";
import { Tables } from "@/lib/database.types";
import { ChevronDown, ChevronUp, Archive, Copy, Plus, Trash2, X, Pencil, Check } from "lucide-react";

interface BonusTier {
  id: string;
  spend_requirement_cents: number;
  time_period: number;
  time_period_unit: "days" | "months";
  component_type: "points" | "cash" | "benefit";
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  default_benefit_value_cents: number | null;
  currency_name?: string;
}

interface ElevatedEarning {
  id: string;
  elevated_rate: number;
  duration_months: number | null;
  duration_unit: "days" | "months";
  category_id: number | null;
  category_name?: string;
}

interface IntroApr {
  id: string;
  apr_type: "purchases" | "balance_transfers" | "both";
  apr_rate: number;
  duration: number;
  duration_unit: "days" | "months";
}

interface Offer {
  id: string;
  card_id: string;
  is_active: boolean | null;
  is_archived: boolean | null;
  archived_at: string | null;
  offer_description: string | null;
  internal_description: string | null;
  offer_type: "referral" | "affiliate" | "direct" | "nll" | "elevated";
  first_year_af_waived: boolean | null;
  expires_at: string | null;
  editorial_notes: string | null;
  ath_redirect_url: string | null;
  application_url: string | null;
  rates_fees_url: string | null;
  created_at: string | null;
  bonuses: BonusTier[];
  elevated_earnings: ElevatedEarning[];
  intro_aprs: IntroApr[];
}

interface OfferEditorProps {
  cardId: string;
  cardDefaultEarnRate: number;
  offer: Offer | null;
  archivedOffers: Offer[];
  currencies: Tables<"reward_currencies">[];
  categories: { id: number; name: string }[];
  onCreateOffer: () => Promise<void>;
  onUpdateOffer: (offerId: string, formData: FormData) => Promise<void>;
  onArchiveOffer: (offerId: string) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onCloneOffer: (sourceOfferId: string) => Promise<void>;
  onAddBonus: (offerId: string, formData: FormData) => Promise<void>;
  onUpdateBonus: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteBonus: (bonusId: string) => Promise<void>;
  onAddElevatedEarning: (offerId: string, formData: FormData) => Promise<void>;
  onUpdateElevatedEarning: (earningId: string, formData: FormData) => Promise<void>;
  onDeleteElevatedEarning: (earningId: string) => Promise<void>;
  onAddIntroApr: (offerId: string, formData: FormData) => Promise<void>;
  onUpdateIntroApr: (aprId: string, formData: FormData) => Promise<void>;
  onDeleteIntroApr: (aprId: string) => Promise<void>;
}

const componentTypeLabels: Record<string, string> = {
  points: "Points",
  cash: "Cash/Statement Credit",
  benefit: "Benefit",
};

const aprTypeLabels: Record<string, string> = {
  purchases: "Purchases",
  balance_transfers: "Balance Transfers",
  both: "Purchases & Balance Transfers",
};

const offerTypeLabels: Record<string, string> = {
  referral: "Referral",
  affiliate: "Affiliate",
  direct: "Direct",
  nll: "NLL",
  elevated: "Elevated",
};

export function OfferEditor({
  cardId,
  cardDefaultEarnRate,
  offer,
  archivedOffers,
  currencies,
  categories,
  onCreateOffer,
  onUpdateOffer,
  onArchiveOffer,
  onDeleteOffer,
  onCloneOffer,
  onAddBonus,
  onUpdateBonus,
  onDeleteBonus,
  onAddElevatedEarning,
  onUpdateElevatedEarning,
  onDeleteElevatedEarning,
  onAddIntroApr,
  onUpdateIntroApr,
  onDeleteIntroApr,
}: OfferEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [showArchivedOffers, setShowArchivedOffers] = useState(false);
  // Start expanded if offer has no content (new offer), otherwise collapsed
  const hasContent = offer && (offer.offer_description || offer.bonuses.length > 0);
  const [isCollapsed, setIsCollapsed] = useState(hasContent ? true : false);
  
  // Form states
  const [isAddingBonus, setIsAddingBonus] = useState(false);
  const [isAddingEarning, setIsAddingEarning] = useState(false);
  const [isAddingApr, setIsAddingApr] = useState(false);
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [editingEarningId, setEditingEarningId] = useState<string | null>(null);
  const [editingAprId, setEditingAprId] = useState<string | null>(null);

  // New bonus form state
  const [newBonusType, setNewBonusType] = useState<"points" | "cash" | "benefit">("points");
  const [newSpendRequirement, setNewSpendRequirement] = useState("");
  const [newTimePeriod, setNewTimePeriod] = useState("3");
  const [newTimePeriodUnit, setNewTimePeriodUnit] = useState<"days" | "months">("months");
  const [newPointsAmount, setNewPointsAmount] = useState("");
  const [newCurrencyId, setNewCurrencyId] = useState("");
  const [newCashAmount, setNewCashAmount] = useState("");
  const [newBenefitDescription, setNewBenefitDescription] = useState("");
  const [newBenefitValue, setNewBenefitValue] = useState("");

  // New elevated earning form state
  const [newElevatedRate, setNewElevatedRate] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newDurationUnit, setNewDurationUnit] = useState<"days" | "months">("months");
  const [newCategoryId, setNewCategoryId] = useState("");

  // New intro APR form state
  const [newAprType, setNewAprType] = useState<"purchases" | "balance_transfers" | "both">("purchases");
  const [newAprRate, setNewAprRate] = useState("0");
  const [newAprDuration, setNewAprDuration] = useState("");
  const [newAprDurationUnit, setNewAprDurationUnit] = useState<"days" | "months">("months");

  const resetBonusForm = () => {
    setNewBonusType("points");
    setNewSpendRequirement("");
    setNewTimePeriod("3");
    setNewTimePeriodUnit("months");
    setNewPointsAmount("");
    setNewCurrencyId("");
    setNewCashAmount("");
    setNewBenefitDescription("");
    setNewBenefitValue("");
  };

  const resetEarningForm = () => {
    setNewElevatedRate("");
    setNewDuration("");
    setNewDurationUnit("months");
    setNewCategoryId("");
  };

  const resetAprForm = () => {
    setNewAprType("purchases");
    setNewAprRate("0");
    setNewAprDuration("");
    setNewAprDurationUnit("months");
  };

  const handleCreateOffer = () => {
    startTransition(async () => {
      await onCreateOffer();
    });
  };

  const handleArchiveOffer = () => {
    if (!offer) return;
    if (!confirm("Archive this offer? You can clone it later to create a new offer.")) return;
    startTransition(async () => {
      await onArchiveOffer(offer.id);
    });
  };

  const handleDeleteOffer = () => {
    if (!offer) return;
    if (!confirm("Permanently delete this offer? This cannot be undone.")) return;
    startTransition(async () => {
      await onDeleteOffer(offer.id);
    });
  };

  const handleCloneOffer = (sourceOfferId: string) => {
    startTransition(async () => {
      await onCloneOffer(sourceOfferId);
    });
  };

  const handleAddBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    const formData = new FormData();
    formData.set("component_type", newBonusType);
    formData.set("spend_requirement_cents", String(parseFloat(newSpendRequirement || "0") * 100));
    formData.set("time_period", newTimePeriod);
    formData.set("time_period_unit", newTimePeriodUnit);

    if (newBonusType === "points") {
      formData.set("points_amount", newPointsAmount);
      formData.set("currency_id", newCurrencyId);
    } else if (newBonusType === "cash") {
      formData.set("cash_amount_cents", String(parseFloat(newCashAmount || "0") * 100));
    } else {
      formData.set("benefit_description", newBenefitDescription);
      formData.set("default_benefit_value_cents", String(parseFloat(newBenefitValue || "0") * 100));
    }

    startTransition(async () => {
      await onAddBonus(offer.id, formData);
      setIsAddingBonus(false);
      resetBonusForm();
    });
  };

  const handleUpdateBonus = (bonusId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onUpdateBonus(bonusId, formData);
      setEditingBonusId(null);
    });
  };

  const handleDeleteBonus = (bonusId: string) => {
    if (!confirm("Delete this bonus tier?")) return;
    startTransition(async () => {
      await onDeleteBonus(bonusId);
    });
  };

  const handleAddElevatedEarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    const formData = new FormData();
    formData.set("elevated_rate", newElevatedRate);
    formData.set("duration_months", newDuration || "");
    formData.set("duration_unit", newDurationUnit);
    formData.set("category_id", newCategoryId || "");

    startTransition(async () => {
      await onAddElevatedEarning(offer.id, formData);
      setIsAddingEarning(false);
      resetEarningForm();
    });
  };

  const handleUpdateElevatedEarning = (earningId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onUpdateElevatedEarning(earningId, formData);
      setEditingEarningId(null);
    });
  };

  const handleDeleteElevatedEarning = (earningId: string) => {
    if (!confirm("Delete this elevated earning?")) return;
    startTransition(async () => {
      await onDeleteElevatedEarning(earningId);
    });
  };

  const handleAddIntroApr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    const formData = new FormData();
    formData.set("apr_type", newAprType);
    formData.set("apr_rate", newAprRate);
    formData.set("duration", newAprDuration);
    formData.set("duration_unit", newAprDurationUnit);

    startTransition(async () => {
      await onAddIntroApr(offer.id, formData);
      setIsAddingApr(false);
      resetAprForm();
    });
  };

  const handleUpdateIntroApr = (aprId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onUpdateIntroApr(aprId, formData);
      setEditingAprId(null);
    });
  };

  const handleDeleteIntroApr = (aprId: string) => {
    if (!confirm("Delete this intro APR?")) return;
    startTransition(async () => {
      await onDeleteIntroApr(aprId);
    });
  };

  const formatBonusValue = (bonus: BonusTier) => {
    if (bonus.component_type === "points") {
      return `${bonus.points_amount?.toLocaleString()} ${bonus.currency_name ?? "points"}`;
    } else if (bonus.component_type === "cash") {
      return `$${((bonus.cash_amount_cents ?? 0) / 100).toLocaleString()}`;
    } else {
      return bonus.benefit_description ?? "Benefit";
    }
  };

  // No offer exists - show create button
  if (!offer) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">No offer configured for this card.</p>
          <button
            type="button"
            onClick={handleCreateOffer}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Offer"}
          </button>
        </div>

        {/* Show archived offers if any */}
        {archivedOffers.length > 0 && (
          <div className="border-t border-zinc-700 pt-4">
            <button
              type="button"
              onClick={() => setShowArchivedOffers(!showArchivedOffers)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            >
              {showArchivedOffers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Archived Offers ({archivedOffers.length})
            </button>
            {showArchivedOffers && (
              <div className="mt-3 space-y-2">
                {archivedOffers.map((archived) => (
                  <div key={archived.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="text-sm text-zinc-300">{archived.offer_description || "No description"}</p>
                      <p className="text-xs text-zinc-500">
                        Archived {archived.archived_at ? new Date(archived.archived_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCloneOffer(archived.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="w-3 h-3" />
                      Clone as New
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Offer exists - show editor
  return (
    <div className="space-y-4">
      {/* Offer Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-700/50 text-green-300">Active</span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            offer.offer_type === "referral" ? "bg-purple-700/50 text-purple-300" :
            offer.offer_type === "nll" ? "bg-amber-700/50 text-amber-300" :
            offer.offer_type === "direct" ? "bg-blue-700/50 text-blue-300" :
            "bg-zinc-700/50 text-zinc-300"
          }`}>
            {offerTypeLabels[offer.offer_type]}
          </span>
          {offer.internal_description && (
            <span className="text-sm text-zinc-400 italic">
              {offer.internal_description}
            </span>
          )}
          {offer.expires_at && (
            <span className="text-sm text-zinc-500">
              Expires: {offer.expires_at}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCloneOffer(offer.id)}
            disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 border border-blue-700/50 rounded-lg hover:bg-blue-900/20"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={handleArchiveOffer}
            disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 border border-amber-700/50 rounded-lg hover:bg-amber-900/20"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
          <button
            type="button"
            onClick={handleDeleteOffer}
            disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-700/50 rounded-lg hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Collapsed view - just show offer description */}
      {isCollapsed && offer.offer_description && (
        <p className="text-sm text-zinc-400 line-clamp-2 pl-7">{offer.offer_description}</p>
      )}

      {/* Expanded view - full form */}
      {!isCollapsed && (
      <>
      <form
        action={(formData) => {
          startTransition(async () => {
            await onUpdateOffer(offer.id, formData);
          });
        }}
        className="space-y-4"
      >
        {/* Internal fields - admin only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Internal Description (Admin Only)</label>
            <input
              type="text"
              name="internal_description"
              defaultValue={offer.internal_description ?? ""}
              placeholder="e.g., 'Best public offer', 'Referral link for P2'"
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Offer Type</label>
            <select
              name="offer_type"
              defaultValue={offer.offer_type}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select type...</option>
              <option value="affiliate">Affiliate</option>
              <option value="direct">Direct</option>
              <option value="referral">Referral</option>
              <option value="nll">NLL (No Lifetime Language)</option>
              <option value="elevated">Elevated</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Offer Description</label>
          <textarea
            name="offer_description"
            defaultValue={offer.offer_description ?? ""}
            rows={5}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            placeholder="Earn 125,000 bonus points after you spend $6,000 on purchases in the first 3 months from account opening. Plus, earn 2% cash back on all purchases for the first year..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Expiration Date</label>
            <input
              type="date"
              name="expires_at"
              defaultValue={offer.expires_at ?? ""}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="first_year_af_waived"
                defaultChecked={offer.first_year_af_waived ?? false}
                className="rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
              />
              First Year AF Waived
            </label>
          </div>
        </div>

        {/* Reference Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Editorial Notes</label>
            <textarea
              name="editorial_notes"
              defaultValue={offer.editorial_notes ?? ""}
              rows={2}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">ATH Redirect URL</label>
            <input
              type="url"
              name="ath_redirect_url"
              defaultValue={offer.ath_redirect_url ?? ""}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Application URL</label>
            <input
              type="url"
              name="application_url"
              defaultValue={offer.application_url ?? ""}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Rates & Fees URL</label>
            <input
              type="url"
              name="rates_fees_url"
              defaultValue={offer.rates_fees_url ?? ""}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Offer Details"}
          </button>
        </div>
      </form>

      {/* Welcome Bonus Tiers */}
      <div className="border-t border-zinc-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Welcome Bonus Tiers</h3>
          {!isAddingBonus && (
            <button
              type="button"
              onClick={() => setIsAddingBonus(true)}
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-4 h-4" />
              Add Tier
            </button>
          )}
        </div>

        {/* Existing Bonuses */}
        {offer.bonuses.length > 0 ? (
          <div className="space-y-2 mb-4">
            {offer.bonuses.map((bonus) => (
              <div key={bonus.id}>
                {editingBonusId === bonus.id ? (
                  <form onSubmit={(e) => handleUpdateBonus(bonus.id, e)} className="border border-zinc-600 rounded-lg p-3 space-y-3">
                    <BonusFormFields
                      bonus={bonus}
                      currencies={currencies}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={isPending} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50">
                        <Check className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => setEditingBonusId(null)} className="px-2 py-1 text-xs text-zinc-400 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <span className={`px-2 py-0.5 text-xs rounded mr-2 ${
                        bonus.component_type === "points"
                          ? "bg-blue-700/50 text-blue-300"
                          : bonus.component_type === "cash"
                          ? "bg-green-700/50 text-green-300"
                          : "bg-purple-700/50 text-purple-300"
                      }`}>
                        {componentTypeLabels[bonus.component_type]}
                      </span>
                      <span className="text-emerald-400 font-medium">{formatBonusValue(bonus)}</span>
                      <span className="text-zinc-400 ml-2">
                        after ${(bonus.spend_requirement_cents / 100).toLocaleString()} in {bonus.time_period} {bonus.time_period_unit}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingBonusId(bonus.id)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBonus(bonus.id)}
                        disabled={isPending}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mb-4">No bonus tiers configured.</p>
        )}

        {/* Add Bonus Form */}
        {isAddingBonus && (
          <form onSubmit={handleAddBonus} className="border border-zinc-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Add Bonus Tier</h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingBonus(false);
                  resetBonusForm();
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Type</label>
                <select
                  value={newBonusType}
                  onChange={(e) => setNewBonusType(e.target.value as "points" | "cash" | "benefit")}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                >
                  {Object.entries(componentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Spend Requirement ($)</label>
                <input
                  type="number"
                  value={newSpendRequirement}
                  onChange={(e) => setNewSpendRequirement(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                  placeholder="e.g., 6000"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Time Period</label>
                <input
                  type="number"
                  value={newTimePeriod}
                  onChange={(e) => setNewTimePeriod(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Unit</label>
                <select
                  value={newTimePeriodUnit}
                  onChange={(e) => setNewTimePeriodUnit(e.target.value as "days" | "months")}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>

              {newBonusType === "points" && (
                <>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Points Amount</label>
                    <input
                      type="number"
                      value={newPointsAmount}
                      onChange={(e) => setNewPointsAmount(e.target.value)}
                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                      placeholder="e.g., 125000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Currency</label>
                    <select
                      value={newCurrencyId}
                      onChange={(e) => setNewCurrencyId(e.target.value)}
                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                      required
                    >
                      <option value="">Select...</option>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {newBonusType === "cash" && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Cash Amount ($)</label>
                  <input
                    type="number"
                    value={newCashAmount}
                    onChange={(e) => setNewCashAmount(e.target.value)}
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                    placeholder="e.g., 200"
                    required
                  />
                </div>
              )}

              {newBonusType === "benefit" && (
                <>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Benefit Description</label>
                    <input
                      type="text"
                      value={newBenefitDescription}
                      onChange={(e) => setNewBenefitDescription(e.target.value)}
                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                      placeholder="e.g., Free Night Certificate"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Default Value ($)</label>
                    <input
                      type="number"
                      value={newBenefitValue}
                      onChange={(e) => setNewBenefitValue(e.target.value)}
                      className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                      placeholder="e.g., 400"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add Tier"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingBonus(false);
                  resetBonusForm();
                }}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Elevated Earnings */}
      <div className="border-t border-zinc-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Elevated Earnings (Time-Limited)</h3>
            <p className="text-xs text-zinc-500">Earning rate reverts to {cardDefaultEarnRate}x after duration ends</p>
          </div>
          {!isAddingEarning && (
            <button
              type="button"
              onClick={() => setIsAddingEarning(true)}
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-4 h-4" />
              Add Elevated Earning
            </button>
          )}
        </div>

        {/* Existing Elevated Earnings */}
        {offer.elevated_earnings.length > 0 ? (
          <div className="space-y-2 mb-4">
            {offer.elevated_earnings.map((earning) => (
              <div key={earning.id}>
                {editingEarningId === earning.id ? (
                  <form onSubmit={(e) => handleUpdateElevatedEarning(earning.id, e)} className="border border-zinc-600 rounded-lg p-3 space-y-3">
                    <ElevatedEarningFormFields earning={earning} categories={categories} />
                    <div className="flex gap-2">
                      <button type="submit" disabled={isPending} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50">
                        <Check className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => setEditingEarningId(null)} className="px-2 py-1 text-xs text-zinc-400 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <span className="text-emerald-400 font-medium">{earning.elevated_rate}x</span>
                      <span className="text-zinc-400 ml-2">
                        {earning.category_name ? `on ${earning.category_name}` : "on all purchases"}
                        {earning.duration_months && ` for ${earning.duration_months} ${earning.duration_unit}`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingEarningId(earning.id)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteElevatedEarning(earning.id)}
                        disabled={isPending}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mb-4">No elevated earnings configured.</p>
        )}

        {/* Add Elevated Earning Form */}
        {isAddingEarning && (
          <form onSubmit={handleAddElevatedEarning} className="border border-zinc-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Add Elevated Earning</h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingEarning(false);
                  resetEarningForm();
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Elevated Rate (x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newElevatedRate}
                  onChange={(e) => setNewElevatedRate(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                  placeholder="e.g., 2.0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Duration</label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                  placeholder="e.g., 12"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Unit</label>
                <select
                  value={newDurationUnit}
                  onChange={(e) => setNewDurationUnit(e.target.value as "days" | "months")}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Category (optional)</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                >
                  <option value="">All Purchases</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add Elevated Earning"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingEarning(false);
                  resetEarningForm();
                }}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Intro APR */}
      <div className="border-t border-zinc-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Intro APR</h3>
          {!isAddingApr && (
            <button
              type="button"
              onClick={() => setIsAddingApr(true)}
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-4 h-4" />
              Add Intro APR
            </button>
          )}
        </div>

        {/* Existing Intro APRs */}
        {offer.intro_aprs.length > 0 ? (
          <div className="space-y-2 mb-4">
            {offer.intro_aprs.map((apr) => (
              <div key={apr.id}>
                {editingAprId === apr.id ? (
                  <form onSubmit={(e) => handleUpdateIntroApr(apr.id, e)} className="border border-zinc-600 rounded-lg p-3 space-y-3">
                    <IntroAprFormFields apr={apr} />
                    <div className="flex gap-2">
                      <button type="submit" disabled={isPending} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50">
                        <Check className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => setEditingAprId(null)} className="px-2 py-1 text-xs text-zinc-400 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <span className="px-2 py-0.5 text-xs rounded mr-2 bg-purple-700/50 text-purple-300">{apr.apr_rate}% APR</span>
                      <span className="text-white">{aprTypeLabels[apr.apr_type]}</span>
                      <span className="text-zinc-400 ml-2">for {apr.duration} {apr.duration_unit}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingAprId(apr.id)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteIntroApr(apr.id)}
                        disabled={isPending}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mb-4">No intro APR configured.</p>
        )}

        {/* Add Intro APR Form */}
        {isAddingApr && (
          <form onSubmit={handleAddIntroApr} className="border border-zinc-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Add Intro APR</h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingApr(false);
                  resetAprForm();
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">APR Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newAprRate}
                  onChange={(e) => setNewAprRate(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Applies To</label>
                <select
                  value={newAprType}
                  onChange={(e) => setNewAprType(e.target.value as "purchases" | "balance_transfers" | "both")}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                >
                  {Object.entries(aprTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Duration</label>
                <input
                  type="number"
                  value={newAprDuration}
                  onChange={(e) => setNewAprDuration(e.target.value)}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                  placeholder="e.g., 15"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Unit</label>
                <select
                  value={newAprDurationUnit}
                  onChange={(e) => setNewAprDurationUnit(e.target.value as "days" | "months")}
                  className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-sm"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add Intro APR"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingApr(false);
                  resetAprForm();
                }}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      </>
      )}

      {/* Archived Offers */}
      {archivedOffers.length > 0 && (
        <div className="border-t border-zinc-700 pt-6">
          <button
            type="button"
            onClick={() => setShowArchivedOffers(!showArchivedOffers)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            {showArchivedOffers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Archived Offers ({archivedOffers.length})
          </button>
          {showArchivedOffers && (
            <div className="mt-3 space-y-2">
              {archivedOffers.map((archived) => (
                <div key={archived.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div>
                    <p className="text-sm text-zinc-300">{archived.offer_description || "No description"}</p>
                    <p className="text-xs text-zinc-500">
                      Archived {archived.archived_at ? new Date(archived.archived_at).toLocaleDateString() : ""}
                      {" • "}{archived.bonuses.length} bonus tier{archived.bonuses.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCloneOffer(archived.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Copy className="w-3 h-3" />
                    Clone as New
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-components for inline editing forms
function BonusFormFields({ bonus, currencies }: { bonus: BonusTier; currencies: Tables<"reward_currencies">[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Type</label>
        <select
          name="component_type"
          defaultValue={bonus.component_type}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        >
          {Object.entries(componentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Spend ($)</label>
        <input
          type="number"
          name="spend_requirement_cents"
          defaultValue={bonus.spend_requirement_cents / 100}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Time Period</label>
        <input
          type="number"
          name="time_period"
          defaultValue={bonus.time_period}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Unit</label>
        <select
          name="time_period_unit"
          defaultValue={bonus.time_period_unit}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
      </div>
      {bonus.component_type === "points" && (
        <>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Points</label>
            <input
              type="number"
              name="points_amount"
              defaultValue={bonus.points_amount ?? ""}
              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Currency</label>
            <select
              name="currency_id"
              defaultValue={bonus.currency_id ?? ""}
              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
            >
              <option value="">Select...</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {bonus.component_type === "cash" && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Cash ($)</label>
          <input
            type="number"
            name="cash_amount_cents"
            defaultValue={(bonus.cash_amount_cents ?? 0) / 100}
            className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
          />
        </div>
      )}
      {bonus.component_type === "benefit" && (
        <>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Description</label>
            <input
              type="text"
              name="benefit_description"
              defaultValue={bonus.benefit_description ?? ""}
              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Value ($)</label>
            <input
              type="number"
              name="default_benefit_value_cents"
              defaultValue={(bonus.default_benefit_value_cents ?? 0) / 100}
              className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}

function ElevatedEarningFormFields({ earning, categories }: { earning: ElevatedEarning; categories: { id: number; name: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Rate (x)</label>
        <input
          type="number"
          step="0.1"
          name="elevated_rate"
          defaultValue={earning.elevated_rate}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Duration</label>
        <input
          type="number"
          name="duration_months"
          defaultValue={earning.duration_months ?? ""}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Unit</label>
        <select
          name="duration_unit"
          defaultValue={earning.duration_unit}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Category</label>
        <select
          name="category_id"
          defaultValue={earning.category_id ?? ""}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        >
          <option value="">All Purchases</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IntroAprFormFields({ apr }: { apr: IntroApr }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">APR Rate (%)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          name="apr_rate"
          defaultValue={apr.apr_rate}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Applies To</label>
        <select
          name="apr_type"
          defaultValue={apr.apr_type}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        >
          {Object.entries(aprTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Duration</label>
        <input
          type="number"
          name="duration"
          defaultValue={apr.duration}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Unit</label>
        <select
          name="duration_unit"
          defaultValue={apr.duration_unit}
          className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-white text-xs"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
      </div>
    </div>
  );
}
