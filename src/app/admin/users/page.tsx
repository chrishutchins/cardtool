/**
 * Admin Users Page
 * 
 * NOTE: This uses the service role Supabase client which BYPASSES RLS.
 * Auth is enforced via Clerk (admin check in layout.tsx), not Supabase RLS policies.
 * See ARCHITECTURE.md for the full authentication model.
 */
import { createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClerkClient } from "@clerk/backend";
import { UsersTable } from "./users-table";
import { startEmulation } from "@/lib/emulation";

// Always use Clerk Prod for admin user list
// In dev, CLERK_SECRET_KEY might be the dev key, so check for explicit prod key first
function getProdClerkClient() {
  const prodKey = process.env.CLERK_SECRET_KEY_PROD || process.env.CLERK_SECRET_KEY;
  return createClerkClient({ secretKey: prodKey });
}

interface UserStats {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  cardsAdded: number;
  spendingEdits: number;
  createdAt: string | null;
  accountLinkingEnabled: boolean;
}

export default async function UsersPage() {
  const supabase = createServiceRoleClient();
  const prodClerk = getProdClerkClient();

  // Fetch all users from Clerk Prod first (source of truth)
  const clerkUsers = await prodClerk.users.getUserList({ limit: 500 });

  // Fetch ALL database stats (don't filter by Clerk IDs - data may have different user IDs)
  const [walletResult, spendingResult, featureFlagsResult] = await Promise.all([
    supabase.from("user_wallets").select("user_id, added_at"),
    supabase.from("user_category_spend").select("user_id, created_at"),
    supabase.from("user_feature_flags").select("user_id, account_linking_enabled"),
  ]);

  // Build feature flags map
  const accountLinkingByUser: Record<string, boolean> = {};
  for (const flag of featureFlagsResult.data ?? []) {
    accountLinkingByUser[flag.user_id] = flag.account_linking_enabled ?? false;
  }

  // Count cards per user
  const cardsByUser: Record<string, number> = {};
  const earliestWalletDate: Record<string, string> = {};
  for (const wallet of walletResult.data ?? []) {
    cardsByUser[wallet.user_id] = (cardsByUser[wallet.user_id] ?? 0) + 1;
    if (!earliestWalletDate[wallet.user_id] || (wallet.added_at && wallet.added_at < earliestWalletDate[wallet.user_id])) {
      earliestWalletDate[wallet.user_id] = wallet.added_at ?? "";
    }
  }

  // Count spending edits per user
  const spendingByUser: Record<string, number> = {};
  const earliestSpendingDate: Record<string, string> = {};
  for (const spend of spendingResult.data ?? []) {
    spendingByUser[spend.user_id] = (spendingByUser[spend.user_id] ?? 0) + 1;
    if (!earliestSpendingDate[spend.user_id] || (spend.created_at && spend.created_at < earliestSpendingDate[spend.user_id])) {
      earliestSpendingDate[spend.user_id] = spend.created_at ?? "";
    }
  }

  // Build a map of Clerk users for lookup
  const clerkUserMap = new Map(clerkUsers.data.map((u) => [u.id, u]));

  // Collect all unique user IDs from both Clerk and database
  const allUserIds = new Set<string>();
  clerkUsers.data.forEach((u) => allUserIds.add(u.id));
  Object.keys(cardsByUser).forEach((id) => allUserIds.add(id));
  Object.keys(spendingByUser).forEach((id) => allUserIds.add(id));

  // Build user stats from all sources
  const users: UserStats[] = Array.from(allUserIds).map((userId) => {
    const clerkUser = clerkUserMap.get(userId);
    const walletDate = earliestWalletDate[userId];
    const spendDate = earliestSpendingDate[userId];
    let createdAt: string | null = null;
    if (walletDate && spendDate) {
      createdAt = walletDate < spendDate ? walletDate : spendDate;
    } else {
      createdAt = walletDate ?? spendDate ?? null;
    }

    return {
      userId,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? null,
      firstName: clerkUser?.firstName ?? null,
      lastName: clerkUser?.lastName ?? null,
      cardsAdded: cardsByUser[userId] ?? 0,
      spendingEdits: spendingByUser[userId] ?? 0,
      createdAt: createdAt ?? (clerkUser ? new Date(clerkUser.createdAt).toISOString() : null),
      accountLinkingEnabled: accountLinkingByUser[userId] ?? false,
    };
  });

  // Sort by most recent first (using Clerk createdAt as fallback)
  users.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  async function deleteUser(userId: string) {
    "use server";
    const supabase = createServiceRoleClient();

    // Delete all user data from all tables
    // First delete linked accounts (has FK to plaid_items)
    await supabase.from("user_linked_accounts").delete().eq("user_id", userId);
    // Then delete plaid items
    await supabase.from("user_plaid_items").delete().eq("user_id", userId);
    
    // Delete remaining user data
    await Promise.all([
      supabase.from("user_wallets").delete().eq("user_id", userId),
      supabase.from("user_category_spend").delete().eq("user_id", userId),
      supabase.from("user_currency_values").delete().eq("user_id", userId),
      supabase.from("user_point_value_settings").delete().eq("user_id", userId),
      supabase.from("user_mobile_pay_categories").delete().eq("user_id", userId),
      supabase.from("user_paypal_categories").delete().eq("user_id", userId),
      supabase.from("user_large_purchase_categories").delete().eq("user_id", userId),
      supabase.from("user_travel_booking_preferences").delete().eq("user_id", userId),
      supabase.from("user_multiplier_tiers").delete().eq("user_id", userId),
      supabase.from("user_feature_flags").delete().eq("user_id", userId),
      supabase.from("user_card_debit_pay").delete().eq("user_id", userId),
      supabase.from("user_compare_categories").delete().eq("user_id", userId),
      supabase.from("user_compare_evaluation_cards").delete().eq("user_id", userId),
      supabase.from("user_card_perks_values").delete().eq("user_id", userId),
      supabase.from("user_bonus_display_settings").delete().eq("user_id", userId),
      supabase.from("user_spend_bonus_values").delete().eq("user_id", userId),
      supabase.from("user_welcome_bonus_settings").delete().eq("user_id", userId),
      supabase.from("user_welcome_bonus_value_overrides").delete().eq("user_id", userId),
    ]);

    revalidatePath("/admin/users");
  }

  async function toggleAccountLinking(userId: string, enabled: boolean) {
    "use server";
    const supabase = createServiceRoleClient();

    await supabase.from("user_feature_flags").upsert(
      {
        user_id: userId,
        account_linking_enabled: enabled,
      },
      { onConflict: "user_id" }
    );

    revalidatePath("/admin/users");
  }

  async function emulateUser(userId: string, email: string | null) {
    "use server";
    await startEmulation(userId, email);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <span className="text-zinc-400">{users.length} users</span>
      </div>

      <UsersTable
        users={users}
        onDelete={deleteUser}
        onToggleAccountLinking={toggleAccountLinking}
        onEmulate={emulateUser}
      />
    </div>
  );
}

