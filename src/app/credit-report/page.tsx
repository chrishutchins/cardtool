import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { ScoreChart } from "./score-chart";
import { AccountsTable } from "./accounts-table";
import { InquiriesTable } from "./inquiries-table";
import { CreditInsights } from "./credit-insights";
import { MatchingDebug } from "./matching-debug";
import { groupAccountsAcrossBureaus, type CreditAccount as MatchingCreditAccount } from "./account-matching";

export const metadata: Metadata = {
  title: "Credit Report | CardTool",
  description: "View your credit scores and report data",
};

type CreditBureau = "equifax" | "experian" | "transunion";
type ScoreType = "fico_8" | "fico_9" | "vantage_3" | "vantage_4" | "other";

interface CreditScore {
  id: string;
  bureau: CreditBureau;
  score_type: ScoreType;
  score: number;
  score_date: string | null;
}

interface CreditAccount {
  id: string;
  bureau: CreditBureau;
  account_name: string;
  account_number_masked: string | null;
  creditor_name: string | null;
  status: string;
  date_opened: string | null;
  date_updated: string | null;
  date_closed: string | null;
  credit_limit_cents: number | null;
  high_balance_cents: number | null;
  balance_cents: number | null;
  monthly_payment_cents: number | null;
  account_type: string;
  loan_type: string;
  responsibility: string;
  terms: string | null;
  payment_status: string | null;
}

interface CreditInquiry {
  id: string;
  bureau: CreditBureau;
  company_name: string;
  inquiry_date: string;
  inquiry_type: string | null;
  snapshot_id: string | null;
  last_seen_snapshot_id: string | null;
}

interface WalletCard {
  id: string;
  card_id: string;
  custom_name: string | null;
  approval_date: string | null;
  statement_close_day: number | null;
  cards: {
    name: string;
    issuers: { name: string } | null;
  } | null;
}

interface LinkedAccount {
  wallet_card_id: string | null;
  current_balance: number | null;
  credit_limit: number | null;
}

interface AccountWalletLink {
  credit_account_id: string;
  wallet_card_id: string | null;
  display_name: string | null;
}

interface InquiryGroup {
  id: string;
  group_name: string | null;
  related_card_id: string | null;
  related_note: string | null;
  credit_inquiry_group_members: { inquiry_id: string }[];
}

