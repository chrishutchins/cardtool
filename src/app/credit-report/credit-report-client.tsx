"use client";

import { useState, useMemo } from "react";
import { ScoreChart } from "./score-chart";
import { AccountsTable } from "./accounts-table";
import { InquiriesTable } from "./inquiries-table";
import { CreditInsights } from "./credit-insights";
import { MatchingDebug } from "./matching-debug";
import { groupAccountsAcrossBureaus, type CreditAccount as MatchingCreditAccount } from "./account-matching";

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
  snapshot_id: string;
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

interface WalletCardForTable {
  id: string;
  name: string;
  issuer_name: string | null;
  approval_date: string | null;
  credit_limit_cents: number | null;
}

interface WalletCardForInquiries {
  id: string;
  name: string;
  issuer_name: string | null;
}

interface CreditReportClientProps {
  scores: CreditScore[];
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  players: Player[];
  walletCardsForTable: WalletCardForTable[];
  walletCardsForInquiries: WalletCardForInquiries[];
  accountLinksMap: Map<string, string | null>;
  displayNamesMap: Map<string, string>;
  latestSnapshotIds: Map<string, string>;
  inquiryToGroupMap: Map<string, string>;
  groupNamesMap: Map<string, string | null>;
  groupDataMap: Map<string, { groupId: string; relatedCardId: string | null; relatedNote: string | null }>;
  isAdmin: boolean;
  onLinkAccount: (creditAccountId: string, walletCardId: string | null) => Promise<void>;
  onSetDisplayName: (creditAccountId: string, displayName: string | null) => Promise<void>;
  onCreateGroup: (inquiryIds: string[], groupName: string | null) => Promise<void>;
  onAddToGroup: (groupId: string, inquiryId: string) => Promise<void>;
  onRemoveFromGroup: (inquiryId: string) => Promise<void>;
  onUpdateGroupName: (groupId: string, groupName: string | null) => Promise<void>;
  onUpdateRelatedApplication: (groupId: string, cardId: string | null, note: string | null) => Promise<void>;
  onCreateGroupWithRelatedApp: (inquiryIds: string[], cardId: string | null, note: string | null) => Promise<void>;
}

