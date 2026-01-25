/**
 * Demo Account Clone API
 * 
 * Clones the admin account to the demo account with transformations:
 * - Player descriptions: Set to NULL
 * - Point balances: Remove Brex/United PerksPlus, scale high balances
 * - Account masks: NULL for credit cards and bank accounts
 * - Bank balances: NULL
 * - Wallet cards: Clear custom names, add numbered suffix for duplicates
 */

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
// Credit-transaction links are cloned directly, no rematch needed

// Configuration
const SOURCE_USER_ID = 'user_37o9nGH41MRtpG6ha598X6G4BuG'; // Admin account
const TARGET_USER_ID = 'user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0'; // Demo account

// Currencies to exclude from point balances
const EXCLUDED_CURRENCY_NAMES = ['Brex', 'United PerksPlus'];

// Balance scaling rules - always floor (no decimals)
function scaleBalance(balance: number): number {
  if (balance > 2_000_000) {
    return Math.floor(balance / 3);
  } else if (balance >= 1_000_000) {
    return Math.floor(balance / 2);
  } else if (balance >= 500_000) {
    return Math.floor(balance * 0.65); // Reduce by 35%
  }
  return Math.floor(balance);
}

// Transform inventory name - replace player initials
function transformInventoryName(name: string): string {
  return name.replace(/\(CH/g, '(P1').replace(/\(AF/g, '(P2');
}

export async function POST() {
  // Auth check
  const user = await currentUser();
  if (!user?.primaryEmailAddress?.emailAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.primaryEmailAddress.emailAddress)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const stats = {
    tablesWiped: 0,
    walletsCloned: 0,
    linkedAccountsCloned: 0,
    linkedAccountsWithWallet: 0,
    transactionsCloned: 0,
    creditUsagesCloned: 0,
    creditUsageTransactionLinksCloned: 0,
    pointBalancesCloned: 0,
    pointBalancesExcluded: 0,
    bankAccountsCloned: 0,
    creditReportSnapshotsCloned: 0,
    creditReportAccountsCloned: 0,
    creditReportWalletLinksCloned: 0,
    creditScoresCloned: 0,
    creditInquiriesCloned: 0,
    creditInquiryGroupsCloned: 0,
  };

  try {
    // ============================================================
    // STEP 1: Get excluded currency IDs
    // ============================================================
    const { data: excludedCurrencies } = await supabase
      .from("reward_currencies")
      .select("id, name")
      .in("name", EXCLUDED_CURRENCY_NAMES);
    
    const excludedCurrencyIds = new Set(excludedCurrencies?.map(c => c.id) ?? []);

    // ============================================================
    // STEP 2: Wipe all demo account data (reverse FK order)
    // ============================================================
    
    // Get demo wallet IDs for FK deletions
    const { data: demoWallets } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("user_id", TARGET_USER_ID);
    const demoWalletIds = demoWallets?.map(w => w.id) ?? [];

    // Get demo linked account IDs
    const { data: demoLinkedAccounts } = await supabase
      .from("user_linked_accounts")
      .select("id")
      .eq("user_id", TARGET_USER_ID);
    const demoLinkedAccountIds = demoLinkedAccounts?.map(la => la.id) ?? [];

    // Get demo credit usage IDs
    const { data: demoCreditUsages } = await supabase
      .from("user_credit_usage")
      .select("id")
      .in("user_wallet_id", demoWalletIds.length > 0 ? demoWalletIds : ['__none__']);
    const demoCreditUsageIds = demoCreditUsages?.map(cu => cu.id) ?? [];

    // Delete in reverse FK order
    const wipeOperations = [
      // Credit usage transaction links
      demoCreditUsageIds.length > 0 && supabase.from("user_credit_usage_transactions").delete().in("usage_id", demoCreditUsageIds),
      // Inventory (refs credit_usage, wallets)
      supabase.from("user_inventory").delete().eq("user_id", TARGET_USER_ID),
      // Credit usage (refs wallets)
      demoWalletIds.length > 0 && supabase.from("user_credit_usage").delete().in("user_wallet_id", demoWalletIds),
      // Transactions (refs linked_accounts)
      supabase.from("user_plaid_transactions").delete().eq("user_id", TARGET_USER_ID),
      // Linked accounts (refs plaid_items, wallets)
      supabase.from("user_linked_accounts").delete().eq("user_id", TARGET_USER_ID),
      // Plaid sync state (refs plaid_items)
      supabase.from("user_plaid_sync_state").delete().eq("user_id", TARGET_USER_ID),
      // Plaid items
      supabase.from("user_plaid_items").delete().eq("user_id", TARGET_USER_ID),
      // Bank accounts
      supabase.from("user_bank_accounts").delete().eq("user_id", TARGET_USER_ID),
      // Credit report tables (note: credit_inquiry_group_members doesn't have user_id, deleted via cascade from groups)
      supabase.from("credit_inquiry_groups").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("credit_account_wallet_links").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("credit_inquiries").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("credit_scores").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("credit_accounts").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("credit_report_snapshots").delete().eq("user_id", TARGET_USER_ID),
      // Wallet-dependent tables
      demoWalletIds.length > 0 && supabase.from("user_credit_settings").delete().in("user_wallet_id", demoWalletIds),
      supabase.from("user_card_perks_values").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_card_debit_pay").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_card_payment_settings").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_welcome_bonuses").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_welcome_bonus_settings").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_welcome_bonus_value_overrides").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_spend_bonuses").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_spend_bonus_values").delete().eq("user_id", TARGET_USER_ID),
      // Wallets
      supabase.from("user_wallets").delete().eq("user_id", TARGET_USER_ID),
      // Simple tables
      supabase.from("user_feature_flags").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_players").delete().eq("user_id", TARGET_USER_ID),
      // NOTE: user_category_spend is NOT wiped - demo account keeps its own spending settings
      supabase.from("user_currency_values").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_point_value_settings").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_card_selections").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_multiplier_tiers").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_travel_booking_preferences").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_mobile_pay_categories").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_paypal_categories").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_large_purchase_categories").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_bonus_display_settings").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_tracked_currencies").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_point_balances").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_point_balance_history").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_compare_categories").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_compare_evaluation_cards").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_hidden_items").delete().eq("user_id", TARGET_USER_ID),
      supabase.from("user_sync_tokens").delete().eq("user_id", TARGET_USER_ID),
    ].filter(Boolean);

    await Promise.all(wipeOperations);
    stats.tablesWiped = wipeOperations.length;

    // ============================================================
    // STEP 3: Clone simple tables
    // ============================================================

    // user_feature_flags
    const { data: sourceFeatureFlags } = await supabase
      .from("user_feature_flags")
      .select("*")
      .eq("user_id", SOURCE_USER_ID)
      .single();
    
    if (sourceFeatureFlags) {
      await supabase.from("user_feature_flags").insert({
        user_id: TARGET_USER_ID,
        debit_pay_enabled: sourceFeatureFlags.debit_pay_enabled,
        account_linking_enabled: sourceFeatureFlags.account_linking_enabled,
        credit_tracking_enabled: sourceFeatureFlags.credit_tracking_enabled,
        onboarding_completed: sourceFeatureFlags.onboarding_completed,
        plaid_liabilities_enabled: sourceFeatureFlags.plaid_liabilities_enabled,
        plaid_transactions_enabled: sourceFeatureFlags.plaid_transactions_enabled,
        plaid_on_demand_refresh_enabled: sourceFeatureFlags.plaid_on_demand_refresh_enabled,
        wholesale_club_networks: sourceFeatureFlags.wholesale_club_networks,
      });
    }

    // user_players - set description to NULL
    const { data: sourcePlayers } = await supabase
      .from("user_players")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourcePlayers && sourcePlayers.length > 0) {
      await supabase.from("user_players").insert(
        sourcePlayers.map(p => ({
          user_id: TARGET_USER_ID,
          player_number: p.player_number,
          description: null, // TRANSFORMATION: Clear descriptions
        }))
      );
    }

    // NOTE: user_category_spend is NOT cloned - demo account keeps its own spending settings

    // user_currency_values
    const { data: sourceCurrencyValues } = await supabase
      .from("user_currency_values")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceCurrencyValues && sourceCurrencyValues.length > 0) {
      await supabase.from("user_currency_values").insert(
        sourceCurrencyValues.map(cv => ({
          user_id: TARGET_USER_ID,
          currency_id: cv.currency_id,
          value_cents: cv.value_cents,
        }))
      );
    }

    // user_point_value_settings
    const { data: sourcePointSettings } = await supabase
      .from("user_point_value_settings")
      .select("*")
      .eq("user_id", SOURCE_USER_ID)
      .single();
    
    if (sourcePointSettings) {
      await supabase.from("user_point_value_settings").insert({
        user_id: TARGET_USER_ID,
        selected_template_id: sourcePointSettings.selected_template_id,
      });
    }

    // user_card_selections
    const { data: sourceSelections } = await supabase
      .from("user_card_selections")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceSelections && sourceSelections.length > 0) {
      await supabase.from("user_card_selections").insert(
        sourceSelections.map(s => ({
          user_id: TARGET_USER_ID,
          cap_id: s.cap_id,
          selected_category_id: s.selected_category_id,
        }))
      );
    }

    // user_multiplier_tiers
    const { data: sourceTiers } = await supabase
      .from("user_multiplier_tiers")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceTiers && sourceTiers.length > 0) {
      await supabase.from("user_multiplier_tiers").insert(
        sourceTiers.map(t => ({
          user_id: TARGET_USER_ID,
          program_id: t.program_id,
          tier_id: t.tier_id,
        }))
      );
    }

    // user_travel_booking_preferences
    const { data: sourceTravelPrefs } = await supabase
      .from("user_travel_booking_preferences")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceTravelPrefs && sourceTravelPrefs.length > 0) {
      await supabase.from("user_travel_booking_preferences").insert(
        sourceTravelPrefs.map(p => ({
          user_id: TARGET_USER_ID,
          category_slug: p.category_slug,
          preference_type: p.preference_type,
          brand_name: p.brand_name,
          portal_issuer_id: p.portal_issuer_id,
        }))
      );
    }

    // user_mobile_pay_categories
    const { data: sourceMobilePay } = await supabase
      .from("user_mobile_pay_categories")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceMobilePay && sourceMobilePay.length > 0) {
      await supabase.from("user_mobile_pay_categories").insert(
        sourceMobilePay.map(m => ({
          user_id: TARGET_USER_ID,
          category_id: m.category_id,
        }))
      );
    }

    // user_paypal_categories
    const { data: sourcePaypal } = await supabase
      .from("user_paypal_categories")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourcePaypal && sourcePaypal.length > 0) {
      await supabase.from("user_paypal_categories").insert(
        sourcePaypal.map(p => ({
          user_id: TARGET_USER_ID,
          category_id: p.category_id,
        }))
      );
    }

    // user_large_purchase_categories
    const { data: sourceLargePurchase } = await supabase
      .from("user_large_purchase_categories")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceLargePurchase && sourceLargePurchase.length > 0) {
      await supabase.from("user_large_purchase_categories").insert(
        sourceLargePurchase.map(lp => ({
          user_id: TARGET_USER_ID,
          category_id: lp.category_id,
        }))
      );
    }

    // user_bonus_display_settings
    const { data: sourceBonusSettings } = await supabase
      .from("user_bonus_display_settings")
      .select("*")
      .eq("user_id", SOURCE_USER_ID)
      .single();
    
    if (sourceBonusSettings) {
      await supabase.from("user_bonus_display_settings").insert({
        user_id: TARGET_USER_ID,
        include_welcome_bonuses: sourceBonusSettings.include_welcome_bonuses,
        include_spend_bonuses: sourceBonusSettings.include_spend_bonuses,
        include_debit_pay: sourceBonusSettings.include_debit_pay,
        show_available_credit: sourceBonusSettings.show_available_credit,
      });
    }

    // user_tracked_currencies
    const { data: sourceTracked } = await supabase
      .from("user_tracked_currencies")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceTracked && sourceTracked.length > 0) {
      await supabase.from("user_tracked_currencies").insert(
        sourceTracked.map(t => ({
          user_id: TARGET_USER_ID,
          currency_id: t.currency_id,
          is_archived: t.is_archived,
        }))
      );
    }

    // user_point_balances - with filtering and scaling
    const { data: sourceBalances } = await supabase
      .from("user_point_balances")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceBalances && sourceBalances.length > 0) {
      const filteredBalances = sourceBalances.filter(b => !excludedCurrencyIds.has(b.currency_id));
      stats.pointBalancesExcluded = sourceBalances.length - filteredBalances.length;
      
      if (filteredBalances.length > 0) {
        await supabase.from("user_point_balances").insert(
          filteredBalances.map(b => ({
            user_id: TARGET_USER_ID,
            currency_id: b.currency_id,
            player_number: b.player_number,
            balance: scaleBalance(b.balance), // TRANSFORMATION: Scale balances
            expiration_date: b.expiration_date,
            notes: b.notes,
            last_update_source: b.last_update_source,
          }))
        );
        stats.pointBalancesCloned = filteredBalances.length;
      }
    }

    // user_compare_categories
    const { data: sourceCompareCategories } = await supabase
      .from("user_compare_categories")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceCompareCategories && sourceCompareCategories.length > 0) {
      await supabase.from("user_compare_categories").insert(
        sourceCompareCategories.map(c => ({
          user_id: TARGET_USER_ID,
          category_id: c.category_id,
        }))
      );
    }

    // user_compare_evaluation_cards
    const { data: sourceCompareCards } = await supabase
      .from("user_compare_evaluation_cards")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceCompareCards && sourceCompareCards.length > 0) {
      await supabase.from("user_compare_evaluation_cards").insert(
        sourceCompareCards.map(c => ({
          user_id: TARGET_USER_ID,
          card_id: c.card_id,
        }))
      );
    }

    // user_hidden_items
    const { data: sourceHidden } = await supabase
      .from("user_hidden_items")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceHidden && sourceHidden.length > 0) {
      await supabase.from("user_hidden_items").insert(
        sourceHidden.map(h => ({
          user_id: TARGET_USER_ID,
          item_type: h.item_type,
          item_key: h.item_key,
        }))
      );
    }

    // ============================================================
    // STEP 4: Clone user_wallets with custom_name transformation
    // ============================================================

    const { data: sourceWallets } = await supabase
      .from("user_wallets")
      .select("*, cards:card_id (name)")
      .eq("user_id", SOURCE_USER_ID)
      .order("added_at", { ascending: true });

    if (!sourceWallets || sourceWallets.length === 0) {
      return NextResponse.json({ success: true, stats, message: "No wallets to clone" });
    }

    // Build wallet ID mapping and handle duplicate card naming
    const walletMapping = new Map<string, string>(); // old_id -> new_id
    const cardIdCounts = new Map<string, number>(); // card_id -> count
    const cardIdCounters = new Map<string, number>(); // card_id -> next number (starting at 1000)

    // First pass: count duplicates
    for (const wallet of sourceWallets) {
      cardIdCounts.set(wallet.card_id, (cardIdCounts.get(wallet.card_id) ?? 0) + 1);
    }

    // Prepare wallet inserts with transformations
    const walletInserts = sourceWallets.map(wallet => {
      const newId = crypto.randomUUID();
      walletMapping.set(wallet.id, newId);

      // Determine custom_name
      let customName: string | null = null;
      const count = cardIdCounts.get(wallet.card_id) ?? 1;
      
      if (count > 1) {
        // Multiple cards of same type - append number
        const cardName = (wallet.cards as { name: string } | null)?.name ?? "Card";
        const counter = cardIdCounters.get(wallet.card_id) ?? 1000;
        cardIdCounters.set(wallet.card_id, counter + 1);
        customName = `${cardName} ${counter}`;
      }
      // If only one card of this type, leave custom_name as null

      return {
        id: newId,
        user_id: TARGET_USER_ID,
        card_id: wallet.card_id,
        custom_name: customName, // TRANSFORMATION: Clear or add numbered suffix
        added_at: wallet.added_at,
        approval_date: wallet.approval_date,
        player_number: wallet.player_number,
        closed_date: wallet.closed_date,
        closed_reason: wallet.closed_reason,
        product_changed_to_id: null, // Will update in second pass
        statement_close_day: wallet.statement_close_day,
        payment_due_day: wallet.payment_due_day,
        manual_balance_cents: wallet.manual_balance_cents,
        manual_credit_limit_cents: wallet.manual_credit_limit_cents,
        annual_fee_override: wallet.annual_fee_override,
        network_override: wallet.network_override,
        notes: wallet.notes,
      };
    });

    // Insert wallets
    await supabase.from("user_wallets").insert(walletInserts);
    stats.walletsCloned = walletInserts.length;

    // Update product_changed_to_id references
    for (const wallet of sourceWallets) {
      if (wallet.product_changed_to_id) {
        const newId = walletMapping.get(wallet.id);
        const newProductChangedToId = walletMapping.get(wallet.product_changed_to_id);
        if (newId && newProductChangedToId) {
          await supabase
            .from("user_wallets")
            .update({ product_changed_to_id: newProductChangedToId })
            .eq("id", newId);
        }
      }
    }

    // ============================================================
    // STEP 5: Clone wallet-dependent tables
    // ============================================================

    // user_card_perks_values
    const { data: sourcePerks } = await supabase
      .from("user_card_perks_values")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourcePerks && sourcePerks.length > 0) {
      const perksInserts = sourcePerks
        .filter(p => walletMapping.has(p.wallet_card_id))
        .map(p => ({
          user_id: TARGET_USER_ID,
          wallet_card_id: walletMapping.get(p.wallet_card_id)!,
          perks_value: p.perks_value,
        }));
      
      if (perksInserts.length > 0) {
        await supabase.from("user_card_perks_values").insert(perksInserts);
      }
    }

    // user_card_debit_pay
    const { data: sourceDebitPay } = await supabase
      .from("user_card_debit_pay")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceDebitPay && sourceDebitPay.length > 0) {
      const debitPayInserts = sourceDebitPay
        .filter(d => walletMapping.has(d.wallet_card_id))
        .map(d => ({
          user_id: TARGET_USER_ID,
          wallet_card_id: walletMapping.get(d.wallet_card_id)!,
          debit_pay_percent: d.debit_pay_percent,
        }));
      
      if (debitPayInserts.length > 0) {
        await supabase.from("user_card_debit_pay").insert(debitPayInserts);
      }
    }

    // user_credit_settings
    const { data: sourceCreditSettings } = await supabase
      .from("user_credit_settings")
      .select("*")
      .in("user_wallet_id", Array.from(walletMapping.keys()));
    
    if (sourceCreditSettings && sourceCreditSettings.length > 0) {
      const creditSettingsInserts = sourceCreditSettings
        .filter(cs => walletMapping.has(cs.user_wallet_id))
        .map(cs => ({
          user_wallet_id: walletMapping.get(cs.user_wallet_id)!,
          credit_id: cs.credit_id,
          is_hidden: cs.is_hidden,
          is_auto_repeat: cs.is_auto_repeat,
          user_value_override_cents: cs.user_value_override_cents,
          notes: cs.notes,
        }));
      
      if (creditSettingsInserts.length > 0) {
        await supabase.from("user_credit_settings").insert(creditSettingsInserts);
      }
    }

    // user_welcome_bonuses
    const { data: sourceWelcomeBonuses } = await supabase
      .from("user_welcome_bonuses")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceWelcomeBonuses && sourceWelcomeBonuses.length > 0) {
      const wbInserts = sourceWelcomeBonuses
        .filter(wb => walletMapping.has(wb.wallet_card_id))
        .map(wb => ({
          user_id: TARGET_USER_ID,
          wallet_card_id: walletMapping.get(wb.wallet_card_id)!,
          is_active: wb.is_active,
          component_type: wb.component_type,
          spend_requirement_cents: wb.spend_requirement_cents,
          time_period_months: wb.time_period_months,
          points_amount: wb.points_amount,
          currency_id: wb.currency_id,
          cash_amount_cents: wb.cash_amount_cents,
          benefit_description: wb.benefit_description,
          value_cents: wb.value_cents,
        }));
      
      if (wbInserts.length > 0) {
        await supabase.from("user_welcome_bonuses").insert(wbInserts);
      }
    }

    // user_spend_bonuses
    const { data: sourceSpendBonuses } = await supabase
      .from("user_spend_bonuses")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);
    
    if (sourceSpendBonuses && sourceSpendBonuses.length > 0) {
      const sbInserts = sourceSpendBonuses
        .filter(sb => walletMapping.has(sb.wallet_card_id))
        .map(sb => ({
          user_id: TARGET_USER_ID,
          wallet_card_id: walletMapping.get(sb.wallet_card_id)!,
          is_active: sb.is_active,
          name: sb.name,
          bonus_type: sb.bonus_type,
          spend_threshold_cents: sb.spend_threshold_cents,
          reward_type: sb.reward_type,
          points_amount: sb.points_amount,
          currency_id: sb.currency_id,
          cash_amount_cents: sb.cash_amount_cents,
          benefit_description: sb.benefit_description,
          value_cents: sb.value_cents,
          period: sb.period,
          per_spend_cents: sb.per_spend_cents,
          elite_unit_name: sb.elite_unit_name,
          unit_value_cents: sb.unit_value_cents,
          cap_amount: sb.cap_amount,
          cap_period: sb.cap_period,
        }));
      
      if (sbInserts.length > 0) {
        await supabase.from("user_spend_bonuses").insert(sbInserts);
      }
    }

    // ============================================================
    // STEP 6: Create placeholder Plaid item and clone linked accounts
    // ============================================================

    // Create placeholder Plaid item
    const plaidItemId = crypto.randomUUID();
    await supabase.from("user_plaid_items").insert({
      id: plaidItemId,
      user_id: TARGET_USER_ID,
      item_id: 'demo_placeholder_item',
      access_token: 'DEMO_INVALID_TOKEN_DO_NOT_SYNC',
      institution_name: 'Demo Accounts (Read-Only)',
    });

    // Clone linked accounts
    const { data: sourceLinkedAccounts } = await supabase
      .from("user_linked_accounts")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    const linkedAccountMapping = new Map<string, string>();

    if (sourceLinkedAccounts && sourceLinkedAccounts.length > 0) {
      const linkedAccountInserts = sourceLinkedAccounts.map(la => {
        const newId = crypto.randomUUID();
        linkedAccountMapping.set(la.id, newId);
        
        return {
          id: newId,
          user_id: TARGET_USER_ID,
          plaid_item_id: plaidItemId,
          plaid_account_id: la.plaid_account_id + '_demo',
          name: la.name,
          official_name: la.official_name,
          type: la.type,
          subtype: la.subtype,
          mask: null, // TRANSFORMATION: Hide account mask
          current_balance: la.current_balance,
          available_balance: la.available_balance,
          credit_limit: la.credit_limit,
          manual_credit_limit: la.manual_credit_limit,
          iso_currency_code: la.iso_currency_code,
          last_balance_update: la.last_balance_update,
          wallet_card_id: la.wallet_card_id ? (walletMapping.get(la.wallet_card_id) ?? null) : null,
          last_statement_balance: la.last_statement_balance,
          last_statement_date: la.last_statement_date,
          last_statement_issue_date: la.last_statement_issue_date,
          next_payment_due_date: la.next_payment_due_date,
          minimum_payment_amount: la.minimum_payment_amount,
          is_overdue: la.is_overdue,
          last_payment_amount: la.last_payment_amount,
          last_payment_date: la.last_payment_date,
          liabilities_updated_at: la.liabilities_updated_at,
        };
      });

      await supabase.from("user_linked_accounts").insert(linkedAccountInserts);
      stats.linkedAccountsCloned = linkedAccountInserts.length;
      stats.linkedAccountsWithWallet = linkedAccountInserts.filter(la => la.wallet_card_id !== null).length;
    }

    // ============================================================
    // STEP 7: Clone ONLY transactions linked to credits (not ALL transactions)
    // ============================================================

    // First, get the credit_usage_transactions to find which transaction IDs are linked to credits
    const { data: sourceCutForTxns } = await supabase
      .from("user_credit_usage_transactions")
      .select("transaction_id, usage_id, user_credit_usage!inner(user_wallet_id)")
      .in("user_credit_usage.user_wallet_id", Array.from(walletMapping.keys()));
    
    // Get unique transaction IDs that are linked to credits
    const creditLinkedTxnIds = new Set<string>();
    if (sourceCutForTxns) {
      sourceCutForTxns.forEach(cut => {
        if (cut.transaction_id) creditLinkedTxnIds.add(cut.transaction_id);
      });
    }

    const transactionMapping = new Map<string, string>();

    if (creditLinkedTxnIds.size > 0) {
      // Fetch only the transactions that are linked to credits
      const { data: sourceTransactions } = await supabase
        .from("user_plaid_transactions")
        .select("*")
        .in("id", Array.from(creditLinkedTxnIds));

      if (sourceTransactions && sourceTransactions.length > 0) {
        const transactionInserts = sourceTransactions.map(t => {
          const newId = crypto.randomUUID();
          transactionMapping.set(t.id, newId);
          
          // Map linked_account_id if we have a mapping, otherwise set to null
          const mappedLinkedAccountId = t.linked_account_id && linkedAccountMapping.has(t.linked_account_id) 
            ? linkedAccountMapping.get(t.linked_account_id)! 
            : null;
          
          return {
            id: newId,
            user_id: TARGET_USER_ID,
            linked_account_id: mappedLinkedAccountId,
            plaid_transaction_id: t.plaid_transaction_id + '_demo',
            name: t.name,
            original_description: t.original_description,
            amount_cents: t.amount_cents,
            date: t.date,
            authorized_date: t.authorized_date,
            pending: t.pending,
            category: t.category,
            merchant_name: t.merchant_name,
            matched_credit_id: null, // Will be set by credit_usage_transactions link
            matched_rule_id: null,
            dismissed: t.dismissed,
            is_clawback: t.is_clawback,
          };
        });

        await supabase.from("user_plaid_transactions").insert(transactionInserts);
        stats.transactionsCloned = transactionInserts.length;
      }
    }

    // ============================================================
    // STEP 8: Clone credit usage
    // ============================================================

    const { data: sourceCreditUsage } = await supabase
      .from("user_credit_usage")
      .select("*")
      .in("user_wallet_id", Array.from(walletMapping.keys()));

    const creditUsageMapping = new Map<string, string>();

    if (sourceCreditUsage && sourceCreditUsage.length > 0) {
      const creditUsageInserts = sourceCreditUsage
        .filter(cu => walletMapping.has(cu.user_wallet_id))
        .map(cu => {
          const newId = crypto.randomUUID();
          creditUsageMapping.set(cu.id, newId);
          
          return {
            id: newId,
            user_wallet_id: walletMapping.get(cu.user_wallet_id)!,
            credit_id: cu.credit_id,
            period_start: cu.period_start,
            period_end: cu.period_end,
            slot_number: cu.slot_number,
            amount_used: cu.amount_used,
            used_at: cu.used_at,
            notes: cu.notes,
            auto_detected: cu.auto_detected,
            is_clawback: cu.is_clawback,
            perceived_value_cents: cu.perceived_value_cents,
          };
        });

      if (creditUsageInserts.length > 0) {
        await supabase.from("user_credit_usage").insert(creditUsageInserts);
        stats.creditUsagesCloned = creditUsageInserts.length;
      }
    }

    // Clone credit usage transaction links
    const { data: sourceCreditUsageTxns } = await supabase
      .from("user_credit_usage_transactions")
      .select("*")
      .in("usage_id", Array.from(creditUsageMapping.keys()));

    if (sourceCreditUsageTxns && sourceCreditUsageTxns.length > 0) {
      const cutInserts = sourceCreditUsageTxns
        .filter((cut): cut is typeof cut & { usage_id: string; transaction_id: string } => 
          cut.usage_id !== null && cut.transaction_id !== null && 
          creditUsageMapping.has(cut.usage_id) && transactionMapping.has(cut.transaction_id))
        .map(cut => ({
          usage_id: creditUsageMapping.get(cut.usage_id)!,
          transaction_id: transactionMapping.get(cut.transaction_id)!,
          amount_cents: cut.amount_cents,
        }));

      if (cutInserts.length > 0) {
        await supabase.from("user_credit_usage_transactions").insert(cutInserts);
        stats.creditUsageTransactionLinksCloned = cutInserts.length;
      }
    }

    // ============================================================
    // STEP 9: Clone inventory
    // ============================================================

    const { data: sourceInventory } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    if (sourceInventory && sourceInventory.length > 0) {
      const inventoryInserts = sourceInventory.map(inv => ({
        id: crypto.randomUUID(),
        user_id: TARGET_USER_ID,
        type_id: inv.type_id,
        name: transformInventoryName(inv.name), // TRANSFORMATION: Replace player initials
        brand: inv.brand,
        original_value_cents: inv.original_value_cents,
        remaining_value_cents: inv.remaining_value_cents,
        quantity: inv.quantity,
        quantity_used: inv.quantity_used,
        expiration_date: inv.expiration_date,
        no_expiration: inv.no_expiration,
        code: null, // TRANSFORMATION: Clear gift card codes
        pin: null, // TRANSFORMATION: Clear pins
        url: inv.url,
        notes: null, // TRANSFORMATION: Clear notes
        is_used: inv.is_used,
        used_at: inv.used_at,
        source_credit_usage_id: inv.source_credit_usage_id ? creditUsageMapping.get(inv.source_credit_usage_id) : null,
        source_wallet_id: inv.source_wallet_id ? walletMapping.get(inv.source_wallet_id) : null,
        player_number: inv.player_number,
        external_id: inv.external_id,
      }));

      await supabase.from("user_inventory").insert(inventoryInserts);
    }

    // ============================================================
    // STEP 10: Clone bank accounts (with masked balances)
    // ============================================================

    const { data: sourceBankAccounts } = await supabase
      .from("user_bank_accounts")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    const bankAccountMapping = new Map<string, string>();

    if (sourceBankAccounts && sourceBankAccounts.length > 0) {
      const bankAccountInserts = sourceBankAccounts.map(ba => {
        const newId = crypto.randomUUID();
        bankAccountMapping.set(ba.id, newId);
        
        return {
          id: newId,
          user_id: TARGET_USER_ID,
          plaid_item_id: plaidItemId,
          plaid_account_id: ba.plaid_account_id + '_demo',
          name: ba.name,
          official_name: ba.official_name,
          type: ba.type,
          subtype: ba.subtype,
          mask: null, // TRANSFORMATION: Hide account mask
          current_balance: 25000, // TRANSFORMATION: Set fixed demo balance
          available_balance: 25000, // TRANSFORMATION: Set fixed demo balance
          iso_currency_code: ba.iso_currency_code,
          institution_name: ba.institution_name,
          is_manual: ba.is_manual,
          is_primary: ba.is_primary,
          last_balance_update: ba.last_balance_update,
          display_name: ba.display_name,
        };
      });

      await supabase.from("user_bank_accounts").insert(bankAccountInserts);
      stats.bankAccountsCloned = bankAccountInserts.length;
    }

    // ============================================================
    // STEP 11: Clone payment settings
    // ============================================================

    const { data: sourcePaymentSettings } = await supabase
      .from("user_card_payment_settings")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    if (sourcePaymentSettings && sourcePaymentSettings.length > 0) {
      const paymentSettingsInserts = sourcePaymentSettings
        .filter(ps => walletMapping.has(ps.wallet_card_id))
        .map(ps => ({
          user_id: TARGET_USER_ID,
          wallet_card_id: walletMapping.get(ps.wallet_card_id)!,
          is_autopay: ps.is_autopay,
          autopay_type: ps.autopay_type,
          pay_from_account_id: ps.pay_from_account_id ? bankAccountMapping.get(ps.pay_from_account_id) ?? null : null, // Map to new bank account ID
          fixed_autopay_amount: ps.fixed_autopay_amount,
          reminder_days_before: ps.reminder_days_before,
          dismissed_statement_date: ps.dismissed_statement_date,
        }));

      if (paymentSettingsInserts.length > 0) {
        await supabase.from("user_card_payment_settings").insert(paymentSettingsInserts);
      }
    }

    // ============================================================
    // STEP 12: Clone credit report data
    // ============================================================

    // Clone credit report snapshots first (other tables reference them)
    const { data: sourceSnapshots } = await supabase
      .from("credit_report_snapshots")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    const snapshotMapping = new Map<string, string>();

    if (sourceSnapshots && sourceSnapshots.length > 0) {
      const snapshotInserts = sourceSnapshots.map(s => {
        const newId = crypto.randomUUID();
        snapshotMapping.set(s.id, newId);
        return {
          id: newId,
          user_id: TARGET_USER_ID,
          player_number: s.player_number,
          bureau: s.bureau,
          fetched_at: s.fetched_at,
          report_date: s.report_date,
          source: s.source,
        };
      });
      await supabase.from("credit_report_snapshots").insert(snapshotInserts);
      stats.creditReportSnapshotsCloned = snapshotInserts.length;
    }

    // Clone credit accounts
    const { data: sourceCreditAccounts } = await supabase
      .from("credit_accounts")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    const creditAccountMapping = new Map<string, string>();

    if (sourceCreditAccounts && sourceCreditAccounts.length > 0) {
      const creditAccountInserts = sourceCreditAccounts.map(ca => {
        const newId = crypto.randomUUID();
        creditAccountMapping.set(ca.id, newId);
        return {
          id: newId,
          user_id: TARGET_USER_ID,
          player_number: ca.player_number,
          account_name: ca.account_name,
          account_type: ca.account_type,
          bureau: ca.bureau,
          balance_cents: ca.balance_cents,
          credit_limit_cents: ca.credit_limit_cents,
          status: ca.status,
          date_opened: ca.date_opened,
          date_closed: ca.date_closed,
          snapshot_id: ca.snapshot_id ? snapshotMapping.get(ca.snapshot_id) ?? null : null,
          creditor_name: ca.creditor_name,
          account_number_masked: null, // TRANSFORMATION: Hide account number
          loan_type: ca.loan_type,
          responsibility: ca.responsibility,
          high_balance_cents: ca.high_balance_cents,
          monthly_payment_cents: ca.monthly_payment_cents,
          payment_status: ca.payment_status,
          terms: ca.terms,
          date_updated: ca.date_updated,
        };
      });
      await supabase.from("credit_accounts").insert(creditAccountInserts);
      stats.creditReportAccountsCloned = creditAccountInserts.length;
    }

    // Clone credit account wallet links
    const { data: sourceCreditLinks } = await supabase
      .from("credit_account_wallet_links")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    if (sourceCreditLinks && sourceCreditLinks.length > 0) {
      const linkInserts = sourceCreditLinks
        .filter(link => creditAccountMapping.has(link.credit_account_id))
        .map(link => ({
          user_id: TARGET_USER_ID,
          credit_account_id: creditAccountMapping.get(link.credit_account_id)!,
          wallet_card_id: link.wallet_card_id ? walletMapping.get(link.wallet_card_id) ?? null : null,
          display_name: link.display_name,
        }));
      
      if (linkInserts.length > 0) {
        await supabase.from("credit_account_wallet_links").insert(linkInserts);
        stats.creditReportWalletLinksCloned = linkInserts.length;
      }
    }

    // Clone credit scores: 
    // 1) Most recent score of each type for each bureau (for current display)
    // 2) FICO 8 history - max 1 per month per bureau for past 24 months (for chart)
    
    const twoYearsAgo = new Date();
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
    const scoresCutoff = twoYearsAgo.toISOString().split('T')[0];
    
    // Get all scores to filter in JS (more flexible than SQL for this logic)
    const { data: allSourceScores } = await supabase
      .from("credit_scores")
      .select("*")
      .eq("user_id", SOURCE_USER_ID)
      .gte("score_date", scoresCutoff)
      .order("score_date", { ascending: false })
      .limit(5000);

    if (allSourceScores && allSourceScores.length > 0) {
      const scoresToClone: typeof allSourceScores = [];
      const bureaus = ["equifax", "experian", "transunion"];
      
      // 1) Get most recent score of each type for each bureau
      const seenLatest = new Set<string>();
      for (const score of allSourceScores) {
        const key = `${score.bureau}-${score.score_type}-${score.player_number}`;
        if (!seenLatest.has(key)) {
          seenLatest.add(key);
          scoresToClone.push(score);
        }
      }
      
      // 2) Get FICO 8 history - max 1 per month per bureau for chart
      const seenFico8Months = new Set<string>();
      for (const score of allSourceScores) {
        if (score.score_type !== "fico_8") continue;
        const monthKey = `${score.bureau}-${score.player_number}-${score.score_date?.slice(0, 7)}`;
        if (!seenFico8Months.has(monthKey)) {
          seenFico8Months.add(monthKey);
          // Only add if not already in scoresToClone (from step 1)
          if (!scoresToClone.some(s => s.id === score.id)) {
            scoresToClone.push(score);
          }
        }
      }

      const scoreInserts = scoresToClone.map(cs => ({
        user_id: TARGET_USER_ID,
        player_number: cs.player_number,
        bureau: cs.bureau,
        score: cs.score,
        score_type: cs.score_type,
        score_date: cs.score_date,
        snapshot_id: cs.snapshot_id ? snapshotMapping.get(cs.snapshot_id) ?? null : null,
      }));
      
      await supabase.from("credit_scores").insert(scoreInserts);
      stats.creditScoresCloned = scoreInserts.length;
    }

    // Clone credit inquiries
    const { data: sourceCreditInquiries } = await supabase
      .from("credit_inquiries")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    const inquiryMapping = new Map<string, string>();

    if (sourceCreditInquiries && sourceCreditInquiries.length > 0) {
      const inquiryInserts = sourceCreditInquiries.map(ci => {
        const newId = crypto.randomUUID();
        inquiryMapping.set(ci.id, newId);
        return {
          id: newId,
          user_id: TARGET_USER_ID,
          player_number: ci.player_number,
          bureau: ci.bureau,
          company_name: ci.company_name,
          inquiry_date: ci.inquiry_date,
          inquiry_type: ci.inquiry_type,
          snapshot_id: ci.snapshot_id ? snapshotMapping.get(ci.snapshot_id) ?? null : null,
          last_seen_snapshot_id: ci.last_seen_snapshot_id ? snapshotMapping.get(ci.last_seen_snapshot_id) ?? null : null,
        };
      });
      await supabase.from("credit_inquiries").insert(inquiryInserts);
      stats.creditInquiriesCloned = inquiryInserts.length;
    }

    // Clone credit inquiry groups
    const { data: sourceInquiryGroups } = await supabase
      .from("credit_inquiry_groups")
      .select("*")
      .eq("user_id", SOURCE_USER_ID);

    const inquiryGroupMapping = new Map<string, string>();

    if (sourceInquiryGroups && sourceInquiryGroups.length > 0) {
      const groupInserts = sourceInquiryGroups.map(g => {
        const newId = crypto.randomUUID();
        inquiryGroupMapping.set(g.id, newId);
        return {
          id: newId,
          user_id: TARGET_USER_ID,
          player_number: g.player_number,
          group_name: g.group_name,
          related_card_id: g.related_card_id ? walletMapping.get(g.related_card_id) ?? null : null,
          related_note: g.related_note,
        };
      });
      await supabase.from("credit_inquiry_groups").insert(groupInserts);
      stats.creditInquiryGroupsCloned = groupInserts.length;
    }

    // Clone credit inquiry group members
    const { data: sourceGroupMembers } = await supabase
      .from("credit_inquiry_group_members")
      .select("*")
      .in("group_id", Array.from(inquiryGroupMapping.keys()));

    if (sourceGroupMembers && sourceGroupMembers.length > 0) {
      const memberInserts = sourceGroupMembers
        .filter(m => inquiryGroupMapping.has(m.group_id) && inquiryMapping.has(m.inquiry_id))
        .map(m => ({
          group_id: inquiryGroupMapping.get(m.group_id)!,
          inquiry_id: inquiryMapping.get(m.inquiry_id)!,
        }));
      
      if (memberInserts.length > 0) {
        await supabase.from("credit_inquiry_group_members").insert(memberInserts);
      }
    }

    // Credit-transaction links are already cloned directly (no rematch needed)
    // The credit_usage_transactions links are cloned in STEP 8b above

    return NextResponse.json({ 
      success: true, 
      stats,
      message: `Demo account refreshed successfully. ${stats.walletsCloned} cards, ${stats.transactionsCloned} credit-linked transactions, ${stats.creditUsageTransactionLinksCloned} credit-transaction links, ${stats.pointBalancesCloned} point balances (${stats.pointBalancesExcluded} excluded).`
    });

  } catch (error) {
    console.error("Demo clone error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Clone failed" },
      { status: 500 }
    );
  }
}
