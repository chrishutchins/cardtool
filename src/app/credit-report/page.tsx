import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { CreditReportClient } from "./credit-report-client";

export const metadata: Metadata = {
  title: "Credit Report | CardTool",
  description: "View your credit scores and report data",
};

type CreditBureau = "equifax" | "experian" | "transunion";
type ScoreType = 
  | "fico_8" | "fico_9" | "fico_2" | "fico_4" | "fico_5" | "fico_10" | "fico_10t"
  | "fico_auto_2" | "fico_auto_4" | "fico_auto_5" | "fico_auto_8" | "fico_auto_9" | "fico_auto_10"
  | "fico_bankcard_2" | "fico_bankcard_3" | "fico_bankcard_4" | "fico_bankcard_5" 
  | "fico_bankcard_8" | "fico_bankcard_9" | "fico_bankcard_10"
  | "vantage_3" | "vantage_4" | "other";

interface CreditScore {
  id: string;
  bureau: CreditBureau;
  score_type: ScoreType;
  score: number;
  score_date: string | null;
  player_number: number;
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
  player_number: number;
  // Direct bureau account number (when source is myFICO, this holds the direct bureau's version)
  direct_account_number_masked?: string | null;
}

interface CreditInquiry {
  id: string;
  bureau: CreditBureau;
  company_name: string;
  inquiry_date: string;
  inquiry_type: string | null;
  snapshot_id: string | null;
  last_seen_snapshot_id: string | null;
  player_number: number;
}

