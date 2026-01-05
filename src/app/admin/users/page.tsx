import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { UsersTable } from "./users-table";
import { startEmulation } from "@/lib/emulation";

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
  const supabase = await createClient();

  // Get all unique user IDs from wallet and spending tables
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

  // Get all unique user IDs
  const allUserIds = new Set([...Object.keys(cardsByUser), ...Object.keys(spendingByUser)]);

  // Fetch user details from Clerk
  const clerk = await clerkClient();
  const users: UserStats[] = [];

  for (const userId of allUserIds) {
    let email: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;

    try {
      const clerkUser = await clerk.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
      firstName = clerkUser.firstName;
      lastName = clerkUser.lastName;
    } catch {
      // User might not exist in Clerk anymore
      email = null;
    }

    // Get earliest date from either wallet or spending
    const walletDate = earliestWalletDate[userId];
    const spendDate = earliestSpendingDate[userId];
    let createdAt: string | null = null;
    if (walletDate && spendDate) {
      createdAt = walletDate < spendDate ? walletDate : spendDate;
    } else {
      createdAt = walletDate ?? spendDate ?? null;
    }

    users.push({
      userId,
      email,
      firstName,
      lastName,
      cardsAdded: cardsByUser[userId] ?? 0,
      spendingEdits: spendingByUser[userId] ?? 0,
      createdAt,
      accountLinkingEnabled: accountLinkingByUser[userId] ?? false,
    });
  }

  // Sort by most recent activity first
  users.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  async function deleteUser(userId: string) {
    "use server";
    const supabase = await createClient();

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
    const supabase = await createClient();

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

