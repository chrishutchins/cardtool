"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateBillingDates,
  getFormulaInfo,
  formatBillingDate,
  type BillingCycleFormula,
} from "@/lib/billing-cycle";

// ============================================================================
// Types
// ============================================================================

export interface WalletCardForSettings {
  id: string;
  card_id: string;
  custom_name: string | null;
  approval_date: string | null;
  player_number: number | null;
  // Statement date fields
  statement_close_day?: number | null;
  payment_due_day?: number | null;
  manual_balance_cents?: number | null;
  manual_credit_limit_cents?: number | null;
  // Wallet enhancement fields
  annual_fee_override?: number | null;
  notes?: string | null;
  network_override?: "visa" | "mastercard" | "amex" | "discover" | null;
  cards: {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    card_charge_type?: "credit" | "charge" | null;
    product_type?: "personal" | "business" | null;
    network?: "visa" | "mastercard" | "amex" | "discover" | null;
    issuers: { 
      name: string;
      billing_cycle_formula?: string | null;
    } | null;
    primary_currency: { name: string; code: string; currency_type?: string } | null;
  } | null;
}

export interface LinkedAccountInfo {
  current_balance: number | null;
  credit_limit: number | null;
  manual_credit_limit: number | null;
  available_balance: number | null;
  last_balance_update: string | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

export interface BankAccountForSettings {
  id: string;
  name: string;
  display_name: string | null;
  institution_name: string | null;
  mask: string | null;
  available_balance: number | null;
  is_primary: boolean | null;
}

export interface PaymentSettingsForCard {
  pay_from_account_id: string | null;
  is_autopay: boolean;
  autopay_type: string | null;
}

// Currency type for bonus forms
interface Currency {
  id: string;
  name: string;
  code: string;
  currency_type: string;
}

interface CardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletCard: WalletCardForSettings;
  linkedAccount: LinkedAccountInfo | null;
  perksValue: number;
  debitPayPercent: number;
  debitPayEnabled: boolean;
  players: Player[];
  playerCount: number;
  bankAccounts?: BankAccountForSettings[];
  paymentSettings?: PaymentSettingsForCard | null;
  onUpdateCustomName: (walletId: string, customName: string | null) => Promise<void>;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
  onUpdatePlayerNumber: (walletId: string, playerNumber: number) => Promise<void>;
  onUpdatePerks: (walletCardId: string, perksValue: number) => Promise<void>;
  onUpdateDebitPay: (walletCardId: string, percent: number) => Promise<void>;
  onUpdateStatementFields?: (walletId: string, fields: {
    statement_close_day: number | null;
    payment_due_day: number | null;
    manual_balance_cents: number | null;
    manual_credit_limit_cents: number | null;
  }) => Promise<void>;
  onUpdatePaymentSettings?: (walletId: string, settings: {
    pay_from_account_id: string | null;
    is_autopay: boolean;
    autopay_type: string | null;
  }) => Promise<void>;
  onUpdateAnnualFeeOverride?: (walletId: string, feeOverride: number | null) => Promise<void>;
  onUpdateNotes?: (walletId: string, notes: string | null) => Promise<void>;
  onUpdateNetworkOverride?: (walletId: string, network: "visa" | "mastercard" | "amex" | "discover" | null) => Promise<void>;
  onRemove: (walletId: string) => Promise<void>;
  onProductChange?: () => void;
  onCloseCard?: () => void;
  onViewPerks?: () => void;
  // Category selection for cards with user-selectable categories
  categorySelectionCaps?: {
    id: string;
    cap_type: string;
    cap_amount: number | null;
    categories: { id: number; name: string }[];
  }[];
  categorySelections?: { cap_id: string; selected_category_id: number; wallet_card_id?: string | null }[];
  onSelectCategory?: (capId: string, categoryId: number, walletCardId?: string) => Promise<void>;
  // Currencies for bonus forms
  currencies?: Currency[];
  // User bonuses (welcome/spend bonuses for this card)
  welcomeBonuses?: {
    id: string;
    is_active: boolean;
    component_type: "points" | "cash" | "benefit";
    spend_requirement_cents: number;
    time_period_months: number;
    points_amount: number | null;
    cash_amount_cents: number | null;
    benefit_description: string | null;
    value_cents: number | null;
    currency_id?: string | null;
    currency_name?: string | null;
  }[];
  spendBonuses?: {
    id: string;
    is_active: boolean;
    name: string;
    bonus_type: "threshold" | "elite_earning";
    spend_threshold_cents: number | null;
    reward_type: "points" | "cash" | "benefit" | null;
    points_amount: number | null;
    cash_amount_cents: number | null;
    benefit_description: string | null;
    value_cents: number | null;
    period: "year" | "calendar_year" | "lifetime" | null;
    per_spend_cents: number | null;
    elite_unit_name: string | null;
    unit_value_cents: number | null;
    currency_id?: string | null;
    currency_name?: string | null;
    cap_amount?: number | null;
    cap_period?: "year" | "calendar_year" | null;
  }[];
  onToggleWelcomeBonusActive?: (bonusId: string, isActive: boolean) => Promise<void>;
  onToggleSpendBonusActive?: (bonusId: string, isActive: boolean) => Promise<void>;
  // Full CRUD for bonuses
  onAddWelcomeBonus?: (walletCardId: string, formData: FormData) => Promise<void>;
  onUpdateWelcomeBonus?: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteWelcomeBonus?: (bonusId: string) => Promise<void>;
  onAddSpendBonus?: (walletCardId: string, formData: FormData) => Promise<void>;
  onUpdateSpendBonus?: (bonusId: string, formData: FormData) => Promise<void>;
  onDeleteSpendBonus?: (bonusId: string) => Promise<void>;
  // Bilt housing settings
  biltSettings?: {
    biltOption: number;
    housingTier: string;
    monthlyBiltSpendCents: number | null;
  } | null;
  onSaveBiltSettings?: (
    biltOption: number,
    housingTier: string,
    monthlyBiltSpendCents: number | null
  ) => Promise<void>;
  focusField?: "customName" | "approvalDate" | "playerNumber" | "perks" | "debitPay" | "statementCloseDay" | "paymentDueDay" | "manualBalance" | "manualCreditLimit" | "payFrom" | "annualFee" | "notes" | "network";
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

function parseCurrency(value: string): number | null {
  if (!value.trim()) return null;
  const num = parseFloat(value.replace(/,/g, ""));
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

// ============================================================================
// Component
// ============================================================================

type TabId = "settings" | "billing" | "bonuses";

export function CardSettingsModal({
  isOpen,
  onClose,
  walletCard,
  linkedAccount,
  perksValue,
  debitPayPercent,
  debitPayEnabled,
  players,
  playerCount,
  bankAccounts = [],
  paymentSettings,
  onUpdateCustomName,
  onUpdateApprovalDate,
  onUpdatePlayerNumber,
  onUpdatePerks,
  onUpdateDebitPay,
  onUpdateStatementFields,
  onUpdatePaymentSettings,
  onUpdateAnnualFeeOverride,
  onUpdateNotes,
  onUpdateNetworkOverride,
  onRemove: _onRemove, // Keep for API compatibility but unused in UI
  onProductChange,
  onCloseCard,
  onViewPerks,
  categorySelectionCaps = [],
  categorySelections = [],
  onSelectCategory,
  currencies = [],
  welcomeBonuses = [],
  spendBonuses = [],
  onToggleWelcomeBonusActive,
  onToggleSpendBonusActive,
  onAddWelcomeBonus,
  onUpdateWelcomeBonus,
  onDeleteWelcomeBonus,
  onAddSpendBonus,
  onUpdateSpendBonus,
  onDeleteSpendBonus,
  biltSettings,
  onSaveBiltSettings,
  focusField,
}: CardSettingsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("settings");
  
  // Bonus form state
  const [showAddWelcomeBonus, setShowAddWelcomeBonus] = useState(false);
  const [showAddSpendBonus, setShowAddSpendBonus] = useState(false);
  const [editingWelcomeBonusId, setEditingWelcomeBonusId] = useState<string | null>(null);
  const [editingSpendBonusId, setEditingSpendBonusId] = useState<string | null>(null);
  
  // Bilt settings state
  const [biltOption, setBiltOption] = useState(biltSettings?.biltOption ?? 1);
  const [housingTier, setHousingTier] = useState(biltSettings?.housingTier ?? "1x");
  
  // Sync Bilt settings when switching between cards
  useEffect(() => {
    setBiltOption(biltSettings?.biltOption ?? 1);
    setHousingTier(biltSettings?.housingTier ?? "1x");
  }, [biltSettings?.biltOption, biltSettings?.housingTier]);
  
  // Refs for auto-focus
  const customNameRef = useRef<HTMLInputElement>(null);
  const approvalDateRef = useRef<HTMLInputElement>(null);
  const playerNumberRef = useRef<HTMLSelectElement>(null);
  const perksRef = useRef<HTMLInputElement>(null);
  const debitPayRef = useRef<HTMLInputElement>(null);
  const statementCloseDayRef = useRef<HTMLInputElement>(null);
  const paymentDueDayRef = useRef<HTMLInputElement>(null);
  const manualBalanceRef = useRef<HTMLInputElement>(null);
  const annualFeeRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const networkRef = useRef<HTMLSelectElement>(null);
  const manualCreditLimitRef = useRef<HTMLInputElement>(null);
  const payFromRef = useRef<HTMLSelectElement>(null);
  
  // Form state
  const [customName, setCustomName] = useState(walletCard.custom_name ?? "");
  const [approvalDate, setApprovalDate] = useState(walletCard.approval_date ?? "");
  const [playerNumber, setPlayerNumber] = useState(walletCard.player_number ?? 1);
  const [perks, setPerks] = useState(perksValue.toString());
  const [debitPay, setDebitPay] = useState(debitPayPercent.toString());
  const [statementCloseDay, setStatementCloseDay] = useState(walletCard.statement_close_day?.toString() ?? "");
  const [paymentDueDay, setPaymentDueDay] = useState(walletCard.payment_due_day?.toString() ?? "");
  const [manualBalance, setManualBalance] = useState(formatCurrency(walletCard.manual_balance_cents));
  const [manualCreditLimit, setManualCreditLimit] = useState(formatCurrency(walletCard.manual_credit_limit_cents));
  
  // Wallet enhancement fields
  const [annualFeeOverride, setAnnualFeeOverride] = useState(
    walletCard.annual_fee_override !== null && walletCard.annual_fee_override !== undefined
      ? walletCard.annual_fee_override.toString()
      : ""
  );
  const [notes, setNotes] = useState(walletCard.notes ?? "");
  const [networkOverride, setNetworkOverride] = useState<"visa" | "mastercard" | "amex" | "discover" | "">(
    walletCard.network_override ?? ""
  );
  
  // Payment settings state
  const [payFromAccountId, setPayFromAccountId] = useState<string | null>(paymentSettings?.pay_from_account_id ?? null);
  const [isAutopay, setIsAutopay] = useState(paymentSettings?.is_autopay ?? false);
  const [autopayType, setAutopayType] = useState<string | null>(paymentSettings?.autopay_type ?? null);

  // Focus on the specified field when modal opens
  useEffect(() => {
    if (!isOpen || !focusField) return;
    
    // Small delay to ensure the dialog has rendered
    const timer = setTimeout(() => {
      let element: HTMLInputElement | HTMLSelectElement | null = null;
      
      switch (focusField) {
        case "customName": element = customNameRef.current; break;
        case "approvalDate": element = approvalDateRef.current; break;
        case "playerNumber": element = playerNumberRef.current; break;
        case "perks": element = perksRef.current; break;
        case "debitPay": element = debitPayRef.current; break;
        case "statementCloseDay": element = statementCloseDayRef.current; break;
        case "paymentDueDay": element = paymentDueDayRef.current; break;
        case "manualBalance": element = manualBalanceRef.current; break;
        case "manualCreditLimit": element = manualCreditLimitRef.current; break;
        case "payFrom": element = payFromRef.current; break;
        case "annualFee": element = annualFeeRef.current; break;
        case "notes": element = notesRef.current; break;
        case "network": element = networkRef.current; break;
      }
      
      if (element) {
        element.focus();
        // For input elements, select all text
        if (element instanceof HTMLInputElement) {
          element.select();
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isOpen, focusField]);

  const card = walletCard.cards;
  if (!card) return null;

  const isChargeCard = card.card_charge_type === "charge";
  const hasPlaidData = linkedAccount !== null;

  // Billing cycle formula from issuer
  // For Chase, use different formula for business vs personal cards
  const baseBillingFormula = card.issuers?.billing_cycle_formula as BillingCycleFormula | null | undefined;
  const billingFormula = useMemo(() => {
    // For Chase: cobrand (airline/hotel) +3, personal UR +3, business UR +6
    if (baseBillingFormula === 'due_plus_3') {
      const currencyType = card.primary_currency?.currency_type;
      const isCobrand = currencyType === 'airline_miles' || currencyType === 'hotel_points';
      // Only use +6 for non-cobrand business cards (Chase Business UR)
      if (!isCobrand && card.product_type === 'business') {
        return 'due_plus_6' as BillingCycleFormula;
      }
    }
    // For BoA: business uses +27 with Fri/Sat adjustment, personal uses close-3
    if (baseBillingFormula === 'close_plus_27_skip_weekend') {
      if (card.product_type === 'personal') {
        return 'boa_personal_formula' as BillingCycleFormula;
      }
    }
    return baseBillingFormula ?? null;
  }, [baseBillingFormula, card.primary_currency?.currency_type, card.product_type]);
  
  const formulaInfo = getFormulaInfo(billingFormula);
  const primaryInput = formulaInfo?.primaryInput ?? 'due';
  const hasFormula = !!formulaInfo;
  
  // Calculate billing dates based on current inputs
  const billingDates = useMemo(() => {
    const closeDay = statementCloseDay ? parseInt(statementCloseDay) : null;
    const dueDay = paymentDueDay ? parseInt(paymentDueDay) : null;
    return calculateBillingDates(billingFormula, closeDay, dueDay);
  }, [billingFormula, statementCloseDay, paymentDueDay]);

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      // Save all fields
      const promises: Promise<void>[] = [];
      
      // Custom name
      const trimmedName = customName.trim() || null;
      if (trimmedName !== walletCard.custom_name) {
        promises.push(onUpdateCustomName(walletCard.id, trimmedName));
      }
      
      // Approval date
      const dateValue = approvalDate || null;
      if (dateValue !== walletCard.approval_date) {
        promises.push(onUpdateApprovalDate(walletCard.id, dateValue));
      }
      
      // Player number
      if (playerCount > 1 && playerNumber !== walletCard.player_number) {
        promises.push(onUpdatePlayerNumber(walletCard.id, playerNumber));
      }
      
      // Perks
      const perksNum = parseInt(perks) || 0;
      if (perksNum !== perksValue) {
        promises.push(onUpdatePerks(walletCard.id, perksNum));
      }
      
      // Debit pay
      if (debitPayEnabled) {
        const debitNum = parseFloat(debitPay) || 0;
        if (debitNum !== debitPayPercent) {
          promises.push(onUpdateDebitPay(walletCard.id, debitNum));
        }
      }
      
      // Statement fields (only if the update function is provided)
      if (onUpdateStatementFields) {
        const statementDay = statementCloseDay ? parseInt(statementCloseDay) : null;
        const dueDay = paymentDueDay ? parseInt(paymentDueDay) : null;
        const balanceCents = parseCurrency(manualBalance);
        const limitCents = parseCurrency(manualCreditLimit);
        
        const hasChanges = 
          statementDay !== walletCard.statement_close_day ||
          dueDay !== walletCard.payment_due_day ||
          balanceCents !== walletCard.manual_balance_cents ||
          limitCents !== walletCard.manual_credit_limit_cents;
        
        if (hasChanges) {
          promises.push(onUpdateStatementFields(walletCard.id, {
            statement_close_day: statementDay,
            payment_due_day: dueDay,
            manual_balance_cents: balanceCents,
            manual_credit_limit_cents: limitCents,
          }));
        }
      }
      
      // Annual fee override
      if (onUpdateAnnualFeeOverride) {
        const feeValue = annualFeeOverride ? parseInt(annualFeeOverride) : null;
        const currentFee = walletCard.annual_fee_override ?? null;
        if (feeValue !== currentFee) {
          promises.push(onUpdateAnnualFeeOverride(walletCard.id, feeValue));
        }
      }
      
      // Notes
      if (onUpdateNotes) {
        const notesValue = notes.trim() || null;
        const currentNotes = walletCard.notes ?? null;
        if (notesValue !== currentNotes) {
          promises.push(onUpdateNotes(walletCard.id, notesValue));
        }
      }
      
      // Network override
      if (onUpdateNetworkOverride) {
        const networkValue = networkOverride || null;
        const currentNetwork = walletCard.network_override ?? null;
        if (networkValue !== currentNetwork) {
          promises.push(onUpdateNetworkOverride(walletCard.id, networkValue as "visa" | "mastercard" | "amex" | "discover" | null));
        }
      }
      
      await Promise.all(promises);
      onClose();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            {walletCard.custom_name || card.name}
            {walletCard.custom_name && (
              <span className="ml-2 text-sm font-normal text-zinc-500">({card.name})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-700 mt-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "settings"
                ? "text-white"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Settings
            {activeTab === "settings" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "billing"
                ? "text-white"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Billing
            {activeTab === "billing" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("bonuses")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "bonuses"
                ? "text-white"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Bonuses
            {(welcomeBonuses.length > 0 || spendBonuses.length > 0 || categorySelectionCaps.length > 0 || biltSettings) && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-zinc-700 text-zinc-400">
                {welcomeBonuses.length + spendBonuses.length + (categorySelectionCaps.length > 0 ? 1 : 0) + (biltSettings ? 1 : 0)}
              </span>
            )}
            {activeTab === "bonuses" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        </div>

        <div className="space-y-5 mt-4">

          {/* ============== TAB 1: SETTINGS ============== */}
          {activeTab === "settings" && (
            <>
          {/* Basic Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300">Basic Settings</h3>
            
            {/* Custom Name + Approval Date - side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Custom Name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
                <input
                  ref={customNameRef}
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={card.name}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Approval Date */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Card Opened</label>
                <input
                  ref={approvalDateRef}
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Opened date is used for cardmember year credits and application rules
            </p>

            {/* Card Holder + Credit Line - side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Player Number (if multi-player) */}
              {playerCount > 1 ? (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Card Holder</label>
                  <select
                    ref={playerNumberRef}
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: playerCount }, (_, i) => i + 1).map(num => {
                      const player = players.find(p => p.player_number === num);
                      const label = player?.description || `P${num}`;
                      return (
                        <option key={num} value={num}>
                          P{num}: {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div /> // Empty placeholder to keep Credit Line on the right
              )}

              {/* Credit Line - always editable */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {isChargeCard ? "Spending Power" : "Credit Line"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    ref={manualCreditLimitRef}
                    type="text"
                    value={manualCreditLimit}
                    onChange={(e) => setManualCreditLimit(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Fee & Value</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Annual Fee (editable override) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Annual Fee
                  {annualFeeOverride !== "" && annualFeeOverride !== card.annual_fee.toString() && (
                    <span className="ml-1 text-zinc-500">(default: ${card.annual_fee})</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      ref={annualFeeRef}
                      type="number"
                      value={annualFeeOverride}
                      onChange={(e) => setAnnualFeeOverride(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={card.annual_fee.toString()}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                      min="0"
                    />
                  </div>
                  {annualFeeOverride !== "" && annualFeeOverride !== card.annual_fee.toString() && (
                    <button
                      type="button"
                      onClick={() => {
                        setAnnualFeeOverride("");
                      }}
                      className="px-2 text-xs text-zinc-400 hover:text-white transition-colors"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              {/* Net Fee (calculated, read-only) */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Net Fee</label>
                <div className={`w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-sm ${
                  (parseInt(annualFeeOverride) || card.annual_fee) - (parseInt(perks) || 0) < 0 ? "text-emerald-400" : "text-zinc-400"
                }`}>
                  ${(parseInt(annualFeeOverride) || card.annual_fee) - (parseInt(perks) || 0)}
                </div>
              </div>
            </div>

            {/* Perks Value + Debit Pay side by side */}
            <div className={`grid gap-3 ${debitPayEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
              {/* Perks Value */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Perks Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    ref={perksRef}
                    type="number"
                    value={perks}
                    onChange={(e) => setPerks(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Value from benefits.{" "}
                  {onViewPerks && (
                    <button
                      type="button"
                      onClick={onViewPerks}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      View Perks
                    </button>
                  )}
                </p>
              </div>

              {/* Debit Pay (if enabled) */}
              {debitPayEnabled && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Debit Pay Bonus</label>
                  <div className="relative">
                    <input
                      ref={debitPayRef}
                      type="number"
                      step="0.1"
                      value={debitPay}
                      onChange={(e) => setDebitPay(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-lg border border-pink-500/30 bg-zinc-800 px-3 py-2 pr-8 text-sm text-white focus:border-pink-500 focus:outline-none"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400/70">%</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Extra earning bonus</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Additional Settings</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                <input
                  ref={notesRef}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a note..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Network */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Network
                  {networkOverride !== "" && networkOverride !== (card.network ?? "") && (
                    <span className="ml-1 text-zinc-500">(default: {card.network ?? "Not set"})</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <select
                    ref={networkRef}
                    value={networkOverride}
                    onChange={(e) => setNetworkOverride(e.target.value as typeof networkOverride)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {!card.network && <option value="">Not specified</option>}
                    {card.network && <option value="">Default ({card.network})</option>}
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">Amex</option>
                    <option value="discover">Discover</option>
                  </select>
                  {networkOverride !== "" && networkOverride !== card.network && (
                    <button
                      type="button"
                      onClick={() => setNetworkOverride("")}
                      className="px-2 text-xs text-zinc-400 hover:text-white transition-colors"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          {/* ============== TAB 2: BILLING ============== */}
          {activeTab === "billing" && (
            <>
          {/* Statement Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Statement Dates</h3>
              {hasFormula && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  {card.issuers?.name} formula
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Statement Close Day */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Closes{hasFormula && primaryInput === 'close' && <span className="ml-1 text-blue-400">(primary)</span>}
                </label>
                <div className="relative">
                  <input
                    ref={statementCloseDayRef}
                    type="number"
                    value={statementCloseDay}
                    onChange={(e) => setStatementCloseDay(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasFormula && primaryInput === 'due' ? "Auto" : "Day"}
                    className={`w-full rounded-lg border bg-zinc-800 px-3 py-2 pr-16 text-sm text-white placeholder-zinc-500 focus:outline-none ${
                      hasFormula && primaryInput === 'close' 
                        ? "border-blue-500/50 focus:border-blue-500" 
                        : "border-zinc-700 focus:border-zinc-500"
                    }`}
                    min="1"
                    max="31"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">of month</span>
                </div>
              </div>
              
              {/* Payment Due Day */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Due{hasFormula && primaryInput === 'due' && <span className="ml-1 text-blue-400">(primary)</span>}
                </label>
                <div className="relative">
                  <input
                    ref={paymentDueDayRef}
                    type="number"
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasFormula && primaryInput === 'close' ? "Auto" : "Day"}
                    className={`w-full rounded-lg border bg-zinc-800 px-3 py-2 pr-16 text-sm text-white placeholder-zinc-500 focus:outline-none ${
                      hasFormula && primaryInput === 'due' 
                        ? "border-blue-500/50 focus:border-blue-500" 
                        : "border-zinc-700 focus:border-zinc-500"
                    }`}
                    min="1"
                    max="31"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">of month</span>
                </div>
              </div>
            </div>
            
            {/* Formula description and override warning */}
            <p className="text-xs text-zinc-500">
              {hasFormula ? (
                <>
                  {formulaInfo?.description}
                  {primaryInput === 'due' && !statementCloseDay && " Enter due day to auto-calculate close."}
                  {primaryInput === 'close' && !paymentDueDay && " Enter close day to auto-calculate due."}
                </>
              ) : (
                <>Enter both dates (no auto-calculation for {card.issuers?.name || "this issuer"}).</>
              )}
            </p>
            
            {/* Override warning - shows when user enters a value in the auto-calculated field */}
            {hasFormula && (
              (primaryInput === 'due' && statementCloseDay) || 
              (primaryInput === 'close' && paymentDueDay)
            ) && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1">
                <span>⚠</span>
                <span>Manual override — clearing this value will restore auto-calculation</span>
              </p>
            )}

            {/* Calculated Dates Display - more compact */}
            {(billingDates.lastCloseDate || billingDates.nextCloseDate || billingDates.nextDueDate) && (
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-zinc-800/50 text-center text-xs">
                <div>
                  <div className="text-zinc-500">Last Close</div>
                  <div className={billingDates.isAutoCalculated.close ? "text-zinc-400" : "text-white"}>
                    {billingDates.lastCloseDate ? formatBillingDate(billingDates.lastCloseDate) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Next Close</div>
                  <div className={billingDates.isAutoCalculated.close ? "text-zinc-400" : "text-white"}>
                    {billingDates.nextCloseDate ? formatBillingDate(billingDates.nextCloseDate) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Due Date</div>
                  <div className={billingDates.isAutoCalculated.due ? "text-zinc-400" : "text-white"}>
                    {billingDates.nextDueDate ? formatBillingDate(billingDates.nextDueDate) : "—"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Balance Info (Plaid-linked or manual entry) */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Balance</h3>
                {hasPlaidData && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Plaid Linked
                  </span>
                )}
              </div>
              
              {hasPlaidData ? (
                <>
                  <p className="text-xs text-zinc-500">
                    Balance synced from linked account.
                  </p>
                  {/* Show balance for Plaid-linked (values are in dollars) */}
                  <div className="flex gap-6 text-sm">
                    {linkedAccount.current_balance != null && (
                      <div>
                        <span className="text-zinc-500">Current Balance: </span>
                        <span className="text-zinc-300">${linkedAccount.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {linkedAccount.available_balance != null && (
                      <div>
                        <span className="text-zinc-500">Available: </span>
                        <span className="text-zinc-300">${linkedAccount.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Current Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      ref={manualBalanceRef}
                      type="text"
                      value={manualBalance}
                      onChange={(e) => setManualBalance(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Connect via Plaid in Settings for automatic sync
                  </p>
                </div>
              )}
            </div>

          {/* Payment Settings */}
          {bankAccounts.length > 0 && onUpdatePaymentSettings && (
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300">Payment Settings</h3>
              
              {/* Pay From Account */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Pay From Account</label>
                <select
                  ref={payFromRef}
                  value={payFromAccountId ?? ""}
                  onChange={(e) => {
                    const newValue = e.target.value || null;
                    setPayFromAccountId(newValue);
                    startTransition(() => {
                      onUpdatePaymentSettings(walletCard.id, {
                        pay_from_account_id: newValue,
                        is_autopay: isAutopay,
                        autopay_type: autopayType,
                      });
                    });
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Not set</option>
                  {bankAccounts.map((account) => {
                    // Format: "Bank Account (Last4)" e.g., "Mercury Personal Savings (7508)"
                    const accountName = account.display_name || account.name;
                    const parts = [];
                    if (account.institution_name) parts.push(account.institution_name);
                    parts.push(accountName);
                    let label = parts.join(' ');
                    if (account.mask) label += ` (${account.mask})`;
                    if (account.is_primary) label += " ★";
                    if (account.available_balance != null) label += ` - $${account.available_balance.toLocaleString()}`;
                    return (
                      <option key={account.id} value={account.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Auto-pay Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-zinc-400">Auto-pay</label>
                  <p className="text-xs text-zinc-500">Statement balance will be paid automatically on the due date</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !isAutopay;
                    setIsAutopay(newValue);
                    startTransition(() => {
                      onUpdatePaymentSettings(walletCard.id, {
                        pay_from_account_id: payFromAccountId,
                        is_autopay: newValue,
                        autopay_type: "statement_balance",
                      });
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    isAutopay ? "bg-blue-600" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAutopay ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
            </>
          )}

          {/* ============== TAB 3: BONUSES ============== */}
          {activeTab === "bonuses" && (
            <>
          {/* Category Selection (for cards with user-selectable categories) */}
          {categorySelectionCaps.length > 0 && onSelectCategory && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">Category Bonus</h3>
              {categorySelectionCaps
                .filter((cap) => cap.cap_type === "selected_category")
                .map((cap) => {
                  // Find the current selection for this cap (prefer wallet-specific)
                  const walletSelection = categorySelections.find(
                    s => s.cap_id === cap.id && s.wallet_card_id === walletCard.id
                  );
                  const legacySelection = categorySelections.find(
                    s => s.cap_id === cap.id && !s.wallet_card_id
                  );
                  const currentSelection = walletSelection || legacySelection;

                  return (
                    <div key={cap.id}>
                      <p className="text-xs text-zinc-400 mb-2">
                        Select one category for bonus rate
                        {cap.cap_amount && ` (up to $${cap.cap_amount.toLocaleString()}/yr)`}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cap.categories.map((cat) => {
                          const isSelected = currentSelection?.selected_category_id === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                startTransition(async () => {
                                  await onSelectCategory(cap.id, cat.id, walletCard.id);
                                });
                              }}
                              disabled={isPending}
                              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                              } disabled:opacity-50`}
                            >
                              {cat.name}
                              {isSelected && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                      {!currentSelection && (
                        <p className="text-xs text-amber-400 mt-2">
                          ⚠ Select a category to activate the bonus rate
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Bilt Housing Bonus Settings */}
          {biltSettings && onSaveBiltSettings && (
            <div className={`space-y-3 ${categorySelectionCaps.length > 0 ? "pt-4 border-t border-zinc-800" : ""}`}>
              <h3 className="text-sm font-medium text-zinc-300">Housing Bonus</h3>
              <p className="text-xs text-zinc-500">
                Your housing payments unlock bonus points on everyday spending.
              </p>

              {/* Option Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bilt-option"
                    value={1}
                    checked={biltOption === 1}
                    disabled={isPending}
                    onChange={() => {
                      setBiltOption(1);
                      startTransition(async () => {
                        await onSaveBiltSettings(1, housingTier, null);
                      });
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-xs text-zinc-300">Option 1: Tiered Housing Points</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bilt-option"
                    value={2}
                    checked={biltOption === 2}
                    disabled={isPending}
                    onChange={() => {
                      setBiltOption(2);
                      startTransition(async () => {
                        await onSaveBiltSettings(2, housingTier, null);
                      });
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-xs text-zinc-300">Option 2: Bilt Cash + Housing</span>
                </label>
              </div>

              {/* Option 1: Housing Tier Selection */}
              {biltOption === 1 && (
                <div className="space-y-2 pl-3 border-l-2 border-zinc-700">
                  <label className="block text-xs text-zinc-400">Housing Points Tier</label>
                  <select
                    value={housingTier}
                    disabled={isPending}
                    onChange={(e) => {
                      const newTier = e.target.value;
                      setHousingTier(newTier);
                      startTransition(async () => {
                        await onSaveBiltSettings(biltOption, newTier, null);
                      });
                    }}
                    className="w-full rounded border border-zinc-600 bg-zinc-700 px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="0.5x">0.5x (spend 25% of housing)</option>
                    <option value="0.75x">0.75x (spend 50% of housing)</option>
                    <option value="1x">1x (spend 75% of housing)</option>
                    <option value="1.25x">1.25x (spend 100% of housing)</option>
                  </select>
                  <p className="text-xs text-zinc-500">
                    Rate based on everyday spending relative to your housing payment.
                  </p>
                </div>
              )}

              {/* Option 2: Description only (cap is derived from housing spend) */}
              {biltOption === 2 && (
                <div className="space-y-2 pl-3 border-l-2 border-zinc-700">
                  <p className="text-xs text-zinc-500">
                    Earns 1.33x Housing Points on everyday spending, capped at 75% of your housing payments.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* User Bonuses (Welcome & Spend) */}
            <div className={`space-y-4 ${(categorySelectionCaps.length > 0 || biltSettings) ? "pt-4 border-t border-zinc-800" : ""}`}>
              {/* Welcome Bonuses Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-zinc-300">Welcome Bonuses</h4>
                  {onAddWelcomeBonus && (
                    <button
                      type="button"
                      onClick={() => setShowAddWelcomeBonus(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      + Add Welcome Bonus
                    </button>
                  )}
                </div>

                {/* Add Welcome Bonus Form */}
                {showAddWelcomeBonus && onAddWelcomeBonus && (
                  <WelcomeBonusForm
                    currencies={currencies}
                    onSubmit={async (formData) => {
                      await onAddWelcomeBonus(walletCard.id, formData);
                      setShowAddWelcomeBonus(false);
                    }}
                    onCancel={() => setShowAddWelcomeBonus(false)}
                    isPending={isPending}
                    startTransition={startTransition}
                  />
                )}

                {/* Welcome Bonuses List */}
                {welcomeBonuses.map((bonus) => {
                  let bonusText = "";
                  if (bonus.component_type === "points" && bonus.points_amount) {
                    bonusText = `${bonus.points_amount.toLocaleString()} ${bonus.currency_name ?? "points"}`;
                  } else if (bonus.component_type === "cash" && bonus.cash_amount_cents) {
                    bonusText = `$${(bonus.cash_amount_cents / 100).toLocaleString()}`;
                  } else if (bonus.component_type === "benefit" && bonus.benefit_description) {
                    bonusText = bonus.benefit_description;
                  }

                  // Edit form for this bonus
                  if (editingWelcomeBonusId === bonus.id && onUpdateWelcomeBonus) {
                    return (
                      <WelcomeBonusForm
                        key={bonus.id}
                        currencies={currencies}
                        initialValues={bonus}
                        onSubmit={async (formData) => {
                          await onUpdateWelcomeBonus(bonus.id, formData);
                          setEditingWelcomeBonusId(null);
                        }}
                        onCancel={() => setEditingWelcomeBonusId(null)}
                        isPending={isPending}
                        startTransition={startTransition}
                        isEdit
                      />
                    );
                  }
                  
                  return (
                    <div
                      key={bonus.id}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        bonus.is_active
                          ? "border-green-500/30 bg-green-500/10"
                          : "border-zinc-700 bg-zinc-800/50 opacity-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                            Welcome
                          </span>
                          <span className="text-sm text-white truncate">{bonusText}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Spend ${(bonus.spend_requirement_cents / 100).toLocaleString()} in {bonus.time_period_months} mo
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {onToggleWelcomeBonusActive && (
                          <button
                            type="button"
                            onClick={() => {
                              startTransition(async () => {
                                await onToggleWelcomeBonusActive(bonus.id, !bonus.is_active);
                              });
                            }}
                            disabled={isPending}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              bonus.is_active
                                ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                : "bg-green-600 text-white hover:bg-green-500"
                            } disabled:opacity-50`}
                          >
                            {bonus.is_active ? "Disable" : "Enable"}
                          </button>
                        )}
                        {onUpdateWelcomeBonus && (
                          <button
                            type="button"
                            onClick={() => setEditingWelcomeBonusId(bonus.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-300 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        {onDeleteWelcomeBonus && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this welcome bonus?")) {
                                startTransition(async () => {
                                  await onDeleteWelcomeBonus(bonus.id);
                                });
                              }
                            }}
                            disabled={isPending}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {welcomeBonuses.length === 0 && !showAddWelcomeBonus && (
                  <p className="text-xs text-zinc-500">No welcome bonuses yet.</p>
                )}
              </div>

              {/* Spend Bonuses Section */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-zinc-300">Spend Bonuses</h4>
                  {onAddSpendBonus && (
                    <button
                      type="button"
                      onClick={() => setShowAddSpendBonus(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      + Add Spend Bonus
                    </button>
                  )}
                </div>

                {/* Add Spend Bonus Form */}
                {showAddSpendBonus && onAddSpendBonus && (
                  <SpendBonusForm
                    currencies={currencies}
                    onSubmit={async (formData) => {
                      await onAddSpendBonus(walletCard.id, formData);
                      setShowAddSpendBonus(false);
                    }}
                    onCancel={() => setShowAddSpendBonus(false)}
                    isPending={isPending}
                    startTransition={startTransition}
                  />
                )}

                {/* Spend Bonuses List */}
                {spendBonuses.map((bonus) => {
                  let requirementText = "";
                  
                  if (bonus.bonus_type === "threshold" && bonus.spend_threshold_cents) {
                    requirementText = `After $${(bonus.spend_threshold_cents / 100).toLocaleString()} spent`;
                    if (bonus.period) {
                      requirementText += ` / ${bonus.period.replace("_", " ")}`;
                    }
                  } else if (bonus.bonus_type === "elite_earning" && bonus.per_spend_cents && bonus.elite_unit_name) {
                    requirementText = `Earn ${bonus.elite_unit_name} per $${(bonus.per_spend_cents / 100).toLocaleString()}`;
                  }

                  // Edit form for this bonus
                  if (editingSpendBonusId === bonus.id && onUpdateSpendBonus) {
                    return (
                      <SpendBonusForm
                        key={bonus.id}
                        currencies={currencies}
                        initialValues={bonus}
                        onSubmit={async (formData) => {
                          await onUpdateSpendBonus(bonus.id, formData);
                          setEditingSpendBonusId(null);
                        }}
                        onCancel={() => setEditingSpendBonusId(null)}
                        isPending={isPending}
                        startTransition={startTransition}
                        isEdit
                      />
                    );
                  }
                  
                  return (
                    <div
                      key={bonus.id}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        bonus.is_active
                          ? "border-purple-500/30 bg-purple-500/10"
                          : "border-zinc-700 bg-zinc-800/50 opacity-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                            {bonus.bonus_type === "threshold" ? "Threshold" : "Elite"}
                          </span>
                          <span className="text-sm text-white truncate">{bonus.name}</span>
                        </div>
                        {requirementText && (
                          <p className="text-xs text-zinc-400 mt-0.5">{requirementText}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {onToggleSpendBonusActive && (
                          <button
                            type="button"
                            onClick={() => {
                              startTransition(async () => {
                                await onToggleSpendBonusActive(bonus.id, !bonus.is_active);
                              });
                            }}
                            disabled={isPending}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              bonus.is_active
                                ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                : "bg-purple-600 text-white hover:bg-purple-500"
                            } disabled:opacity-50`}
                          >
                            {bonus.is_active ? "Disable" : "Enable"}
                          </button>
                        )}
                        {onUpdateSpendBonus && (
                          <button
                            type="button"
                            onClick={() => setEditingSpendBonusId(bonus.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-300 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        {onDeleteSpendBonus && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this spend bonus?")) {
                                startTransition(async () => {
                                  await onDeleteSpendBonus(bonus.id);
                                });
                              }
                            }}
                            disabled={isPending}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {spendBonuses.length === 0 && !showAddSpendBonus && (
                  <p className="text-xs text-zinc-500">No spend bonuses yet.</p>
                )}
              </div>
            </div>
            </>
          )}

          {/* Actions - all buttons equally spaced */}
          <div className="flex gap-2 pt-4 border-t border-zinc-800">
            {onProductChange && (
              <button
                onClick={onProductChange}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Product Change
              </button>
            )}
            {onCloseCard && (
              <button
                onClick={onCloseCard}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Close / Remove
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Welcome Bonus Form Component
// ============================================================================

interface WelcomeBonusFormProps {
  currencies: Currency[];
  initialValues?: {
    component_type: "points" | "cash" | "benefit";
    spend_requirement_cents: number;
    time_period_months: number;
    points_amount: number | null;
    cash_amount_cents: number | null;
    benefit_description: string | null;
    value_cents: number | null;
    currency_id?: string | null;
  };
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
  isEdit?: boolean;
}

function WelcomeBonusForm({
  currencies,
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  startTransition,
  isEdit = false,
}: WelcomeBonusFormProps) {
  const [componentType, setComponentType] = useState<"points" | "cash" | "benefit">(
    initialValues?.component_type ?? "points"
  );
  const [spendRequirement, setSpendRequirement] = useState(
    initialValues ? (initialValues.spend_requirement_cents / 100).toString() : ""
  );
  const [timePeriod, setTimePeriod] = useState(
    initialValues?.time_period_months?.toString() ?? "3"
  );
  const [pointsAmount, setPointsAmount] = useState(
    initialValues?.points_amount?.toString() ?? ""
  );
  const [currencyId, setCurrencyId] = useState(
    initialValues?.currency_id ?? currencies[0]?.id ?? ""
  );
  const [cashAmount, setCashAmount] = useState(
    initialValues?.cash_amount_cents ? (initialValues.cash_amount_cents / 100).toString() : ""
  );
  const [benefitDescription, setBenefitDescription] = useState(
    initialValues?.benefit_description ?? ""
  );
  const [benefitValue, setBenefitValue] = useState(
    initialValues?.value_cents ? (initialValues.value_cents / 100).toString() : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("component_type", componentType);
    formData.set("spend_requirement_cents", String(Math.round(parseFloat(spendRequirement || "0") * 100)));
    formData.set("time_period_months", timePeriod);
    
    if (componentType === "points") {
      formData.set("points_amount", pointsAmount);
      formData.set("currency_id", currencyId);
    } else if (componentType === "cash") {
      formData.set("cash_amount_cents", String(Math.round(parseFloat(cashAmount || "0") * 100)));
    } else {
      formData.set("benefit_description", benefitDescription);
      formData.set("value_cents", String(Math.round(parseFloat(benefitValue || "0") * 100)));
    }
    
    startTransition(async () => {
      await onSubmit(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Reward Type</label>
          <select
            value={componentType}
            onChange={(e) => setComponentType(e.target.value as typeof componentType)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
          >
            <option value="points">Points</option>
            <option value="cash">Cash</option>
            <option value="benefit">Benefit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Time Period</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Spend Requirement</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
            <input
              type="number"
              value={spendRequirement}
              onChange={(e) => setSpendRequirement(e.target.value)}
              placeholder="3000"
              className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
              required
            />
          </div>
        </div>
        
        {componentType === "points" && (
          <>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Points Amount</label>
              <input
                type="number"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="60000"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
          </>
        )}
        
        {componentType === "cash" && (
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cash Amount</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="200"
                className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
          </div>
        )}
        
        {componentType === "benefit" && (
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Your Value</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
              <input
                type="number"
                value={benefitValue}
                onChange={(e) => setBenefitValue(e.target.value)}
                placeholder="500"
                className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
          </div>
        )}
      </div>

      {componentType === "points" && currencies.length > 0 && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Currency</label>
          <select
            value={currencyId}
            onChange={(e) => setCurrencyId(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
          >
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
      )}

      {componentType === "benefit" && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Benefit Description</label>
          <input
            type="text"
            value={benefitDescription}
            onChange={(e) => setBenefitDescription(e.target.value)}
            placeholder="e.g., Free night certificate"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
            required
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Spend Bonus Form Component
// ============================================================================

interface SpendBonusFormProps {
  currencies: Currency[];
  initialValues?: {
    name: string;
    bonus_type: "threshold" | "elite_earning";
    spend_threshold_cents: number | null;
    reward_type: "points" | "cash" | "benefit" | null;
    points_amount: number | null;
    cash_amount_cents: number | null;
    benefit_description: string | null;
    value_cents: number | null;
    period: "year" | "calendar_year" | "lifetime" | null;
    per_spend_cents: number | null;
    elite_unit_name: string | null;
    unit_value_cents: number | null;
    currency_id?: string | null;
    cap_amount?: number | null;
    cap_period?: "year" | "calendar_year" | null;
  };
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
  isEdit?: boolean;
}

function SpendBonusForm({
  currencies,
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  startTransition,
  isEdit = false,
}: SpendBonusFormProps) {
  const [bonusType, setBonusType] = useState<"threshold" | "elite_earning">(
    initialValues?.bonus_type ?? "threshold"
  );
  const [bonusName, setBonusName] = useState(initialValues?.name ?? "");
  
  // Threshold fields
  const [thresholdAmount, setThresholdAmount] = useState(
    initialValues?.spend_threshold_cents ? (initialValues.spend_threshold_cents / 100).toString() : ""
  );
  const [rewardType, setRewardType] = useState<"points" | "cash" | "benefit">(
    initialValues?.reward_type ?? "points"
  );
  const [period, setPeriod] = useState<"year" | "calendar_year" | "lifetime">(
    initialValues?.period ?? "year"
  );
  const [pointsAmount, setPointsAmount] = useState(
    initialValues?.points_amount?.toString() ?? ""
  );
  const [currencyId, setCurrencyId] = useState(
    initialValues?.currency_id ?? currencies[0]?.id ?? ""
  );
  const [cashAmount, setCashAmount] = useState(
    initialValues?.cash_amount_cents ? (initialValues.cash_amount_cents / 100).toString() : ""
  );
  const [benefitDescription, setBenefitDescription] = useState(
    initialValues?.benefit_description ?? ""
  );
  const [benefitValue, setBenefitValue] = useState(
    initialValues?.value_cents ? (initialValues.value_cents / 100).toString() : ""
  );

  // Elite earning fields
  const [perSpendAmount, setPerSpendAmount] = useState(
    initialValues?.per_spend_cents ? (initialValues.per_spend_cents / 100).toString() : ""
  );
  const [eliteUnitName, setEliteUnitName] = useState(initialValues?.elite_unit_name ?? "");
  const [unitValue, setUnitValue] = useState(initialValues?.unit_value_cents?.toString() ?? "");
  const [capAmount, setCapAmount] = useState(initialValues?.cap_amount?.toString() ?? "");
  const [capPeriod, setCapPeriod] = useState<"year" | "calendar_year">(
    initialValues?.cap_period ?? "year"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", bonusName);
    formData.set("bonus_type", bonusType);
    
    if (bonusType === "threshold") {
      formData.set("spend_threshold_cents", String(Math.round(parseFloat(thresholdAmount || "0") * 100)));
      formData.set("reward_type", rewardType);
      formData.set("period", period);
      
      if (rewardType === "points") {
        formData.set("points_amount", pointsAmount);
        formData.set("currency_id", currencyId);
      } else if (rewardType === "cash") {
        formData.set("cash_amount_cents", String(Math.round(parseFloat(cashAmount || "0") * 100)));
      } else {
        formData.set("benefit_description", benefitDescription);
        formData.set("value_cents", String(Math.round(parseFloat(benefitValue || "0") * 100)));
      }
    } else {
      formData.set("per_spend_cents", String(Math.round(parseFloat(perSpendAmount || "0") * 100)));
      formData.set("elite_unit_name", eliteUnitName);
      formData.set("unit_value_cents", unitValue);
      if (capAmount) {
        formData.set("cap_amount", capAmount);
        formData.set("cap_period", capPeriod);
      }
    }
    
    startTransition(async () => {
      await onSubmit(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Bonus Name</label>
          <input
            type="text"
            value={bonusName}
            onChange={(e) => setBonusName(e.target.value)}
            placeholder="e.g., Annual $50k bonus"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Bonus Type</label>
          <select
            value={bonusType}
            onChange={(e) => setBonusType(e.target.value as typeof bonusType)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
          >
            <option value="threshold">Spend Threshold</option>
            <option value="elite_earning">Elite Earning</option>
          </select>
        </div>
      </div>

      {bonusType === "threshold" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Spend Threshold</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                <input
                  type="number"
                  value={thresholdAmount}
                  onChange={(e) => setThresholdAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as typeof period)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
              >
                <option value="year">Per Year</option>
                <option value="calendar_year">Per Calendar Year</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Reward Type</label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as typeof rewardType)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
              >
                <option value="points">Points</option>
                <option value="cash">Cash</option>
                <option value="benefit">Benefit</option>
              </select>
            </div>
            
            {rewardType === "points" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Points Amount</label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="10000"
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
                  required
                />
              </div>
            )}
            
            {rewardType === "cash" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cash Amount</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="100"
                    className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
                    required
                  />
                </div>
              </div>
            )}
            
            {rewardType === "benefit" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Your Value</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    value={benefitValue}
                    onChange={(e) => setBenefitValue(e.target.value)}
                    placeholder="200"
                    className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {rewardType === "points" && currencies.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Currency</label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          )}

          {rewardType === "benefit" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Benefit Description</label>
              <input
                type="text"
                value={benefitDescription}
                onChange={(e) => setBenefitDescription(e.target.value)}
                placeholder="e.g., Free night certificate"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
          )}
        </>
      )}

      {bonusType === "elite_earning" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Per Spend Amount</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                <input
                  type="number"
                  value={perSpendAmount}
                  onChange={(e) => setPerSpendAmount(e.target.value)}
                  placeholder="1"
                  className="w-full rounded border border-zinc-700 bg-zinc-800 pl-5 pr-2 py-1.5 text-xs text-white placeholder-zinc-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Elite Unit Name</label>
              <input
                type="text"
                value={eliteUnitName}
                onChange={(e) => setEliteUnitName(e.target.value)}
                placeholder="e.g., Elite Night"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unit Value (cents)</label>
              <input
                type="number"
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                placeholder="e.g., 50"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Cap Amount (optional)</label>
              <input
                type="number"
                value={capAmount}
                onChange={(e) => setCapAmount(e.target.value)}
                placeholder="e.g., 30"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500"
              />
            </div>
          </div>

          {capAmount && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Cap Period</label>
              <select
                value={capPeriod}
                onChange={(e) => setCapPeriod(e.target.value as typeof capPeriod)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
              >
                <option value="year">Per Year</option>
                <option value="calendar_year">Per Calendar Year</option>
              </select>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}