interface Player {
  player_number: number;
  description: string | null;
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
    playersResult,
    directSnapshotsResult,
  ] = await Promise.all([
    // All credit scores (historical) - order descending to ensure newest within limit
    // Limit increased to 5000 to accommodate users with extensive score history
    supabase
      .from("credit_scores")
      .select("id, bureau, score_type, score, score_date, player_number")
      .eq("user_id", effectiveUserId)
      .order("score_date", { ascending: false })
      .limit(5000),

    // Latest accounts from each bureau (get from most recent snapshot per bureau)
    // Include source to distinguish direct bureau data from myFICO
    supabase
      .from("credit_accounts")
      .select(`
        id, bureau, account_name, account_number_masked, creditor_name,
        status, date_opened, date_updated, date_closed,
        credit_limit_cents, high_balance_cents, balance_cents, monthly_payment_cents,
        account_type, loan_type, responsibility, terms, payment_status,
        snapshot_id, player_number,
        credit_report_snapshots!inner(fetched_at, source)
      `)
      .eq("user_id", effectiveUserId)
      .order("credit_report_snapshots(fetched_at)", { ascending: false }),

    // All inquiries (with last_seen tracking)
    supabase
      .from("credit_inquiries")
      .select("id, bureau, company_name, inquiry_date, inquiry_type, snapshot_id, last_seen_snapshot_id, player_number")
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

    // User's player configurations
    supabase
      .from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId)
      .order("player_number"),

    // Latest DIRECT bureau snapshots (excluding myFICO) for inquiry dropped tracking
    // myFICO doesn't import inquiries, so we shouldn't compare against myFICO snapshots
    supabase
      .from("credit_report_snapshots")
      .select("id, bureau, player_number, fetched_at, source")
      .eq("user_id", effectiveUserId)
      .neq("source", "myfico")
      .order("fetched_at", { ascending: false }),
  ]);

  const scores = (scoresResult.data ?? []) as CreditScore[];
  const allAccounts = (accountsResult.data ?? []) as (CreditAccount & { 
    snapshot_id: string;
    credit_report_snapshots: { fetched_at: string; source: string | null };
  })[];
  const inquiries = (inquiriesResult.data ?? []) as CreditInquiry[];
  const walletCards = (walletResult.data ?? []) as unknown as WalletCard[];
  const linkedAccounts = (linkedAccountsResult.data ?? []) as LinkedAccount[];
  const accountLinks = (accountLinksResult.data ?? []) as AccountWalletLink[];
  const inquiryGroups = (inquiryGroupsResult.data ?? []) as unknown as InquiryGroup[];
  const players = (playersResult.data ?? []) as Player[];

  // Deduplicate accounts - keep only from the latest snapshot per bureau PER PLAYER
  // Ordered by fetched_at DESC, so first occurrence is the most recently synced
  const latestSnapshotByBureauAndPlayer = new Map<string, string>();
  allAccounts.forEach((account) => {
    const key = `${account.bureau}-${account.player_number}`;
    if (!latestSnapshotByBureauAndPlayer.has(key)) {
      latestSnapshotByBureauAndPlayer.set(key, account.snapshot_id);
    }
  });

  const latestAccounts = allAccounts.filter((account) => {
    const key = `${account.bureau}-${account.player_number}`;
    return latestSnapshotByBureauAndPlayer.get(key) === account.snapshot_id;
  });

  // Build map of direct bureau account data (non-myFICO) for enrichment
  // Key: bureau-player-dateOpened-creditorName (normalized)
  // This allows us to carry over account numbers AND wallet links from direct bureau accounts to myFICO accounts
  const directBureauAccountNumbers = new Map<string, string>();
  const directBureauAccountIds = new Map<string, string>(); // Maps matching key -> direct bureau account ID
  
  allAccounts.forEach((account) => {
    const source = account.credit_report_snapshots?.source;
    // Only consider non-myFICO sources
    if (source === "myfico" || !source) return;
    
    // Create a key that can match across sources
    const creditorKey = (account.creditor_name || account.account_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `${account.bureau}-${account.player_number}-${account.date_opened || ""}-${creditorKey}`;
    
    // Store the direct bureau account ID for link inheritance
    if (!directBureauAccountIds.has(key)) {
      directBureauAccountIds.set(key, account.id);
    }
    
    // Keep the account number with more digits visible (less masking)
    if (account.account_number_masked) {
      const existing = directBureauAccountNumbers.get(key);
      if (!existing || (account.account_number_masked.replace(/[X*]/gi, "").length > existing.replace(/[X*]/gi, "").length)) {
        directBureauAccountNumbers.set(key, account.account_number_masked);
      }
    }
  });

  // Enrich accounts with direct bureau data when source is myFICO
  // This includes: account numbers (less masked) and the direct bureau account ID (for link inheritance)
  const myFicoToDirectIdMap = new Map<string, string>(); // myFICO account ID -> direct bureau account ID
  
  const accounts = latestAccounts.map((account) => {
    const source = account.credit_report_snapshots?.source;
    
    if (source === "myfico") {
      // Look up corresponding direct bureau account
      const creditorKey = (account.creditor_name || account.account_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = `${account.bureau}-${account.player_number}-${account.date_opened || ""}-${creditorKey}`;
      const directNumber = directBureauAccountNumbers.get(key);
      const directId = directBureauAccountIds.get(key);
      
      // Store mapping for link inheritance
      if (directId) {
        myFicoToDirectIdMap.set(account.id, directId);
      }
      
      if (directNumber) {
        return { ...account, direct_account_number_masked: directNumber };
      }
    }
    
    return account;
  });

  // Build linked accounts map
  const linkedAccountsMap = new Map<string, LinkedAccount>();
  linkedAccounts.forEach((la) => {
    if (la.wallet_card_id) {
      linkedAccountsMap.set(la.wallet_card_id, la);
    }
  });

  // Build account links map
  // Also inherit links from direct bureau accounts to their corresponding myFICO accounts
  const accountLinksMap = new Map<string, string | null>();
  const displayNamesMap = new Map<string, string>();
  accountLinks.forEach((link) => {
    accountLinksMap.set(link.credit_account_id, link.wallet_card_id);
    if (link.display_name) {
      displayNamesMap.set(link.credit_account_id, link.display_name);
    }
  });
  
  // Inherit links from direct bureau accounts to myFICO accounts
  // This ensures links persist when myFICO becomes the latest data source
  myFicoToDirectIdMap.forEach((directId, myFicoId) => {
    // If there's a link for the direct bureau account, inherit it for the myFICO account
    if (accountLinksMap.has(directId) && !accountLinksMap.has(myFicoId)) {
      accountLinksMap.set(myFicoId, accountLinksMap.get(directId)!);
    }
    // Also inherit display names
    if (displayNamesMap.has(directId) && !displayNamesMap.has(myFicoId)) {
      displayNamesMap.set(myFicoId, displayNamesMap.get(directId)!);
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
  
  // Get latest DIRECT bureau snapshot ID per bureau per player (for inquiry tracking)
  // We use direct bureau snapshots only (not myFICO) because myFICO doesn't import inquiries
  // If we compared against myFICO snapshots, all inquiries would appear "dropped"
  const directSnapshots = (directSnapshotsResult.data ?? []) as {
    id: string;
    bureau: CreditBureau;
    player_number: number;
    fetched_at: string;
    source: string | null;
  }[];
  
  const latestSnapshotIds = new Map<string, string>();
  directSnapshots.forEach((snapshot) => {
    const key = `${snapshot.bureau}-${snapshot.player_number}`;
    // Only set if not already present (results are ordered by fetched_at DESC)
    if (!latestSnapshotIds.has(key)) {
      latestSnapshotIds.set(key, snapshot.id);
    }
  });

  // Prepare wallet cards data for the client
  const walletCardsForTable = walletCards.map((wc) => {
    const linkedAccount = linkedAccountsMap.get(wc.id);
    return {
      id: wc.id,
      name: wc.custom_name ?? wc.cards?.name ?? "Unknown",
      issuer_name: wc.cards?.issuers?.name ?? null,
      approval_date: wc.approval_date,
      credit_limit_cents: linkedAccount?.credit_limit ? linkedAccount.credit_limit * 100 : null,
    };
  });

  const walletCardsForInquiries = walletCards.map((wc) => ({
    id: wc.id,
    name: wc.custom_name || wc.cards?.name || "Unknown Card",
    issuer_name: wc.cards?.issuers?.name || null,
  }));

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

        <CreditReportClient
            scores={scores}
          accounts={accounts as (CreditAccount & { snapshot_id: string })[]}
          inquiries={inquiries}
          players={players}
          walletCardsForTable={walletCardsForTable}
          walletCardsForInquiries={walletCardsForInquiries}
          accountLinksMap={accountLinksMap}
          displayNamesMap={displayNamesMap}
            latestSnapshotIds={latestSnapshotIds}
            inquiryToGroupMap={inquiryToGroupMap}
            groupNamesMap={groupNamesMap}
            groupDataMap={groupDataMap}
          isAdmin={isAdmin}
          onLinkAccount={linkAccountToWallet}
          onSetDisplayName={setDisplayName}
            onCreateGroup={createInquiryGroup}
            onAddToGroup={addToInquiryGroup}
            onRemoveFromGroup={removeFromInquiryGroup}
            onUpdateGroupName={updateGroupName}
            onUpdateRelatedApplication={updateRelatedApplication}
            onCreateGroupWithRelatedApp={createGroupWithRelatedApp}
          />
      </div>
    </div>
  );
}
