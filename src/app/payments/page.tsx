import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { calculateBillingDates, type BillingCycleFormula } from "@/lib/billing-cycle";
import { calculateStatementBalance, type StatementEstimate } from "@/lib/statement-calculator";
import { UpcomingPayments, type UpcomingPayment, type BankAccount, type UnbilledBalance } from "../upcoming/upcoming-payments";
import { BankAccountsSection, type CashFlowItem } from "../wallet/bank-accounts-section";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Payments | CardTool",
  description: "Manage your credit card payments and pay-from accounts",
};

export default async function PaymentsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();

  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  // Fetch all required data in parallel
  const [
    walletResult,
    linkedAccountsResult,
    transactionsResult,
    bankAccountsResult,
    paymentSettingsResult,
    playersResult,
    featureFlagsResult,
    cashFlowItemsResult,
    paymentDateOverridesResult,
  ] = await Promise.all([
    // User's wallet cards with billing info
    supabase
      .from("user_wallets")
      .select(`
        id,
        card_id,
        custom_name,
        player_number,
        statement_close_day,
        payment_due_day,
        cards:card_id (
          id,
          name,
          issuers:issuer_id (
            id,
            name,
            billing_cycle_formula
          )
        )
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),
    // Linked Plaid accounts with liabilities data
    supabase
      .from("user_linked_accounts")
      .select(`
        id,
        wallet_card_id,
        plaid_account_id,
        mask,
        current_balance,
        credit_limit,
        manual_credit_limit,
        available_balance,
        last_balance_update,
        last_statement_balance,
        last_statement_issue_date,
        next_payment_due_date,
        minimum_payment_amount,
        is_overdue,
        last_payment_amount,
        last_payment_date
      `)
      .eq("user_id", effectiveUserId),
    // Recent transactions for statement balance calculation
    supabase
      .from("user_plaid_transactions")
      .select(`
        id,
        linked_account_id,
        amount_cents,
        date,
        pending
      `)
      .eq("user_id", effectiveUserId)
      .eq("pending", false)
      .gte("date", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
    // Bank accounts
    supabase
      .from("user_bank_accounts")
      .select("*")
      .eq("user_id", effectiveUserId),
    // Payment settings
    supabase
      .from("user_card_payment_settings")
      .select("*")
      .eq("user_id", effectiveUserId),
    // Players
    supabase
      .from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId)
      .order("player_number"),
    // Feature flags
    supabase
      .from("user_feature_flags")
      .select("account_linking_enabled, plaid_on_demand_refresh_enabled")
      .eq("user_id", effectiveUserId)
      .single(),
    // Cash flow items
    supabase
      .from("user_cash_flow_items")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("expected_date"),
    // Payment date overrides
    supabase
      .from("user_payment_date_overrides")
      .select("*")
      .eq("user_id", effectiveUserId),
  ]);

  // Process wallet cards
  type WalletCard = {
    id: string;
    card_id: string;
    custom_name: string | null;
    player_number: number | null;
    statement_close_day: number | null;
    payment_due_day: number | null;
    cards: {
      id: string;
      name: string;
      issuers: {
        id: string;
        name: string;
        billing_cycle_formula: string | null;
      } | null;
    } | null;
  };
  const walletCards = (walletResult.data ?? []) as WalletCard[];

  // Process linked accounts
  type LinkedAccount = {
    id: string;
    wallet_card_id: string | null;
    plaid_account_id: string;
    mask: string | null;
    current_balance: number | null;
    credit_limit: number | null;
    manual_credit_limit: number | null;
    available_balance: number | null;
    last_balance_update: string | null;
    last_statement_balance: number | null;
    last_statement_issue_date: string | null;
    next_payment_due_date: string | null;
    minimum_payment_amount: number | null;
    is_overdue: boolean;
    last_payment_amount: number | null;
    last_payment_date: string | null;
  };
  const linkedAccounts = (linkedAccountsResult.data ?? []) as LinkedAccount[];
  const linkedAccountsMap = new Map<string, LinkedAccount>();
  linkedAccounts.forEach(la => {
    if (la.wallet_card_id) {
      linkedAccountsMap.set(la.wallet_card_id, la);
    }
  });

  // Process transactions for statement estimates
  type Transaction = {
    id: string;
    linked_account_id: string;
    amount_cents: number;
    date: string;
    pending: boolean;
  };
  const transactions = (transactionsResult.data ?? []) as Transaction[];
  const transactionsByLinkedAccount = new Map<string, Transaction[]>();
  transactions.forEach(t => {
    if (!transactionsByLinkedAccount.has(t.linked_account_id)) {
      transactionsByLinkedAccount.set(t.linked_account_id, []);
    }
    transactionsByLinkedAccount.get(t.linked_account_id)!.push(t);
  });

  // Calculate statement estimates for each wallet card
  const statementEstimatesMap = new Map<string, StatementEstimate>();
  walletCards.forEach(wc => {
    const linked = linkedAccountsMap.get(wc.id);
    if (!linked) return;

    const accountTransactions = transactionsByLinkedAccount.get(linked.id) ?? [];
    if (accountTransactions.length === 0) return;

    const billingDates = calculateBillingDates(
      wc.cards?.issuers?.billing_cycle_formula ?? null,
      wc.statement_close_day,
      wc.payment_due_day
    );

    if (billingDates.lastCloseDate) {
      // Current balance from Plaid is in dollars, convert to cents
      const currentBalanceCents = Math.round((linked.current_balance ?? 0) * 100);
      
      const estimate = calculateStatementBalance(
        currentBalanceCents,
        accountTransactions.map(t => ({ amount_cents: t.amount_cents, date: t.date })),
        billingDates.lastCloseDate
      );
      statementEstimatesMap.set(wc.id, estimate);
    }
  });

  // Process bank accounts
  type BankAccountData = {
    id: string;
    name: string;
    official_name: string | null;
    display_name: string | null;
    type: string;
    subtype: string | null;
    mask: string | null;
    institution_name: string | null;
    current_balance: number | null;
    available_balance: number | null;
    iso_currency_code: string | null;
    last_balance_update: string | null;
    is_primary: boolean | null;
    is_manual: boolean;
  };
  const bankAccountsData = (bankAccountsResult.data ?? []) as BankAccountData[];

  // Process payment settings
  type PaymentSettings = {
    wallet_card_id: string;
    pay_from_account_id: string | null;
    is_autopay: boolean;
    autopay_type: string | null;
    dismissed_statement_date: string | null;
  };
  const paymentSettingsData = (paymentSettingsResult.data ?? []) as PaymentSettings[];
  const paymentSettingsMap = new Map<string, { pay_from_account_id: string | null; is_autopay: boolean; autopay_type: string | null; dismissed_statement_date: string | null }>();
  paymentSettingsData.forEach(ps => {
    paymentSettingsMap.set(ps.wallet_card_id, {
      pay_from_account_id: ps.pay_from_account_id,
      is_autopay: ps.is_autopay,
      autopay_type: ps.autopay_type,
      dismissed_statement_date: ps.dismissed_statement_date,
    });
  });

  // Process players
  const players = (playersResult.data ?? [{ player_number: 1, description: null }]) as { player_number: number; description: string | null }[];

  // Feature flags
  const accountLinkingEnabled = featureFlagsResult.data?.account_linking_enabled ?? false;
  const onDemandRefreshEnabled = featureFlagsResult.data?.plaid_on_demand_refresh_enabled ?? false;

  // Process cash flow items
  const cashFlowItems: CashFlowItem[] = (cashFlowItemsResult.data ?? []).map(item => ({
    id: item.id,
    description: item.description,
    amount_cents: item.amount_cents,
    expected_date: item.expected_date,
    is_recurring: item.is_recurring ?? false,
    recurrence_type: item.recurrence_type,
    category: item.category,
    is_completed: item.is_completed ?? false,
    bank_account_id: item.bank_account_id,
    wallet_card_id: item.wallet_card_id ?? null,
    linked_item_id: item.linked_item_id ?? null,
  }));

  // Process payment date overrides into a map
  type PaymentDateOverride = {
    id: string;
    wallet_card_id: string;
    override_date: string;
    original_due_date: string;
  };
  const paymentDateOverrides = (paymentDateOverridesResult.data ?? []) as PaymentDateOverride[];
  const paymentDateOverridesMap = new Map<string, PaymentDateOverride>();
  paymentDateOverrides.forEach(override => {
    // Key by wallet_card_id + original_due_date to handle multiple cycles
    const key = `${override.wallet_card_id}_${override.original_due_date}`;
    paymentDateOverridesMap.set(key, override);
  });

  // Build upcoming payments array
  const upcomingPayments: UpcomingPayment[] = [];
  for (const wc of walletCards) {
    const linked = linkedAccountsMap.get(wc.id);
    const estimate = statementEstimatesMap.get(wc.id);
    const paymentSettings = paymentSettingsMap.get(wc.id);

    // Get due date from Plaid or calculate it
    let plaidDueDate: Date | null = null;
    if (linked?.next_payment_due_date) {
      plaidDueDate = new Date(linked.next_payment_due_date);
    }

    let calculatedDueDate: Date | null = null;
    if (wc.statement_close_day || wc.payment_due_day) {
      const billingDates = calculateBillingDates(
        wc.cards?.issuers?.billing_cycle_formula as BillingCycleFormula ?? null,
        wc.statement_close_day,
        wc.payment_due_day
      );
      calculatedDueDate = billingDates.nextDueDate;
    }

    const effectiveDueDate = plaidDueDate || calculatedDueDate;

    // Determine the effective balance to show
    // If we have Plaid liabilities data (last_statement_balance is not null), use that as source of truth
    // If last_statement_balance is 0, nothing is due even if current_balance is positive (that's new spending)
    // Only fall back to current_balance/estimate when we don't have liabilities data
    const hasPlaidLiabilitiesData = linked?.last_statement_balance !== null && linked?.last_statement_balance !== undefined;
    const statementBalance = linked?.last_statement_balance ?? null;
    const fallbackBalance = linked?.current_balance ?? (estimate ? estimate.statementBalanceCents / 100 : null);
    const statementIssueDate = linked?.last_statement_issue_date ?? null;
    
    // Check if this statement was manually dismissed (marked as paid)
    const dismissedDate = paymentSettings?.dismissed_statement_date;
    if (dismissedDate && statementIssueDate) {
      const dismissed = new Date(dismissedDate);
      const issued = new Date(statementIssueDate);
      if (issued <= dismissed) continue; // Statement was marked as paid
    }
    
    // Check if current balance is 0 or negative (definitely paid)
    if (hasPlaidLiabilitiesData && linked?.current_balance !== null && linked.current_balance <= 0) {
      continue; // Card is paid off
    }
    
    // Check for partial payment and calculate remaining balance
    let partialPaymentAmount: number | null = null;
    let partialPaymentDate: string | null = null;
    let remainingBalance: number | null = null;
    let statementAlreadyPaid = false;
    
    // Check if current_balance is 0 or negative and is_overdue is false - statement is paid
    // This handles cases where Plaid's last_payment_date hasn't been updated yet
    if (hasPlaidLiabilitiesData && linked?.is_overdue === false && 
        linked?.current_balance !== null && linked?.current_balance !== undefined && 
        linked.current_balance <= 0) {
      statementAlreadyPaid = true;
    }
    // Otherwise check using payment date logic
    else if (hasPlaidLiabilitiesData && linked?.last_payment_date && statementIssueDate) {
      const paymentDate = new Date(linked.last_payment_date);
      const statementDate = new Date(statementIssueDate);
      const paymentAmount = linked.last_payment_amount ?? 0;
      
      // Payment was made after statement date
      if (paymentDate >= statementDate && paymentAmount > 0) {
        // If Plaid says not overdue and payment was made, trust it (handles credits/adjustments)
        if (linked.is_overdue === false) {
          statementAlreadyPaid = true;
        }
        // If payment covers full statement, it's paid
        else if (statementBalance && paymentAmount >= statementBalance) {
          statementAlreadyPaid = true;
        }
        // Partial payment - show remaining balance
        else if (statementBalance && paymentAmount < statementBalance) {
          partialPaymentAmount = paymentAmount;
          partialPaymentDate = linked.last_payment_date;
          remainingBalance = statementBalance - paymentAmount;
        }
      }
    }
    
    // Use statement balance if we have it, otherwise fall back
    const effectiveBalance = hasPlaidLiabilitiesData ? statementBalance : fallbackBalance;
    
    // Skip if statement balance is 0, already paid, or if no due date and no balance
    if (hasPlaidLiabilitiesData && (statementBalance === 0 || statementBalance === null || statementAlreadyPaid)) continue;
    if (!effectiveDueDate && !effectiveBalance && !linked) continue;

    // Get pay-from account info
    const payFromAccount = paymentSettings?.pay_from_account_id
      ? bankAccountsData.find(ba => ba.id === paymentSettings.pay_from_account_id)
      : null;

    upcomingPayments.push({
      id: wc.id,
      walletCardId: wc.id,
      cardName: wc.custom_name ?? wc.cards?.name ?? "Unknown Card",
      cardMask: linked?.mask ?? null,
      issuerName: wc.cards?.issuers?.name ?? null,
      playerNumber: wc.player_number,
      statementBalance: linked?.last_statement_balance ?? null,
      dueDate: plaidDueDate,
      minimumPayment: linked?.minimum_payment_amount ?? null,
      isOverdue: linked?.is_overdue ?? false,
      statementDate: statementIssueDate,
      partialPaymentAmount,
      partialPaymentDate,
      remainingBalance,
      calculatedDueDate,
      currentBalance: linked?.current_balance ?? (estimate ? estimate.statementBalanceCents / 100 : null),
      payFromAccountId: paymentSettings?.pay_from_account_id ?? null,
      payFromAccountName: payFromAccount ? (payFromAccount.display_name || payFromAccount.name) : null,
      payFromInstitution: payFromAccount?.institution_name ?? null,
      payFromBalance: payFromAccount?.available_balance ?? null,
      isAutopay: paymentSettings?.is_autopay ?? false,
      autopayType: paymentSettings?.autopay_type ?? null,
    });
  }

  // Calculate unbilled balances (current spending not yet on a statement)
  const unbilledBalances: UnbilledBalance[] = [];
  for (const wc of walletCards) {
    const linked = linkedAccountsMap.get(wc.id);
    
    // Calculate unbilled amount: current balance - statement balance
    const currentBalance = linked?.current_balance ?? null;
    const statementBalance = linked?.last_statement_balance ?? null;
    const statementIssueDate = linked?.last_statement_issue_date ?? null;
    
    // Skip if no current balance or if current balance is 0 or negative
    if (currentBalance === null || currentBalance <= 0) continue;
    
    // Check if the last statement was paid in full
    // If so, current balance IS the unbilled amount (all new spending)
    let statementWasPaid = false;
    if (linked?.last_payment_date && statementIssueDate && statementBalance) {
      const paymentDate = new Date(linked.last_payment_date);
      const statementDate = new Date(statementIssueDate);
      const paymentAmount = linked.last_payment_amount ?? 0;
      
      // Payment after statement that covers the full balance
      if (paymentDate >= statementDate && paymentAmount >= statementBalance) {
        statementWasPaid = true;
      }
    }
    
    // Unbilled = current balance - statement balance (if statement exists and not paid)
    // If statement was paid, current balance is all new unbilled spending
    // If no statement data, all of current balance is unbilled
    let unbilledAmount: number;
    if (statementWasPaid) {
      unbilledAmount = currentBalance; // All current spending is unbilled (statement was paid)
    } else if (statementBalance !== null) {
      unbilledAmount = currentBalance - (statementBalance > 0 ? statementBalance : 0);
    } else {
      unbilledAmount = currentBalance;
    }
    
    // Only show if there's unbilled spending
    if (unbilledAmount <= 0) continue;
    
    // Calculate statement close date and projected due date
    const billingDates = calculateBillingDates(
      wc.cards?.issuers?.billing_cycle_formula ?? null,
      wc.statement_close_day,
      wc.payment_due_day
    );
    
    // Calculate projected due date for the FUTURE statement (not the current one)
    // nextDueDate is for the current cycle; we need the due date for nextCloseDate's cycle
    let projectedDueDate: Date | null = null;
    if (billingDates.nextCloseDate) {
      if (billingDates.lastCloseDate && billingDates.nextDueDate) {
        // Calculate the gap between close and due, then apply to nextCloseDate
        const closeTodueDays = Math.round(
          (billingDates.nextDueDate.getTime() - billingDates.lastCloseDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        projectedDueDate = new Date(billingDates.nextCloseDate);
        projectedDueDate.setDate(projectedDueDate.getDate() + closeTodueDays);
      } else {
        // Approximate: due ~25 days after close
        projectedDueDate = new Date(billingDates.nextCloseDate);
        projectedDueDate.setDate(projectedDueDate.getDate() + 25);
      }
    }
    
    unbilledBalances.push({
      walletCardId: wc.id,
      cardName: wc.custom_name ?? wc.cards?.name ?? "Unknown Card",
      cardMask: linked?.mask ?? null,
      issuerName: wc.cards?.issuers?.name ?? null,
      playerNumber: wc.player_number,
      unbilledAmount,
      statementCloseDate: billingDates.nextCloseDate,
      projectedDueDate,
    });
  }
  
  // Sort unbilled balances by close date (soonest first)
  unbilledBalances.sort((a, b) => {
    if (!a.statementCloseDate) return 1;
    if (!b.statementCloseDate) return -1;
    return a.statementCloseDate.getTime() - b.statementCloseDate.getTime();
  });

  // Convert bank accounts for UpcomingPayments component
  const bankAccountsForPayments: BankAccount[] = bankAccountsData.map(ba => ({
    id: ba.id,
    name: ba.name,
    displayName: ba.display_name,
    institution: ba.institution_name,
    availableBalance: ba.available_balance,
    isPrimary: ba.is_primary ?? false,
  }));

  // Server actions for bank accounts
  async function deleteBankAccount(accountId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();

    // Get the account to check if it's manual
    const { data: account } = await supabase
      .from("user_bank_accounts")
      .select("plaid_item_id, is_manual")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (!account) return;

    if (account.is_manual) {
      // Just delete the manual account
      await supabase
        .from("user_bank_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);
    } else if (account.plaid_item_id) {
      // Check if there are other accounts from the same plaid item
      const { data: otherAccounts } = await supabase
        .from("user_bank_accounts")
        .select("id")
        .eq("plaid_item_id", account.plaid_item_id)
        .neq("id", accountId);

      // Delete the bank account
      await supabase
        .from("user_bank_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);

      // If no other accounts, delete the plaid item too
      if (!otherAccounts || otherAccounts.length === 0) {
        await supabase
          .from("user_plaid_items")
          .delete()
          .eq("id", account.plaid_item_id)
          .eq("user_id", userId);
      }
    }

    revalidatePath("/payments");
    revalidatePath("/wallet");
  }

  async function setBankAccountPrimary(accountId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();

    // The trigger will handle unsetting other primaries
    await supabase
      .from("user_bank_accounts")
      .update({ is_primary: true })
      .eq("id", accountId)
      .eq("user_id", userId);

    revalidatePath("/payments");
    revalidatePath("/wallet");
  }

  async function updateBankAccountDisplayName(accountId: string, displayName: string | null) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_bank_accounts")
      .update({ display_name: displayName })
      .eq("id", accountId)
      .eq("user_id", userId);

    revalidatePath("/payments");
    revalidatePath("/wallet");
  }

  // Server actions for cash flow items
  async function addCashFlowItem(item: {
    description: string;
    amount_cents: number;
    expected_date: string;
    is_recurring: boolean;
    recurrence_type: string | null;
    category: string | null;
    bank_account_id: string | null;
    wallet_card_id: string | null;
  }): Promise<string | null> {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return null;

    const supabase = createClient();
    const result = await supabase
      .from("user_cash_flow_items")
      .insert({
        user_id: userId,
        ...item,
      })
      .select("id")
      .single();

    revalidatePath("/payments");
    return result.data?.id ?? null;
  }

  // Link two cash flow items together (for transfers)
  async function linkCashFlowItems(id1: string, id2: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    // Update both items to link to each other
    await Promise.all([
      supabase
        .from("user_cash_flow_items")
        .update({ linked_item_id: id2 })
        .eq("id", id1)
        .eq("user_id", userId),
      supabase
        .from("user_cash_flow_items")
        .update({ linked_item_id: id1 })
        .eq("id", id2)
        .eq("user_id", userId),
    ]);

    revalidatePath("/payments");
  }

  async function updateCashFlowItem(id: string, item: {
    description: string;
    amount_cents: number;
    expected_date: string;
    is_recurring: boolean;
    recurrence_type: string | null;
    category: string | null;
    bank_account_id: string | null;
    wallet_card_id: string | null;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    // First, get the current item to check if it has a linked item
    const { data: currentItem } = await supabase
      .from("user_cash_flow_items")
      .select("linked_item_id, bank_account_id, description")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    // Update the main item
    await supabase
      .from("user_cash_flow_items")
      .update(item)
      .eq("id", id)
      .eq("user_id", userId);

    // If there's a linked item (transfer), sync relevant fields
    if (currentItem?.linked_item_id && item.category === "Transfer") {
      // Get the linked item's current data to preserve its bank_account_id
      const { data: linkedItem } = await supabase
        .from("user_cash_flow_items")
        .select("bank_account_id")
        .eq("id", currentItem.linked_item_id)
        .eq("user_id", userId)
        .single();

      // Generate the linked item's description based on the updated source item
      // If source is going "To AccountB", linked should be "From AccountA"
      const linkedDescription = item.description.replace(/^Transfer (To|From)/, (_, dir) => 
        `Transfer ${dir === "To" ? "From" : "To"}`
      );

      await supabase
        .from("user_cash_flow_items")
        .update({
          description: linkedDescription,
          amount_cents: -item.amount_cents, // Opposite sign
          expected_date: item.expected_date,
          is_recurring: item.is_recurring,
          recurrence_type: item.recurrence_type,
          category: "Transfer",
          bank_account_id: linkedItem?.bank_account_id, // Keep the linked item's account
        })
        .eq("id", currentItem.linked_item_id)
        .eq("user_id", userId);
    }

    revalidatePath("/payments");
  }

  async function deleteCashFlowItem(id: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    
    // Check if this item has a linked item
    const { data: item } = await supabase
      .from("user_cash_flow_items")
      .select("linked_item_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    // Delete the main item
    await supabase
      .from("user_cash_flow_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    // Also delete the linked item if it exists
    if (item?.linked_item_id) {
      await supabase
        .from("user_cash_flow_items")
        .delete()
        .eq("id", item.linked_item_id)
        .eq("user_id", userId);
    }

    revalidatePath("/payments");
  }

  async function toggleCashFlowItemCompleted(id: string, completed: boolean) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_cash_flow_items")
      .update({ is_completed: completed })
      .eq("id", id)
      .eq("user_id", userId);

    revalidatePath("/payments");
  }

  // Server actions for payment date overrides
  async function setPaymentDateOverride(walletCardId: string, overrideDate: string, originalDueDate: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    // Upsert - create or update override for this card/cycle
    await supabase
      .from("user_payment_date_overrides")
      .upsert({
        user_id: userId,
        wallet_card_id: walletCardId,
        override_date: overrideDate,
        original_due_date: originalDueDate,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,wallet_card_id,original_due_date"
      });

    revalidatePath("/payments");
  }

  async function clearPaymentDateOverride(walletCardId: string, originalDueDate: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from("user_payment_date_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("wallet_card_id", walletCardId)
      .eq("original_due_date", originalDueDate);

    revalidatePath("/payments");
  }

  async function updatePaymentSettings(walletCardId: string, settings: {
    pay_from_account_id: string | null;
    is_autopay: boolean;
    autopay_type: string | null;
    fixed_autopay_amount: number | null;
    reminder_days_before: number;
  }) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("[updatePaymentSettings] No user ID");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("user_card_payment_settings")
      .upsert({
        user_id: userId,
        wallet_card_id: walletCardId,
        pay_from_account_id: settings.pay_from_account_id,
        is_autopay: settings.is_autopay,
        autopay_type: settings.autopay_type,
        fixed_autopay_amount: settings.fixed_autopay_amount,
        reminder_days_before: settings.reminder_days_before,
      }, { onConflict: "wallet_card_id" });
    
    if (error) {
      console.error("[updatePaymentSettings] Error:", error);
      throw new Error(`Failed to update payment settings: ${error.message}`);
    }
    
    revalidatePath("/payments");
    revalidatePath("/wallet");
  }

  // Check if admin
  const isAdmin = user.primaryEmailAddress?.emailAddress
    ? isAdminEmail(user.primaryEmailAddress.emailAddress)
    : false;

  return (
    <div className="flex-1 bg-zinc-950">
      <UserHeader
        isAdmin={isAdmin}
        emulationInfo={emulationInfo}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Payments</h1>
          <p className="text-zinc-400 mt-1">
            Track upcoming payments and manage your pay-from accounts
          </p>
        </div>

        {/* Upcoming Payments Section */}
        <UpcomingPayments
          payments={upcomingPayments}
          unbilledBalances={unbilledBalances}
          bankAccounts={bankAccountsForPayments}
          players={players}
          paymentDateOverridesMap={paymentDateOverridesMap}
          isAdmin={isAdmin}
          bankAccountsForSettings={bankAccountsData.map(ba => ({
            id: ba.id,
            name: ba.name,
            display_name: ba.display_name,
            mask: ba.mask,
            institution_name: ba.institution_name,
            current_balance: ba.current_balance,
            available_balance: ba.available_balance,
            is_primary: ba.is_primary,
          }))}
          paymentSettingsMap={paymentSettingsMap}
          linkedAccountsMap={linkedAccountsMap}
          onUpdatePaymentSettings={updatePaymentSettings}
        />

        {/* Pay From Accounts Section */}
        <div className="mt-8">
          <BankAccountsSection
            initialAccounts={bankAccountsData}
            accountLinkingEnabled={accountLinkingEnabled}
            onDeleteAccount={deleteBankAccount}
            onSetPrimary={setBankAccountPrimary}
            onUpdateDisplayName={updateBankAccountDisplayName}
            paymentSettingsMap={paymentSettingsMap}
            walletCards={walletCards.map(wc => ({
              id: wc.id,
              card_id: wc.card_id,
              custom_name: wc.custom_name,
              card_name: wc.cards?.name ?? '',
              issuer_name: wc.cards?.issuers?.name ?? '',
              statement_close_day: wc.statement_close_day ?? null,
              payment_due_day: wc.payment_due_day ?? null,
              billing_formula: wc.cards?.issuers?.billing_cycle_formula ?? null,
              player_number: wc.player_number ?? null,
            }))}
            players={players}
            linkedAccountsMap={linkedAccountsMap}
            statementEstimatesMap={statementEstimatesMap}
            onDemandRefreshEnabled={onDemandRefreshEnabled}
            cashFlowItems={cashFlowItems}
            onAddCashFlowItem={addCashFlowItem}
            onLinkCashFlowItems={linkCashFlowItems}
            onUpdateCashFlowItem={updateCashFlowItem}
            onDeleteCashFlowItem={deleteCashFlowItem}
            onToggleCashFlowCompleted={toggleCashFlowItemCompleted}
            paymentDateOverridesMap={paymentDateOverridesMap}
            onSetPaymentDateOverride={setPaymentDateOverride}
            onClearPaymentDateOverride={clearPaymentDateOverride}
            isAdmin={isAdmin}
            bankAccountsForSettings={bankAccountsData.map(ba => ({
              id: ba.id,
              name: ba.name,
              display_name: ba.display_name,
              mask: ba.mask,
              institution_name: ba.institution_name,
              current_balance: ba.current_balance,
              available_balance: ba.available_balance,
              is_primary: ba.is_primary,
            }))}
            onUpdatePaymentSettings={updatePaymentSettings}
          />
        </div>
      </div>
    </div>
  );
}
