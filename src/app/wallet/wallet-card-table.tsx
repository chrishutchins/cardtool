"use client";

import { useState, useMemo, useCallback } from "react";
import { DataTable, DataTableColumn, formatDate, Badge, Tooltip } from "@/components/data-table";
import { BonusCategoriesPopup, EarningRule, CategoryBonus } from "@/components/bonus-categories-popup";
import { CardSettingsModal, WalletCardForSettings, LinkedAccountInfo } from "./card-settings-modal";
import { ProductChangeModal, CardForProductChange, ClosedWalletCard } from "./product-change-modal";
import { CloseCardModal } from "./close-card-modal";
import { CreditsPopup, CardCredit, CardPreviewModal, CardPreviewData, CardEarningRule, CardCategoryBonus } from "@/components/card-preview-modal";
import { parseLocalDate } from "@/lib/utils";
import { calculateBillingDates, formatBillingDate, requiresCloseDay, type BillingCycleFormula, type BillingDates } from "@/lib/billing-cycle";
import { type StatementEstimate } from "@/lib/statement-calculator";

// ============================================================================
// Types
// ============================================================================

export interface WalletCardData {
  id: string;
  card_id: string;
  custom_name: string | null;
  added_at: string | null;
  approval_date: string | null;
  player_number: number | null;
  // Statement date fields
  statement_close_day?: number | null;
  payment_due_day?: number | null;
  manual_balance_cents?: number | null;
  manual_credit_limit_cents?: number | null;
  cards: {
    id: string;
    name: string;
    slug: string;
    annual_fee: number;
    default_earn_rate: number;
    primary_currency_id: string;
    secondary_currency_id: string | null;
    issuer_id: string;
    product_type?: "personal" | "business";
    card_charge_type?: "credit" | "charge" | null;
    issuers: { id: string; name: string; billing_cycle_formula?: string | null } | null;
    primary_currency: { id: string; name: string; code: string; currency_type: string } | null;
    secondary_currency: { id: string; name: string; code: string; currency_type: string } | null;
  } | null;
}

interface Player {
  player_number: number;
  description: string | null;
}

interface WalletCardTableProps {
  walletCards: WalletCardData[];
  enabledSecondaryCards: Map<string, boolean>; // keyed by wallet_card_id
  perksMap: Map<string, number>;
  debitPayMap: Map<string, number>;
  debitPayEnabled: boolean;
  accountLinkingEnabled: boolean;
  players: Player[];
  playerCount: number;
  earningRulesPerCard: Map<string, EarningRule[]>;
  categoryBonusesPerCard: Map<string, CategoryBonus[]>;
  creditsPerCard: Map<string, CardCredit[]>;
  linkedAccountsMap: Map<string, LinkedAccountInfo>;
  statementEstimatesMap?: Map<string, StatementEstimate>; // Optional for now
  // For product change modal
  allCardsForProductChange: CardForProductChange[];
  closedCardsForReactivation: ClosedWalletCard[];
  // Actions
  onRemove: (walletId: string) => Promise<void>;
  onUpdatePerks: (walletCardId: string, perksValue: number) => Promise<void>;
  onUpdateDebitPay: (walletCardId: string, percent: number) => Promise<void>;
  onUpdateCustomName: (walletId: string, customName: string | null) => Promise<void>;
  onUpdateApprovalDate: (walletId: string, date: string | null) => Promise<void>;
  onUpdatePlayerNumber: (walletId: string, playerNumber: number) => Promise<void>;
  onUpdateStatementFields?: (walletId: string, fields: {
    statement_close_day: number | null;
    payment_due_day: number | null;
    manual_balance_cents: number | null;
    manual_credit_limit_cents: number | null;
  }) => Promise<void>;
  onProductChange: (data: {
    currentWalletId: string;
    newCardId: string;
    effectiveDate: string;
    customName: string | null;
    reactivateWalletId: string | null;
  }) => Promise<void>;
  onCloseCard: (walletId: string, closedDate: string) => Promise<void>;
  onDeleteCard: (walletId: string) => Promise<void>;
}

// ============================================================================
// Style Guide - Clean & Consistent
// ============================================================================
// 
// STANDARD DATA (read-only):
// - text-zinc-400 : Normal text color for card data
// - text-zinc-600 : Empty/null/zero values (show "—")
//
// USER-EDITABLE DATA:
// - Dashed underline : Indicates user can edit (clicking opens settings)
// - text-zinc-300 : Slightly brighter to indicate editability
//
// LINKED DATA (Plaid):
// - text-zinc-400 italic : Synced from external source
//
// INTERACTIVE ELEMENTS (has popup on click):
// - text-emerald-400 : Has more details on click (no underline)
//
// NEGATIVE FORMAT: Always use -$X (not $-X)
// ============================================================================

// Shared style classes for consistency
const STYLES = {
  // User-editable fields - dashed underline, clickable
  // Uses text-zinc-400 to match read-only fields (like fee), underline indicates editability
  editable: "text-zinc-400 underline decoration-dashed underline-offset-4 decoration-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer",
  editableEmpty: "text-zinc-500 underline decoration-dashed underline-offset-4 decoration-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer",
  // Card name - special case, white text
  cardName: "text-white underline decoration-dashed underline-offset-4 decoration-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer font-medium",
  // Read-only data
  readOnly: "text-zinc-400",
  // Empty placeholder
  empty: "text-zinc-600",
  // Linked data (Plaid)
  linked: "text-zinc-400 italic",
  // Interactive popups (bonuses, credits)
  interactive: "text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer",
  // Debit pay (special pink color)
  debitPay: "text-pink-400 underline decoration-dashed underline-offset-4 decoration-zinc-500 hover:text-pink-300 transition-colors cursor-pointer",
  debitPayEmpty: "text-zinc-500 underline decoration-dashed underline-offset-4 decoration-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer",
} as const;