export function CreditReportClient({
  scores,
  accounts,
  inquiries,
  players,
  walletCardsForTable,
  walletCardsForInquiries,
  accountLinksMap,
  displayNamesMap,
  latestSnapshotIds,
  inquiryToGroupMap,
  groupNamesMap,
  groupDataMap,
  isAdmin,
  onLinkAccount,
  onSetDisplayName,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onUpdateGroupName,
  onUpdateRelatedApplication,
  onCreateGroupWithRelatedApp,
}: CreditReportClientProps) {
  // Default to player 1, or the first player in the list
  const defaultPlayer = players.find(p => p.player_number === 1)?.player_number ?? players[0]?.player_number ?? 1;
  const [playerFilter, setPlayerFilter] = useState<number>(defaultPlayer);

  const hasMultiplePlayers = players.length > 1;

  // Filter data by player
  const filteredScores = useMemo(() => {
    return scores.filter((s) => s.player_number === playerFilter);
  }, [scores, playerFilter]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => a.player_number === playerFilter);
  }, [accounts, playerFilter]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((i) => i.player_number === playerFilter);
  }, [inquiries, playerFilter]);

  // Get latest scores per bureau and score type (for filtered data)
  const latestScores = useMemo(() => {
    const latest = new Map<string, CreditScore>();
    filteredScores.forEach((score) => {
      const key = `${score.bureau}-${score.score_type}`;
      const existing = latest.get(key);
      if (!existing || (score.score_date && existing.score_date && score.score_date > existing.score_date)) {
        latest.set(key, score);
      }
    });
    return Object.fromEntries(latest);
  }, [filteredScores]);

  // Group accounts across bureaus to get unique account counts
  const accountGroups = useMemo(() => 
    groupAccountsAcrossBureaus(filteredAccounts as unknown as MatchingCreditAccount[]),
    [filteredAccounts]
  );

  const uniqueOpenAccounts = useMemo(() => 
    accountGroups.filter((g) => g.status === "open"),
    [accountGroups]
  );

  const uniqueClosedAccounts = useMemo(() => 
    accountGroups.filter((g) => g.status === "closed"),
    [accountGroups]
  );

  // Calculate credit insights using unique grouped accounts (open revolving accounts only)
  const { utilization, totalCreditLimit, totalBalance } = useMemo(() => {
    let limit = 0;
    let balance = 0;
    
    for (const group of uniqueOpenAccounts) {
      const revolvingAccounts = group.accounts.filter(
        (a) => a.account_type === "revolving"
      );
      
      if (revolvingAccounts.length === 0) continue;
      
      let groupLimit = 0;
      let groupBalance = 0;
      
      for (const account of revolvingAccounts) {
        if (account.credit_limit_cents && account.credit_limit_cents > groupLimit) {
          groupLimit = account.credit_limit_cents;
        }
        if (account.balance_cents !== null) {
          groupBalance = account.balance_cents;
        }
      }
      
      limit += groupLimit;
      balance += groupBalance;
    }
    
    return {
      totalCreditLimit: limit,
      totalBalance: balance,
      utilization: limit > 0 ? (balance / limit) * 100 : 0,
    };
  }, [uniqueOpenAccounts]);

  // Calculate average account age using unique accounts
  const avgAgeMonths = useMemo(() => {
    const now = new Date();
    const openGroupsWithDate = uniqueOpenAccounts.filter((g) => g.dateOpened);
    const totalAgeMonths = openGroupsWithDate.reduce((sum, g) => {
      if (!g.dateOpened) return sum;
      const opened = new Date(g.dateOpened);
      const months = (now.getFullYear() - opened.getFullYear()) * 12 + (now.getMonth() - opened.getMonth());
      return sum + months;
    }, 0);
    return openGroupsWithDate.length > 0 ? totalAgeMonths / openGroupsWithDate.length : 0;
  }, [uniqueOpenAccounts]);

  // Find oldest account from unique groups
  const oldestAccount = useMemo(() => {
    const oldestGroup = uniqueOpenAccounts.reduce<typeof accountGroups[0] | null>((oldest, group) => {
      if (!group.dateOpened) return oldest;
      if (!oldest || !oldest.dateOpened) return group;
      return new Date(group.dateOpened) < new Date(oldest.dateOpened) ? group : oldest;
    }, null);

    if (!oldestGroup) return null;

    return {
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
    };
  }, [uniqueOpenAccounts, accountGroups]);

  // Calculate active inquiries by bureau
  const activeInquiryCounts = useMemo(() => {
    const counts = {
      equifax: 0,
      experian: 0,
      transunion: 0,
    };

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const recentInquiries = filteredInquiries.filter(
      (i) => new Date(i.inquiry_date) >= twoYearsAgo
    );

    recentInquiries.forEach((inquiry) => {
      // Use bureau-player key to get the correct snapshot ID
      const latestForBureauAndPlayer = latestSnapshotIds.get(`${inquiry.bureau}-${inquiry.player_number}`);
      if (!latestForBureauAndPlayer || inquiry.last_seen_snapshot_id === latestForBureauAndPlayer || !inquiry.last_seen_snapshot_id) {
        counts[inquiry.bureau]++;
      }
    });

    return counts;
  }, [filteredInquiries, latestSnapshotIds]);

  // Filter recent inquiries for table
  const recentInquiries = useMemo(() => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return filteredInquiries.filter((i) => new Date(i.inquiry_date) >= twoYearsAgo);
  }, [filteredInquiries]);

  return (
    <>
      {/* Player Filter */}
      {hasMultiplePlayers && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-zinc-400">Player:</span>
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(parseInt(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {players.map((p) => (
              <option key={p.player_number} value={p.player_number}>
                {p.description || `Player ${p.player_number}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Credit Insights Row */}
      <div className="mb-8">
        <CreditInsights
          utilization={utilization}
          totalBalance={totalBalance}
          totalCreditLimit={totalCreditLimit}
          avgAgeMonths={avgAgeMonths}
          oldestAccount={oldestAccount}
          activeInquiryCounts={activeInquiryCounts}
          openAccountCount={uniqueOpenAccounts.length}
          closedAccountCount={uniqueClosedAccounts.length}
        />
      </div>

      {/* Score Section */}
      <div className="mb-8">
        <ScoreChart
          scores={filteredScores}
          latestScores={latestScores}
        />
      </div>

      {/* Accounts Table */}
      <div id="accounts-section" className="mb-8 scroll-mt-8">
        <AccountsTable
          accounts={filteredAccounts}
          walletCards={walletCardsForTable}
          accountLinks={accountLinksMap}
          displayNames={displayNamesMap}
          onLinkAccount={onLinkAccount}
          onSetDisplayName={onSetDisplayName}
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
          walletCards={walletCardsForInquiries}
          onCreateGroup={onCreateGroup}
          onAddToGroup={onAddToGroup}
          onRemoveFromGroup={onRemoveFromGroup}
          onUpdateGroupName={onUpdateGroupName}
          onUpdateRelatedApplication={onUpdateRelatedApplication}
          onCreateGroupWithRelatedApp={onCreateGroupWithRelatedApp}
        />
      </div>

      {/* Matching Debug - Admin Only */}
      {isAdmin && (
        <div className="mb-8">
          <MatchingDebug accounts={filteredAccounts} />
        </div>
      )}
    </>
  );
}