export default async function CreditReportPage() {
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

  // Fetch all credit report data in parallel
  const [
    scoresResult,
    accountsResult,
    inquiriesResult,
    walletResult,
    linkedAccountsResult,
    accountLinksResult,
    inquiryGroupsResult,
  ] = await Promise.all([
    // All credit scores (historical)
    supabase
      .from("credit_scores")
      .select("id, bureau, score_type, score, score_date")
      .eq("user_id", effectiveUserId)
      .order("score_date", { ascending: true }),

    // Latest accounts from each bureau (get from most recent snapshot per bureau)
    supabase
      .from("credit_accounts")
      .select(`
        id, bureau, account_name, account_number_masked, creditor_name,
        status, date_opened, date_updated, date_closed,
        credit_limit_cents, high_balance_cents, balance_cents, monthly_payment_cents,
        account_type, loan_type, responsibility, terms, payment_status,
        snapshot_id,
        credit_report_snapshots!inner(fetched_at)
      `)
      .eq("user_id", effectiveUserId)
      .order("credit_report_snapshots(fetched_at)", { ascending: false }),

    // All inquiries (with last_seen tracking)
    supabase
      .from("credit_inquiries")
      .select("id, bureau, company_name, inquiry_date, inquiry_type, snapshot_id, last_seen_snapshot_id")
      .eq("user_id", effectiveUserId)
      .order("inquiry_date", { ascending: false }),

    // User's wallet cards
    supabase
      .from("user_wallets")
      .select(`
        id, card_id, custom_name, approval_date, statement_close_day,
        cards:card_id (name, issuers:issuer_id (name))
      `)
      .eq("user_id", effectiveUserId)
      .is("closed_date", null),

    // Linked accounts for Plaid data
    supabase
      .from("user_linked_accounts")
      .select("wallet_card_id, current_balance, credit_limit")
      .eq("user_id", effectiveUserId),

    // Account-wallet links (with display names)
    supabase
      .from("credit_account_wallet_links")
      .select("credit_account_id, wallet_card_id, display_name")
      .eq("user_id", effectiveUserId),

    // Inquiry groups with members
    supabase
      .from("credit_inquiry_groups")
      .select(`
        id, group_name, related_card_id, related_note,
        credit_inquiry_group_members(inquiry_id)
      `)
      .eq("user_id", effectiveUserId),
  ]);

  const scores = (scoresResult.data ?? []) as CreditScore[];
  const allAccounts = (accountsResult.data ?? []) as (CreditAccount & { snapshot_id: string })[];
  const inquiries = (inquiriesResult.data ?? []) as CreditInquiry[];
  const walletCards = (walletResult.data ?? []) as unknown as WalletCard[];
  const linkedAccounts = (linkedAccountsResult.data ?? []) as LinkedAccount[];
  const accountLinks = (accountLinksResult.data ?? []) as AccountWalletLink[];
  const inquiryGroups = (inquiryGroupsResult.data ?? []) as unknown as InquiryGroup[];

  // Deduplicate accounts - keep only from the latest snapshot per bureau
  const latestSnapshotByBureau = new Map<CreditBureau, string>();
  allAccounts.forEach((account) => {
    if (!latestSnapshotByBureau.has(account.bureau)) {
      latestSnapshotByBureau.set(account.bureau, account.snapshot_id);
    }
  });

  const accounts = allAccounts.filter(
    (account) => latestSnapshotByBureau.get(account.bureau) === account.snapshot_id
  );

  // Build linked accounts map
  const linkedAccountsMap = new Map<string, LinkedAccount>();
  linkedAccounts.forEach((la) => {
    if (la.wallet_card_id) {
      linkedAccountsMap.set(la.wallet_card_id, la);
    }
  });

  // Build account links map
  const accountLinksMap = new Map<string, string | null>();
  const displayNamesMap = new Map<string, string>();
  accountLinks.forEach((link) => {
    accountLinksMap.set(link.credit_account_id, link.wallet_card_id);
    if (link.display_name) {
      displayNamesMap.set(link.credit_account_id, link.display_name);
    }
  });

  // Build inquiry groups map (inquiry_id -> group_id)
  const inquiryToGroupMap = new Map<string, string>();
  const groupNamesMap = new Map<string, string | null>();
  const groupDataMap = new Map<string, { groupId: string; relatedCardId: string | null; relatedNote: string | null }>();
  inquiryGroups.forEach((group) => {
    groupNamesMap.set(group.id, group.group_name);
    groupDataMap.set(group.id, {
      groupId: group.id,
      relatedCardId: group.related_card_id,
      relatedNote: group.related_note,
    });
    const members = group.credit_inquiry_group_members;
    members?.forEach((member) => {
      inquiryToGroupMap.set(member.inquiry_id, group.id);
    });
  });

  // Get latest scores per bureau and score type
  const latestScores = new Map<string, CreditScore>();
  scores.forEach((score) => {
    const key = `${score.bureau}-${score.score_type}`;
    const existing = latestScores.get(key);
    if (!existing || (score.score_date && existing.score_date && score.score_date > existing.score_date)) {
      latestScores.set(key, score);
    }
  });

  // Server actions for mutations
  async function linkAccountToWallet(creditAccountId: string, walletCardId: string | null) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { getEffectiveUserId } = await import("@/lib/emulation");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    if (walletCardId) {
      await supabase.from("credit_account_wallet_links").upsert(
        {
          user_id: userId,
          credit_account_id: creditAccountId,
          wallet_card_id: walletCardId,
        },
        { onConflict: "user_id,credit_account_id" }
      );
    } else {
      await supabase
        .from("credit_account_wallet_links")
        .delete()
        .eq("user_id", userId)
        .eq("credit_account_id", creditAccountId);
    }

    revalidatePath("/credit-report");
  }

  async function setDisplayName(creditAccountId: string, displayName: string | null) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { getEffectiveUserId } = await import("@/lib/emulation");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    // Upsert the link with display name (even if no wallet card)
    await supabase.from("credit_account_wallet_links").upsert(
      {
        user_id: userId,
        credit_account_id: creditAccountId,
        display_name: displayName,
      },
      { onConflict: "user_id,credit_account_id" }
    );

    revalidatePath("/credit-report");
  }

  async function createInquiryGroup(inquiryIds: string[], groupName: string | null) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { getEffectiveUserId } = await import("@/lib/emulation");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("createInquiryGroup: No user ID");
      return;
    }

    console.log("createInquiryGroup: Creating group with inquiryIds:", inquiryIds);

    // Check if any of these inquiries are in existing groups with related app data
    // We'll preserve the first one we find
    let preservedRelatedCardId: string | null = null;
    let preservedRelatedNote: string | null = null;
    
    const { data: existingMemberships } = await supabase
      .from("credit_inquiry_group_members")
      .select("group_id")
      .in("inquiry_id", inquiryIds);
    
    if (existingMemberships && existingMemberships.length > 0) {
      const existingGroupIds = [...new Set(existingMemberships.map(m => m.group_id))];
      
      // Get the group data for these groups
      const { data: existingGroups } = await supabase
        .from("credit_inquiry_groups")
        .select("id, related_card_id, related_note")
        .in("id", existingGroupIds);
      
      // Find the first group with related app data
      if (existingGroups) {
        for (const g of existingGroups) {
          if (g.related_card_id || g.related_note) {
            preservedRelatedCardId = g.related_card_id;
            preservedRelatedNote = g.related_note;
            console.log("createInquiryGroup: Preserving related app from group", g.id);
            break;
          }
        }
      }
    }

    // Remove existing group memberships for these inquiries
    const groupIdsToCheck = existingMemberships?.map(m => m.group_id) || [];
    
    for (const inquiryId of inquiryIds) {
      await supabase
        .from("credit_inquiry_group_members")
        .delete()
        .eq("inquiry_id", inquiryId);
    }
    
    // Clean up any orphaned groups (groups with no remaining members)
    for (const oldGroupId of [...new Set(groupIdsToCheck)]) {
      const { data: remainingMembers } = await supabase
        .from("credit_inquiry_group_members")
        .select("id")
        .eq("group_id", oldGroupId)
        .limit(1);
      
      if (!remainingMembers || remainingMembers.length === 0) {
        await supabase
          .from("credit_inquiry_groups")
          .delete()
          .eq("id", oldGroupId);
        console.log("createInquiryGroup: Deleted orphaned group", oldGroupId);
      }
    }

    // Create the group with preserved related app data
    const { data: group, error: groupError } = await supabase
      .from("credit_inquiry_groups")
      .insert({ 
        user_id: userId, 
        group_name: groupName,
        related_card_id: preservedRelatedCardId,
        related_note: preservedRelatedNote
      })
      .select("id")
      .single();

    if (groupError || !group) {
      console.error("createInquiryGroup: Failed to create group", groupError);
      return;
    }

    console.log("createInquiryGroup: Created group", group.id);

    // Add members
    const members = inquiryIds.map((inquiryId) => ({
      group_id: group.id,
      inquiry_id: inquiryId,
    }));

    const { error: membersError } = await supabase.from("credit_inquiry_group_members").insert(members);
    
    if (membersError) {
      console.error("createInquiryGroup: Failed to add members", membersError);
      return;
    }

    console.log("createInquiryGroup: Added members successfully");
    revalidatePath("/credit-report");
  }

  async function addToInquiryGroup(groupId: string, inquiryId: string) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();

    await supabase.from("credit_inquiry_group_members").insert({
      group_id: groupId,
      inquiry_id: inquiryId,
    });

    revalidatePath("/credit-report");
  }

  async function removeFromInquiryGroup(inquiryId: string) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();

    // First get the group_id before deleting
    const { data: membership } = await supabase
      .from("credit_inquiry_group_members")
      .select("group_id")
      .eq("inquiry_id", inquiryId)
      .single();
    
    const groupId = membership?.group_id;

    await supabase
      .from("credit_inquiry_group_members")
      .delete()
      .eq("inquiry_id", inquiryId);

    // Clean up orphaned group if it has no remaining members
    if (groupId) {
      const { data: remainingMembers } = await supabase
        .from("credit_inquiry_group_members")
        .select("id")
        .eq("group_id", groupId)
        .limit(1);
      
      if (!remainingMembers || remainingMembers.length === 0) {
        await supabase
          .from("credit_inquiry_groups")
          .delete()
          .eq("id", groupId);
        console.log("removeFromInquiryGroup: Deleted orphaned group", groupId);
      }
    }

    revalidatePath("/credit-report");
  }

  async function updateGroupName(groupId: string, groupName: string | null) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();

    await supabase
      .from("credit_inquiry_groups")
      .update({ group_name: groupName })
      .eq("id", groupId);

    revalidatePath("/credit-report");
  }

  async function updateRelatedApplication(groupId: string, cardId: string | null, note: string | null) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();

    await supabase
      .from("credit_inquiry_groups")
      .update({ 
        related_card_id: cardId,
        related_note: note
      })
      .eq("id", groupId);

    revalidatePath("/credit-report");
  }

  async function createGroupWithRelatedApp(inquiryIds: string[], cardId: string | null, note: string | null) {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { getEffectiveUserId } = await import("@/lib/emulation");
    const { revalidatePath } = await import("next/cache");
    
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) {
      console.error("createGroupWithRelatedApp: No user ID");
      return;
    }

    // Remove any existing group memberships for these inquiries
    for (const inquiryId of inquiryIds) {
      await supabase
        .from("credit_inquiry_group_members")
        .delete()
        .eq("inquiry_id", inquiryId);
    }

    // Create the group with the related app info
    const { data: group, error: groupError } = await supabase
      .from("credit_inquiry_groups")
      .insert({ 
        user_id: userId, 
        group_name: null,
        related_card_id: cardId,
        related_note: note
      })
      .select("id")
      .single();

    if (groupError || !group) {
      console.error("createGroupWithRelatedApp: Failed to create group", groupError);
      return;
    }

    // Add members
    const members = inquiryIds.map((inquiryId) => ({
      group_id: group.id,
      inquiry_id: inquiryId,
    }));

    await supabase.from("credit_inquiry_group_members").insert(members);

    revalidatePath("/credit-report");
  }

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Group accounts across bureaus to get unique account counts
  const accountGroups = groupAccountsAcrossBureaus(accounts as unknown as MatchingCreditAccount[]);
  const uniqueOpenAccounts = accountGroups.filter((g) => g.status === "open");
  const uniqueClosedAccounts = accountGroups.filter((g) => g.status === "closed");

  // Calculate credit insights using unique grouped accounts (open revolving accounts only)
  // For utilization, we need the best balance/limit per unique account
  let totalCreditLimit = 0;
  let totalBalance = 0;
  
  for (const group of uniqueOpenAccounts) {
    // Find the best account data for this group (prefer one with credit_limit)
    const revolvingAccounts = group.accounts.filter(
      (a) => a.account_type === "revolving"
    );
    
    if (revolvingAccounts.length === 0) continue;
    
    // Get max credit limit and most recent balance from any bureau
    let groupLimit = 0;
    let groupBalance = 0;
    
    for (const account of revolvingAccounts) {
      if (account.credit_limit_cents && account.credit_limit_cents > groupLimit) {
        groupLimit = account.credit_limit_cents;
      }
      // Use the balance from the account with the most recent date_updated
      if (account.balance_cents !== null) {
        groupBalance = account.balance_cents;
      }
    }
    
    totalCreditLimit += groupLimit;
    totalBalance += groupBalance;
  }

  const utilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

  // Calculate average account age using unique accounts
  const now = new Date();
  const openGroupsWithDate = uniqueOpenAccounts.filter((g) => g.dateOpened);
  const totalAgeMonths = openGroupsWithDate.reduce((sum, g) => {
    if (!g.dateOpened) return sum;
    const opened = new Date(g.dateOpened);
    const months = (now.getFullYear() - opened.getFullYear()) * 12 + (now.getMonth() - opened.getMonth());
    return sum + months;
  }, 0);
  const avgAgeMonths = openGroupsWithDate.length > 0 ? totalAgeMonths / openGroupsWithDate.length : 0;

  // Find oldest account from unique groups
  const oldestGroup = uniqueOpenAccounts.reduce<typeof accountGroups[0] | null>((oldest, group) => {
    if (!group.dateOpened) return oldest;
    if (!oldest || !oldest.dateOpened) return group;
    return new Date(group.dateOpened) < new Date(oldest.dateOpened) ? group : oldest;
  }, null);
  
  // Convert to CreditAccount format for CreditInsights
  const oldestAccount: CreditAccount | null = oldestGroup
    ? {
        id: oldestGroup.id,
        bureau: oldestGroup.accounts[0]?.bureau ?? "equifax",
        account_name: oldestGroup.displayName,
        account_number_masked: null,
        creditor_name: oldestGroup.displayName,
        status: oldestGroup.status,
        date_opened: oldestGroup.dateOpened,
        date_updated: null,
        date_closed: null,
        credit_limit_cents: null,
        high_balance_cents: null,
        balance_cents: null,
        monthly_payment_cents: null,
        account_type: oldestGroup.loanType,
        loan_type: oldestGroup.loanType,
        responsibility: "individual",
        terms: null,
        payment_status: null,
      }
    : null;

  // Count unique accounts
  const closedAccountCount = uniqueClosedAccounts.length;
  const openAccountCount = uniqueOpenAccounts.length;

  // Calculate active inquiries by bureau
  // An inquiry is "active" if last_seen_snapshot_id matches the latest snapshot for that bureau
  const activeInquiryCounts = {
    equifax: 0,
    experian: 0,
    transunion: 0,
  };
  
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  // Get latest snapshot ID per bureau
  const latestSnapshotIds = new Map<string, string>();
  accounts.forEach((account) => {
    if (!latestSnapshotIds.has(account.bureau)) {
      latestSnapshotIds.set(account.bureau, (account as unknown as { snapshot_id: string }).snapshot_id);
    }
  });

  // Filter to recent inquiries and count active ones per bureau
  const recentInquiries = inquiries.filter(
    (i) => new Date(i.inquiry_date) >= twoYearsAgo
  );
  
  // Count active inquiries per bureau (those still on the report)
  recentInquiries.forEach((inquiry) => {
    const inq = inquiry as unknown as { last_seen_snapshot_id?: string };
    const latestForBureau = latestSnapshotIds.get(inquiry.bureau);
    // If last_seen matches latest snapshot OR we don't have tracking yet, count as active
    if (!latestForBureau || inq.last_seen_snapshot_id === latestForBureau || !inq.last_seen_snapshot_id) {
      activeInquiryCounts[inquiry.bureau]++;
    }
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Credit Report</h1>
          <p className="text-zinc-400 mt-1">
            Monitor your credit scores and account data across all bureaus
          </p>
        </div>

        {/* Credit Insights Row */}
        <div className="mb-8">
          <CreditInsights
            utilization={utilization}
            totalBalance={totalBalance}
            totalCreditLimit={totalCreditLimit}
            avgAgeMonths={avgAgeMonths}
            oldestAccount={oldestAccount}
            activeInquiryCounts={activeInquiryCounts}
            openAccountCount={openAccountCount}
            closedAccountCount={closedAccountCount}
          />
        </div>

        {/* Score Section */}
        <div className="mb-8">
          <ScoreChart
            scores={scores}
            latestScores={Object.fromEntries(latestScores)}
          />
        </div>

        {/* Accounts Table */}
        <div id="accounts-section" className="mb-8 scroll-mt-8">
          <AccountsTable
            accounts={accounts}
            walletCards={walletCards.map((wc) => {
              const linkedAccount = linkedAccountsMap.get(wc.id);
              return {
                id: wc.id,
                name: wc.custom_name ?? wc.cards?.name ?? "Unknown",
                issuer_name: wc.cards?.issuers?.name ?? null,
                approval_date: wc.approval_date,
                credit_limit_cents: linkedAccount?.credit_limit ? linkedAccount.credit_limit * 100 : null,
              };
            })}
            accountLinks={accountLinksMap}
            displayNames={displayNamesMap}
            onLinkAccount={linkAccountToWallet}
            onSetDisplayName={setDisplayName}
          />
        </div>

        {/* Hard Inquiries Section */}
        <div id="inquiries-section" className="mb-8 scroll-mt-8">
          <InquiriesTable
            inquiries={recentInquiries}
            latestSnapshotIds={latestSnapshotIds}
            inquiryToGroupMap={inquiryToGroupMap}
            groupNamesMap={groupNamesMap}
            groupDataMap={groupDataMap}
            walletCards={walletCards.map((wc) => ({
              id: wc.id,
              name: wc.custom_name || wc.cards?.name || "Unknown Card",
              issuer_name: wc.cards?.issuers?.name || null,
            }))}
            onCreateGroup={createInquiryGroup}
            onAddToGroup={addToInquiryGroup}
            onRemoveFromGroup={removeFromInquiryGroup}
            onUpdateGroupName={updateGroupName}
            onUpdateRelatedApplication={updateRelatedApplication}
            onCreateGroupWithRelatedApp={createGroupWithRelatedApp}
          />
        </div>

        {/* Matching Debug - Admin Only */}
        {isAdmin && (
          <div className="mb-8">
            <MatchingDebug accounts={accounts} />
          </div>
        )}
      </div>
    </div>
  );
}