// Helper to format currency with consistent negative format
function formatCurrency(cents: number, showSign: "always" | "negative" | "never" = "never"): string {
  const dollars = Math.round(cents / 100);
  const absValue = Math.abs(dollars).toLocaleString();
  if (showSign === "always") {
    return dollars >= 0 ? `$${absValue}` : `-$${absValue}`;
  } else if (showSign === "negative") {
    return dollars < 0 ? `-$${absValue}` : `$${absValue}`;
  }
  return `$${absValue}`;
}

function formatDollars(dollars: number, showSign: "always" | "negative" | "never" = "never"): string {
  const absValue = Math.abs(dollars).toLocaleString();
  if (showSign === "always") {
    return dollars >= 0 ? `$${absValue}` : `-$${absValue}`;
  } else if (showSign === "negative") {
    return dollars < 0 ? `-$${absValue}` : `$${absValue}`;
  }
  return `$${absValue}`;
}

// ============================================================================
// Currency type styling
// ============================================================================

const currencyTypeConfig: Record<string, { label: string; className: string }> = {
  airline_miles: { label: "Airline Miles", className: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  hotel_points: { label: "Hotel Points", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  transferable_points: { label: "Transferable Points", className: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  non_transferable_points: { label: "Points", className: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  cash_back: { label: "Cash Back", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  crypto: { label: "Crypto", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  cash: { label: "Cash", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  miles: { label: "Miles", className: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  other: { label: "Other", className: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" },
};

// ============================================================================
// Component
// ============================================================================

export function WalletCardTable({
  walletCards,
  enabledSecondaryCards,
  perksMap,
  debitPayMap,
  debitPayEnabled,
  accountLinkingEnabled,
  players,
  playerCount,
  earningRulesPerCard,
  categoryBonusesPerCard,
  creditsPerCard,
  linkedAccountsMap,
  statementEstimatesMap = new Map(),
  allCardsForProductChange,
  closedCardsForReactivation,
  onRemove,
  onUpdatePerks,
  onUpdateDebitPay,
  onUpdateCustomName,
  onUpdateApprovalDate,
  onUpdatePlayerNumber,
  onUpdateStatementFields,
  onProductChange,
  onCloseCard,
  onDeleteCard,
}: WalletCardTableProps) {
  // Define row type for use in state (see rows computation below)
  type ProcessedRow = WalletCardData & {
    card: NonNullable<WalletCardData["cards"]>;
    activeCurrency: { id: string; name: string; code: string; currency_type: string } | null;
    perksValue: number;
    debitPayValue: number;
    netFee: number;
    displayName: string;
    playerNum: number;
    linkedAccount: LinkedAccountInfo | null;
    effectiveBalanceCents: number | null;
    effectiveCreditLimitCents: number | null;
    availableCreditCents: number | null;
    statementEstimate: StatementEstimate | null;
    credits: CardCredit[];
    creditsCount: number;
    earningRules: EarningRule[];
    categoryBonuses: CategoryBonus[];
    totalBonuses: number;
    hasSecondaryEnabled: boolean;
    upgradedByCardName: string | null;
    billingDates: BillingDates;
    billingFormula: string | null;
  };

  // Modal state
  const [settingsCard, setSettingsCard] = useState<ProcessedRow | null>(null);
  const [settingsFocusField, setSettingsFocusField] = useState<"customName" | "approvalDate" | "playerNumber" | "perks" | "debitPay" | "statementCloseDay" | "paymentDueDay" | "manualBalance" | "manualCreditLimit" | undefined>(undefined);
  const [creditsCard, setCreditsCard] = useState<{ name: string; credits: CardCredit[] } | null>(null);
  const [previewCard, setPreviewCard] = useState<CardPreviewData | null>(null);
  const [productChangeCard, setProductChangeCard] = useState<ProcessedRow | null>(null);
  const [closeCard, setCloseCard] = useState<ProcessedRow | null>(null);
  
  // Filter state
  const [productTypeFilter, setProductTypeFilter] = useState<"" | "personal" | "business">("");
  const [issuerFilter, setIssuerFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [playerFilter, setPlayerFilter] = useState<number | "">("");
  
  // Helper to open settings modal with focus on a specific field
  const openSettingsWithFocus = useCallback((row: ProcessedRow, field?: typeof settingsFocusField) => {
    setSettingsCard(row);
    setSettingsFocusField(field);
  }, []);

  // Build player description map
  const playerDescriptions = useMemo(() => {
    const map = new Map<number, string>();
    players.forEach(p => {
      map.set(p.player_number, p.description || `Player ${p.player_number}`);
    });
    return map;
  }, [players]);

  // Process wallet cards into rows with computed values
  const rows = useMemo(() => {
    return walletCards.filter(wc => wc.cards).map(wc => {
      const card = wc.cards!;
      const hasSecondaryEnabled = enabledSecondaryCards.get(wc.id) ?? false;
      const activeCurrency = hasSecondaryEnabled && card.secondary_currency
        ? card.secondary_currency
        : card.primary_currency;
      
      const perksValue = perksMap.get(wc.id) ?? 0;
      const debitPayValue = debitPayMap.get(wc.id) ?? 0;
      const netFee = card.annual_fee - perksValue;
      const displayName = wc.custom_name ?? card.name;
      const playerNum = Math.min(Math.max(1, wc.player_number ?? 1), playerCount);
      
      // Find which card upgrades this one (same player, has secondary currency as primary)
      let upgradedByCardName: string | null = null;
      if (hasSecondaryEnabled && card.secondary_currency_id) {
        const upgradingCard = walletCards.find(other => 
          other.cards?.primary_currency_id === card.secondary_currency_id &&
          (other.player_number ?? 1) === playerNum &&
          other.id !== wc.id
        );
        upgradedByCardName = upgradingCard?.custom_name ?? upgradingCard?.cards?.name ?? null;
      }
      
      // Get linked account info
      const linkedAccount = linkedAccountsMap.get(wc.id) ?? null;
      
      // Calculate effective balance and credit limit
      // Note: Plaid values are in DOLLARS, manual values are in CENTS
      // Convert everything to cents for consistency
      const effectiveBalanceCents = linkedAccount?.current_balance != null 
        ? Math.round(linkedAccount.current_balance * 100)  // Plaid: dollars -> cents
        : (wc.manual_balance_cents ?? null);               // Manual: already in cents
      
      // For credit limit: use manual override if set, otherwise use Plaid's value
      // Treat null or 0 from Plaid as "no limit" (common for charge cards like Amex Gold/Platinum)
      let effectiveCreditLimitCents: number | null = null;
      if (linkedAccount) {
        // Linked account: check manual override first, then Plaid value
        if (linkedAccount.manual_credit_limit != null && linkedAccount.manual_credit_limit > 0) {
          effectiveCreditLimitCents = Math.round(linkedAccount.manual_credit_limit * 100);
        } else if (linkedAccount.credit_limit != null && linkedAccount.credit_limit > 0) {
          effectiveCreditLimitCents = Math.round(linkedAccount.credit_limit * 100);
        }
        // If both are null/0, effectiveCreditLimitCents stays null
      } else {
        // No linked account: use manual wallet value
        effectiveCreditLimitCents = wc.manual_credit_limit_cents ?? null;
      }
      
      // Only calculate available credit if we have both a valid limit and balance
      const availableCreditCents = effectiveCreditLimitCents !== null && effectiveBalanceCents !== null
        ? effectiveCreditLimitCents - effectiveBalanceCents
        : null;
      
      // Get statement estimate if available
      const statementEstimate = statementEstimatesMap.get(wc.id) ?? null;
      
      // Get credits count
      const credits = creditsPerCard.get(card.id) ?? [];
      const creditsCount = credits.length;
      
      // Get bonuses count
      const earningRules = earningRulesPerCard.get(card.id) ?? [];
      const categoryBonuses = categoryBonusesPerCard.get(card.id) ?? [];
      const bonusRulesCount = earningRules.filter(r => r.rate > card.default_earn_rate).length;
      const totalBonuses = bonusRulesCount + categoryBonuses.length;
      
      // Calculate billing dates
      // For Chase: cobrand (airline/hotel) +3, personal UR +3, business UR +6
      let billingFormula = card.issuers?.billing_cycle_formula ?? null;
      if (billingFormula === 'due_plus_3') {
        const currencyType = card.primary_currency?.currency_type;
        const isCobrand = currencyType === 'airline_miles' || currencyType === 'hotel_points';
        // Only use +6 for non-cobrand business cards (Chase Business UR)
        if (!isCobrand && card.product_type === 'business') {
          billingFormula = 'due_plus_6';
        }
      }
      const billingDates = calculateBillingDates(
        billingFormula,
        wc.statement_close_day ?? null,
        wc.payment_due_day ?? null
      );

      return {
        ...wc,
        card,
        activeCurrency,
        perksValue,
        debitPayValue,
        netFee,
        displayName,
        playerNum,
        linkedAccount,
        effectiveBalanceCents,
        effectiveCreditLimitCents,
        availableCreditCents,
        statementEstimate,
        credits,
        creditsCount,
        earningRules,
        categoryBonuses,
        totalBonuses,
        hasSecondaryEnabled,
        upgradedByCardName,
        billingDates,
        billingFormula,
      };
    });
  }, [walletCards, enabledSecondaryCards, perksMap, debitPayMap, playerCount, linkedAccountsMap, statementEstimatesMap, creditsPerCard, earningRulesPerCard, categoryBonusesPerCard]);

  type RowType = typeof rows[number];

  // Get unique issuers for filter dropdown
  const uniqueIssuers = useMemo(() => {
    const issuers = new Set<string>();
    rows.forEach((r) => {
      if (r.card.issuers?.name) issuers.add(r.card.issuers.name);
    });
    return Array.from(issuers).sort();
  }, [rows]);

  // Get unique currencies for filter dropdown
  const uniqueCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    rows.forEach((r) => {
      if (r.activeCurrency?.name) currencies.add(r.activeCurrency.name);
    });
    return Array.from(currencies).sort();
  }, [rows]);

  // Apply filters to rows
  const filteredRows = useMemo(() => {
    let result = rows;
    
    if (productTypeFilter) {
      // Treat undefined/null product_type as "personal" to match display behavior
      result = result.filter((r) => (r.card.product_type ?? "personal") === productTypeFilter);
    }
    
    if (issuerFilter) {
      result = result.filter((r) => r.card.issuers?.name === issuerFilter);
    }
    
    if (currencyFilter) {
      result = result.filter((r) => r.activeCurrency?.name === currencyFilter);
    }
    
    if (playerFilter !== "") {
      result = result.filter((r) => r.playerNum === playerFilter);
    }
    
    return result;
  }, [rows, productTypeFilter, issuerFilter, currencyFilter, playerFilter]);

  // Check if any filters are active
  const hasActiveFilters = productTypeFilter || issuerFilter || currencyFilter || playerFilter !== "";

  // Filter controls component
  const filterControls = (
    <div className="flex items-center gap-2">
      <select
        value={productTypeFilter}
        onChange={(e) => setProductTypeFilter(e.target.value as "" | "personal" | "business")}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Types</option>
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </select>

      <select
        value={issuerFilter}
        onChange={(e) => setIssuerFilter(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Issuers</option>
        {uniqueIssuers.map((issuer) => (
          <option key={issuer} value={issuer}>{issuer}</option>
        ))}
      </select>

      <select
        value={currencyFilter}
        onChange={(e) => setCurrencyFilter(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Currencies</option>
        {uniqueCurrencies.map((currency) => (
          <option key={currency} value={currency}>{currency}</option>
        ))}
      </select>

      {playerCount > 1 && (
        <select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value === "" ? "" : parseInt(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Players</option>
          {Array.from({ length: playerCount }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>Player {num}</option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button
          onClick={() => {
            setProductTypeFilter("");
            setIssuerFilter("");
            setCurrencyFilter("");
            setPlayerFilter("");
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
        >
          Clear
        </button>
      )}
    </div>
  );

  // Define columns
  const columns: DataTableColumn<RowType>[] = useMemo(() => {
    const cols: DataTableColumn<RowType>[] = [
      // Card Name (sticky, with gear icon on left)
      {
        id: "name",
        label: "Card",
        sticky: true,
        minWidth: "220px",
        accessor: (row) => row.displayName,
        sortAccessor: (row) => row.displayName.toLowerCase(),
        render: (row) => (
          <div className="min-w-0">
            {/* Card name - clickable to edit (underlined to show editable) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openSettingsWithFocus(row, "customName");
              }}
              className={`${STYLES.cardName} text-left`}
              title="Click to edit card"
            >
              {row.displayName}
            </button>
          </div>
        ),
      },
      // Player (if multi-player, user-editable)
      ...(playerCount > 1 ? [{
        id: "player",
        label: "Player #",
        align: "center" as const,
        minWidth: "50px",
        accessor: (row: RowType) => row.playerNum,
        sortAccessor: (row: RowType) => row.playerNum,
        render: (row: RowType) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openSettingsWithFocus(row, "playerNumber");
            }}
            className={STYLES.editable}
            title={playerDescriptions.get(row.playerNum) ?? `Player ${row.playerNum}`}
          >
            P{row.playerNum}
          </button>
        ),
      }] : []),
      // Issuer
      {
        id: "issuer",
        label: "Issuer",
        accessor: (row) => row.card.issuers?.name ?? "",
        sortAccessor: (row) => row.card.issuers?.name?.toLowerCase() ?? "",
        render: (row) => (
          <span className="text-zinc-400">{row.card.issuers?.name}</span>
        ),
      },
      // Card Type (Personal/Business)
      {
        id: "type",
        label: "Card Type",
        headerLabel: "Type",
        hidden: true,
        accessor: (row) => row.card.product_type ?? "personal",
        sortAccessor: (row) => row.card.product_type ?? "personal",
        render: (row) => (
          <span className="text-zinc-400">
            {row.card.product_type === "business" ? "Biz" : "Personal"}
          </span>
        ),
      },
      // Limit Type (Credit/Charge)
      {
        id: "limit",
        label: "Limit Type",
        hidden: true,
        accessor: (row) => row.card.card_charge_type ?? "credit",
        sortAccessor: (row) => row.card.card_charge_type ?? "credit",
        render: (row) => (
          <span className="text-zinc-400">
            {row.card.card_charge_type === "charge" ? "Charge" : "Credit"}
          </span>
        ),
      },
      // Currency Type
      {
        id: "currency",
        label: "Currency",
        hidden: true,
        accessor: (row) => row.activeCurrency?.currency_type ?? "",
        render: (row) => {
          const config = currencyTypeConfig[row.activeCurrency?.currency_type ?? ""] ?? { label: "Other", className: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" };
          return (
            <Badge variant="default">
              <span className={config.className.split(" ").filter(c => c.startsWith("text-")).join(" ")}>
                {config.label}
              </span>
            </Badge>
          );
        },
      },
      // Earns (currency name with upgrade indicator - read-only)
      // Shows currency code in addition to name when currency name matches issuer name (e.g., "Chase" → "Chase (UR)")
      {
        id: "earns",
        label: "Earns",
        minWidth: "100px",
        accessor: (row) => row.activeCurrency?.name ?? "",
        sortAccessor: (row) => row.activeCurrency?.name?.toLowerCase() ?? "",
        render: (row) => {
          const currencyName = row.activeCurrency?.name ?? "Unknown";
          const currencyCode = row.activeCurrency?.code;
          const issuerName = row.card.issuers?.name;
          
          // Show code when currency name matches issuer name to distinguish them
          const needsCode = currencyName === issuerName && currencyCode;
          const displayName = needsCode ? `${currencyName} (${currencyCode})` : currencyName;
          
          if (row.hasSecondaryEnabled && row.upgradedByCardName) {
            return (
              <Tooltip wide text={`Having the ${row.upgradedByCardName} upgrades this card to earning ${displayName}`}>
                <span className="text-amber-400 cursor-help">
                  ↑ {displayName}
                </span>
              </Tooltip>
            );
          }
          return <span className="text-zinc-400">{displayName}</span>;
        },
      },
      // Bonuses
      {
        id: "bonuses",
        label: "Bonuses",
        align: "center" as const,
        minWidth: "70px",
        sortable: true,
        accessor: (row) => row.totalBonuses,
        sortAccessor: (row) => row.totalBonuses,
        render: (row) => (
          <BonusCategoriesPopup
            cardName={row.displayName}
            earningRules={row.earningRules}
            categoryBonuses={row.categoryBonuses}
            defaultEarnRate={row.card.default_earn_rate}
            currencyType={row.activeCurrency?.currency_type}
            currencyName={row.activeCurrency?.name}
          />
        ),
      },
      // Credits (clickable popup - no underline)
      {
        id: "credits",
        label: "Credits",
        align: "center" as const,
        minWidth: "70px",
        sortable: true,
        accessor: (row) => row.creditsCount,
        sortAccessor: (row) => row.creditsCount,
        render: (row) => (
          row.creditsCount > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreditsCard({ name: row.displayName, credits: row.credits });
              }}
              className={STYLES.interactive}
            >
              {row.creditsCount}
            </button>
          ) : (
            <span className={STYLES.empty}>—</span>
          )
        ),
      },
      // Annual Fee (read-only)
      {
        id: "annual_fee",
        label: "Fee",
        align: "right" as const,
        minWidth: "70px",
        accessor: (row) => row.card.annual_fee,
        sortAccessor: (row) => row.card.annual_fee,
        render: (row) => (
          <span className="text-zinc-400">{formatDollars(row.card.annual_fee)}</span>
        ),
      },
      // Perks Value (user-entered, dashed underline)
      {
        id: "perks",
        label: "Perks",
        align: "right" as const,
        minWidth: "70px",
        accessor: (row) => row.perksValue,
        sortAccessor: (row) => row.perksValue,
        render: (row) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openSettingsWithFocus(row, "perks");
            }}
            className={row.perksValue > 0 ? STYLES.editable : STYLES.editableEmpty}
            title="Click to edit perks value"
          >
            {row.perksValue > 0 ? `$${row.perksValue.toLocaleString()}` : "\u00A0\u00A0\u00A0\u00A0"}
          </button>
        ),
      },
      // Net Fee (calculated, read-only)
      {
        id: "net_fee",
        label: "Net Fee",
        align: "right" as const,
        minWidth: "70px",
        accessor: (row) => row.netFee,
        sortAccessor: (row) => row.netFee,
        render: (row) => (
          <span className={`font-medium ${row.netFee < 0 ? "text-emerald-400" : "text-zinc-400"}`}>
            {formatDollars(row.netFee, "negative")}
          </span>
        ),
      },
      // Debit Pay (if enabled, user-entered, pink for "secret feature")
      ...(debitPayEnabled ? [{
        id: "debit_pay",
        label: "Debit Pay",
        align: "right" as const,
        minWidth: "80px",
        accessor: (row: RowType) => row.debitPayValue,
        sortAccessor: (row: RowType) => row.debitPayValue,
        render: (row: RowType) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openSettingsWithFocus(row, "debitPay");
            }}
            className={row.debitPayValue > 0 ? STYLES.debitPay : STYLES.debitPayEmpty}
            title="Click to edit debit pay"
          >
            {row.debitPayValue > 0 ? `+${row.debitPayValue}%` : "\u00A0\u00A0\u00A0\u00A0"}
          </button>
        ),
      }] : []),
      // Statement Balance (calculated estimate from transactions)
      // DISABLED: Calculation needs verification before enabling
      // {
      //   id: "stmt_balance",
      //   label: "Statement Balance",
      //   headerLabel: "STMT BAL",
      //   align: "right" as const,
      //   minWidth: "90px",
      //   hidden: true,
      //   hideFromPicker: true,
      //   accessor: (row) => row.statementEstimate?.statementBalanceCents ?? null,
      //   sortAccessor: (row) => row.statementEstimate?.statementBalanceCents ?? 0,
      //   render: (row) => {
      //     if (!row.statementEstimate) {
      //       return <span className={STYLES.empty}>—</span>;
      //     }
      //     const cents = row.statementEstimate.statementBalanceCents;
      //     const formatted = formatCurrency(cents, "negative");
      //     return <span className={STYLES.linked}>{formatted}</span>;
      //   },
      // },
      // Balance (linked = grey italic with tooltip, manual = dashed underline)
      {
        id: "balance",
        label: "Balance",
        headerIcon: "link", // Show link icon in header for Plaid-synced column
        align: "right" as const,
        minWidth: "90px",
        hidden: true,
        hideFromPicker: !accountLinkingEnabled, // Only show in picker when Plaid is enabled
        accessor: (row) => row.effectiveBalanceCents,
        sortAccessor: (row) => row.effectiveBalanceCents ?? 0,
        render: (row) => {
          if (row.effectiveBalanceCents === null) {
            return <span className={STYLES.empty}>—</span>;
          }
          const isLinked = row.linkedAccount?.current_balance != null;
          const formatted = formatCurrency(row.effectiveBalanceCents, "negative");
          
          if (isLinked) {
            // Linked data - grey italic with sync time tooltip
            const lastSync = row.linkedAccount?.last_balance_update;
            const syncText = lastSync 
              ? `Last synced: ${new Date(lastSync).toLocaleDateString()} ${new Date(lastSync).toLocaleTimeString()}`
              : "Synced from linked account";
            return (
              <Tooltip text={syncText}>
                <span className={STYLES.linked}>{formatted}</span>
              </Tooltip>
            );
          }
          // Manual entry - dashed underline, clickable
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openSettingsWithFocus(row, "manualBalance");
              }}
              className={STYLES.editable}
              title="Click to edit balance"
            >
              {formatted}
            </button>
          );
        },
      },
      // Credit Limit (linked = grey italic, manual = dashed underline)
      {
        id: "credit_limit",
        label: "Credit Limit",
        headerLabel: "Limit",
        headerIcon: "link", // Show link icon in header for Plaid-synced column
        align: "right" as const,
        minWidth: "90px",
        hidden: true,
        hideFromPicker: !accountLinkingEnabled, // Only show in picker when Plaid is enabled
        accessor: (row) => row.effectiveCreditLimitCents,
        sortAccessor: (row) => row.effectiveCreditLimitCents ?? 0,
        render: (row) => {
          if (row.effectiveCreditLimitCents === null) {
            return <span className={STYLES.empty}>—</span>;
          }
          const isLinked = row.linkedAccount != null;
          const formatted = formatCurrency(row.effectiveCreditLimitCents);
          
          if (isLinked) {
            // Linked data - grey italic with sync time tooltip
            const lastSync = row.linkedAccount?.last_balance_update;
            const syncText = lastSync 
              ? `Last synced: ${new Date(lastSync).toLocaleDateString()} ${new Date(lastSync).toLocaleTimeString()}`
              : "Synced from linked account";
            return (
              <Tooltip text={syncText}>
                <span className={STYLES.linked}>{formatted}</span>
              </Tooltip>
            );
          }
          // Manual entry - dashed underline, clickable
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openSettingsWithFocus(row, "manualCreditLimit");
              }}
              className={STYLES.editable}
              title="Click to edit credit limit"
            >
              {formatted}
            </button>
          );
        },
      },
      // Available Credit (calculated from linked, grey italic)
      {
        id: "available_credit",
        label: "Available Credit",
        headerLabel: "Available",
        headerIcon: "link", // Show link icon in header for Plaid-synced column
        align: "right" as const,
        minWidth: "90px",
        hidden: true,
        hideFromPicker: !accountLinkingEnabled, // Only show in picker when Plaid is enabled
        accessor: (row) => row.availableCreditCents,
        sortAccessor: (row) => row.availableCreditCents ?? 0,
        render: (row) => {
          if (row.availableCreditCents === null) {
            return <span className={STYLES.empty}>—</span>;
          }
          const isLinked = row.linkedAccount != null;
          const isLow = row.effectiveCreditLimitCents !== null && row.availableCreditCents <= row.effectiveCreditLimitCents * 0.1;
          const isNegative = row.availableCreditCents < 0;
          const formatted = formatCurrency(row.availableCreditCents, "negative");
          
          // Warning states use red, otherwise grey
          const colorClass = isNegative || isLow ? "text-red-400" : "text-zinc-400";
          
          if (isLinked) {
            const lastSync = row.linkedAccount?.last_balance_update;
            const syncText = lastSync 
              ? `Last synced: ${new Date(lastSync).toLocaleDateString()} ${new Date(lastSync).toLocaleTimeString()}`
              : "Synced from linked account";
            return (
              <Tooltip text={syncText}>
                <span className={`${colorClass} italic`}>{formatted}</span>
              </Tooltip>
            );
          }
          return <span className={colorClass}>{formatted}</span>;
        },
      },
      // Last Statement Close
      {
        id: "last_close",
        label: "Last Statement Close",
        headerLabel: "← STMT CLOSE",
        align: "center" as const,
        minWidth: "90px",
        hidden: true,
        accessor: (row) => row.billingDates.lastCloseDate?.getTime() ?? null,
        sortAccessor: (row) => row.billingDates.lastCloseDate?.getTime() ?? 0,
        render: (row) => {
          const hasDate = row.billingDates.lastCloseDate !== null;
          const isAuto = row.billingDates.isAutoCalculated.close && !row.statement_close_day;
          const needsSetup = !hasDate && !row.statement_close_day && !row.payment_due_day;
          
          // Determine primary field based on formula - BoA uses close, most others use due
          const formula = row.cards?.issuers?.billing_cycle_formula ?? null;
          const primaryField = requiresCloseDay(formula) ? "statementCloseDay" : "paymentDueDay";
          
          // Dynamic tooltip based on formula type
          const isClosePrimary = requiresCloseDay(formula);
          const autoTooltip = isClosePrimary 
            ? "User-entered close day. Click to edit."
            : "Auto-calculated from due date. Click to override.";
          const manualTooltip = isClosePrimary
            ? "Click to set statement close day"
            : "Click to set payment due day";
          
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openSettingsWithFocus(row, primaryField);
              }}
              className={hasDate ? STYLES.editable : STYLES.editableEmpty}
              title={isAuto ? autoTooltip : manualTooltip}
            >
              {hasDate ? (
                <span className={isAuto ? "italic" : undefined}>
                  {formatBillingDate(row.billingDates.lastCloseDate)}
                </span>
              ) : needsSetup ? (
                <span>Set up</span>
              ) : (
                "\u00A0\u00A0\u00A0"
              )}
            </button>
          );
        },
      },
      // Next Statement Close
      {
        id: "next_close",
        label: "Next Statement Close",
        headerLabel: "→ STMT CLOSE",
        align: "center" as const,
        minWidth: "90px",
        hidden: true,
        accessor: (row) => row.billingDates.nextCloseDate?.getTime() ?? null,
        sortAccessor: (row) => row.billingDates.nextCloseDate?.getTime() ?? 0,
        render: (row) => {
          const hasDate = row.billingDates.nextCloseDate !== null;
          const isAuto = row.billingDates.isAutoCalculated.close && !row.statement_close_day;
          const needsSetup = !hasDate && !row.statement_close_day && !row.payment_due_day;
          
          // Determine primary field based on formula - BoA uses close, most others use due
          const formula = row.cards?.issuers?.billing_cycle_formula ?? null;
          const primaryField = requiresCloseDay(formula) ? "statementCloseDay" : "paymentDueDay";
          
          // Dynamic tooltip based on formula type
          const isClosePrimary = requiresCloseDay(formula);
          const autoTooltip = isClosePrimary 
            ? "User-entered close day. Click to edit."
            : "Auto-calculated from due date. Click to override.";
          const manualTooltip = isClosePrimary
            ? "Click to set statement close day"
            : "Click to set payment due day";
          
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openSettingsWithFocus(row, primaryField);
              }}
              className={hasDate ? STYLES.editable : STYLES.editableEmpty}
              title={isAuto ? autoTooltip : manualTooltip}
            >
              {hasDate ? (
                <span className={isAuto ? "italic" : undefined}>
                  {formatBillingDate(row.billingDates.nextCloseDate)}
                </span>
              ) : needsSetup ? (
                <span>Set up</span>
              ) : (
                "\u00A0\u00A0\u00A0"
              )}
            </button>
          );
        },
      },
      // Payment Due
      {
        id: "payment_due",
        label: "Payment Due",
        headerLabel: "PMT DUE",
        align: "center" as const,
        minWidth: "80px",
        hidden: true,
        accessor: (row) => row.billingDates.nextDueDate?.getTime() ?? null,
        sortAccessor: (row) => row.billingDates.nextDueDate?.getTime() ?? 0,
        render: (row) => {
          const hasDate = row.billingDates.nextDueDate !== null;
          const isAuto = row.billingDates.isAutoCalculated.due && !row.payment_due_day;
          const needsSetup = !hasDate && !row.statement_close_day && !row.payment_due_day;
          
          // Determine primary field based on formula - BoA uses close, most others use due
          const formula = row.cards?.issuers?.billing_cycle_formula ?? null;
          const primaryField = requiresCloseDay(formula) ? "statementCloseDay" : "paymentDueDay";
          
          // Dynamic tooltip based on formula type
          const isClosePrimary = requiresCloseDay(formula);
          const autoTooltip = isClosePrimary 
            ? "Auto-calculated from close date. Click to override."
            : "User-entered due day. Click to edit.";
          const manualTooltip = isClosePrimary
            ? "Click to set statement close day"
            : "Click to set payment due day";
          
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openSettingsWithFocus(row, primaryField);
              }}
              className={hasDate ? STYLES.editable : STYLES.editableEmpty}
              title={isAuto ? autoTooltip : manualTooltip}
            >
              {hasDate ? (
                <span className={isAuto ? "italic" : undefined}>
                  {formatBillingDate(row.billingDates.nextDueDate)}
                </span>
              ) : needsSetup ? (
                <span>Set up</span>
              ) : (
                "\u00A0\u00A0\u00A0"
              )}
            </button>
          );
        },
      },
      // Opened Date (user-entered, dashed underline)
      {
        id: "opened",
        label: "Date Opened",
        align: "center" as const,
        minWidth: "80px",
        accessor: (row) => row.approval_date,
        sortAccessor: (row) => row.approval_date ?? "",
        render: (row) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openSettingsWithFocus(row, "approvalDate");
            }}
            className={row.approval_date ? STYLES.editable : STYLES.editableEmpty}
            title="Click to edit opened date"
          >
            {row.approval_date 
              ? parseLocalDate(row.approval_date).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })
              : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"
            }
          </button>
        ),
      },
      // Settings button removed - gear icon is now in the Card column
    ];

    return cols;
  }, [playerCount, playerDescriptions, debitPayEnabled, accountLinkingEnabled]);

  // Default visible columns - show all except card_type, limit_type, currency, and Plaid columns
  const defaultVisibleColumns = useMemo(() => {
    const visible = [
      "name",
      "issuer",
      "earns",
      "bonuses",
      "credits",
      "annual_fee",
      "perks",
      "net_fee",
      "last_close",
      "next_close",
      "payment_due",
      "opened",
    ];
    if (playerCount > 1) visible.splice(1, 0, "player");
    if (debitPayEnabled) visible.push("debit_pay");
    return visible;
  }, [playerCount, debitPayEnabled]);

  // Search filter
  const searchFilter = useCallback((row: RowType, query: string) => {
    const q = query.toLowerCase();
    return (
      row.displayName.toLowerCase().includes(q) ||
      row.card.name.toLowerCase().includes(q) ||
      (row.card.issuers?.name?.toLowerCase().includes(q) ?? false)
    );
  }, []);

  return (
    <>
      <DataTable
        data={filteredRows}
        columns={columns}
        keyAccessor={(row) => row.id}
        searchPlaceholder="Search cards..."
        searchFilter={searchFilter}
        visibleColumnIds={defaultVisibleColumns}
        showColumnSelector={true}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyMessage="No cards match your filters"
        storageKey="wallet-cards"
        controls={filterControls}
      />

      {/* Card Settings Modal */}
      {settingsCard && (
        <CardSettingsModal
          isOpen={true}
          onClose={() => {
            setSettingsCard(null);
            setSettingsFocusField(undefined);
          }}
          focusField={settingsFocusField}
          walletCard={settingsCard as WalletCardForSettings}
          linkedAccount={settingsCard.linkedAccount}
          perksValue={settingsCard.perksValue}
          debitPayPercent={settingsCard.debitPayValue}
          debitPayEnabled={debitPayEnabled}
          players={players}
          playerCount={playerCount}
          onUpdateCustomName={onUpdateCustomName}
          onUpdateApprovalDate={onUpdateApprovalDate}
          onUpdatePlayerNumber={onUpdatePlayerNumber}
          onUpdatePerks={onUpdatePerks}
          onUpdateDebitPay={onUpdateDebitPay}
          onUpdateStatementFields={onUpdateStatementFields}
          onRemove={onRemove}
          onProductChange={() => {
            setProductChangeCard(settingsCard);
            setSettingsCard(null);
          }}
          onCloseCard={() => {
            setCloseCard(settingsCard);
            setSettingsCard(null);
          }}
          onViewPerks={() => {
            // Show card preview modal with perks/earnings data
            const card = settingsCard.card;
            setPreviewCard({
              card: {
                id: card.id,
                name: card.name,
                slug: card.slug,
                annual_fee: card.annual_fee,
                default_earn_rate: card.default_earn_rate,
                issuer_name: card.issuers?.name ?? null,
                card_charge_type: card.card_charge_type,
              },
              primaryCurrency: settingsCard.activeCurrency ? {
                id: settingsCard.activeCurrency.id,
                name: settingsCard.activeCurrency.name,
                code: settingsCard.activeCurrency.code,
                currency_type: settingsCard.activeCurrency.currency_type,
                base_value_cents: null,
              } : null,
              earningRules: settingsCard.earningRules.map(r => ({
                category_id: r.category_id,
                category_name: r.category_name,
                rate: r.rate,
                has_cap: r.has_cap,
                cap_amount: r.cap_amount,
                cap_period: r.cap_period,
                cap_unit: r.cap_unit,
                post_cap_rate: r.post_cap_rate,
                booking_method: r.booking_method,
                brand_name: r.brand_name,
              })),
              categoryBonuses: settingsCard.categoryBonuses.map(b => ({
                id: b.id,
                cap_type: b.cap_type,
                cap_amount: b.cap_amount,
                cap_period: b.cap_period,
                elevated_rate: b.elevated_rate,
                post_cap_rate: b.post_cap_rate,
                categories: b.category_ids.map((id, i) => ({ id, name: b.category_names[i] })),
              })),
              credits: settingsCard.credits,
              welcomeBonuses: [],
              isOwned: true,
            });
            // Don't close settings - user can close preview and return
          }}
        />
      )}

      {/* Product Change Modal */}
      {productChangeCard && (
        <ProductChangeModal
          isOpen={true}
          onClose={() => {
            // Go back to settings on cancel
            setSettingsCard(productChangeCard);
            setProductChangeCard(null);
          }}
          onSuccess={() => {
            // Product change completed - close all modals
            setProductChangeCard(null);
            setSettingsCard(null);
          }}
          currentCard={{
            id: productChangeCard.id,
            card_id: productChangeCard.card_id,
            custom_name: productChangeCard.custom_name,
            approval_date: productChangeCard.approval_date,
            player_number: productChangeCard.player_number,
            issuer_id: productChangeCard.card.issuer_id,
            card_name: productChangeCard.card.name,
          }}
          allCards={allCardsForProductChange}
          closedCards={closedCardsForReactivation}
          onProductChange={onProductChange}
        />
      )}

      {/* Close Card Modal */}
      {closeCard && (
        <CloseCardModal
          isOpen={true}
          onClose={() => {
            // Go back to settings on cancel
            setSettingsCard(closeCard);
            setCloseCard(null);
          }}
          onSuccess={() => {
            // Card was closed/deleted - close all modals
            setCloseCard(null);
            setSettingsCard(null);
          }}
          cardName={closeCard.card.name}
          customName={closeCard.custom_name}
          walletId={closeCard.id}
          hasLinkedAccount={closeCard.linkedAccount !== null}
          hasCreditHistory={closeCard.creditsCount > 0}
          onCloseCard={onCloseCard}
          onDeleteCard={onDeleteCard}
        />
      )}

      {/* Credits Popup */}
      {creditsCard && (
        <CreditsPopup
          isOpen={true}
          onClose={() => setCreditsCard(null)}
          cardName={creditsCard.name}
          credits={creditsCard.credits}
        />
      )}

      {/* Card Preview Modal */}
      {previewCard && (
        <CardPreviewModal
          isOpen={true}
          onClose={() => setPreviewCard(null)}
          data={previewCard}
        />
      )}
    </>
  );
}

