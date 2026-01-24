import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { calculateBillingDates, type BillingCycleFormula } from "@/lib/billing-cycle";
import { calculateStatementBalance, type StatementEstimate } from "@/lib/statement-calculator";
import { UpcomingPayments, type UpcomingPayment, type BankAccount, type UnbilledBalance } from "../upcoming/upcoming-payments";
import { BankAccountsSection } from "../wallet/bank-accounts-section";
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
      .select("account_linking_enabled")
      .eq("user_id", effectiveUserId)
      .single(),
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
    
    if (hasPlaidLiabilitiesData && linked?.last_payment_date && statementIssueDate) {
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
    
    // Skip if no current balance or if current balance is 0 or negative
    if (currentBalance === null || currentBalance <= 0) continue;
    
    // Unbilled = current balance - statement balance (if statement exists)
    // If no statement data, all of current balance is unbilled
    const unbilledAmount = statementBalance !== null 
      ? currentBalance - (statementBalance > 0 ? statementBalance : 0)
      : currentBalance;
    
    // Only show if there's unbilled spending
    if (unbilledAmount <= 0) continue;
    
    // Calculate statement close date and projected due date
    const billingDates = calculateBillingDates(
      wc.cards?.issuers?.billing_cycle_formula ?? null,
      wc.statement_close_day,
      wc.payment_due_day
    );
    
    // Calculate projected due date (next close date + typical billing gap)
    let projectedDueDate: Date | null = null;
    if (billingDates.nextCloseDate && billingDates.nextDueDate) {
      projectedDueDate = billingDates.nextDueDate;
    } else if (billingDates.nextCloseDate) {
      // Approximate: due ~25 days after close
      projectedDueDate = new Date(billingDates.nextCloseDate);
      projectedDueDate.setDate(projectedDueDate.getDate() + 25);
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

  // Check if admin
  const isAdmin = user.primaryEmailAddress?.emailAddress
    ? isAdminEmail(user.primaryEmailAddress.emailAddress)
    : false;

  return (
    <div className="min-h-screen bg-zinc-950">
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
            }))}
            linkedAccountsMap={linkedAccountsMap}
            statementEstimatesMap={statementEstimatesMap}
          />
        </div>
      </div>
    </div>
  );
}
