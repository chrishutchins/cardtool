import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

interface UserStats {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  cardsAdded: number;
  spendingEdits: number;
  createdAt: string | null;
}

export default async function UsersPage() {
  const supabase = await createClient();

  // Get all unique user IDs from wallet and spending tables
  const [walletResult, spendingResult] = await Promise.all([
    supabase.from("user_wallets").select("user_id, added_at"),
    supabase.from("user_category_spend").select("user_id, created_at"),
  ]);

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
    await Promise.all([
      supabase.from("user_wallets").delete().eq("user_id", userId),
      supabase.from("user_category_spend").delete().eq("user_id", userId),
      supabase.from("user_currency_values").delete().eq("user_id", userId),
      supabase.from("user_point_value_settings").delete().eq("user_id", userId),
      supabase.from("user_mobile_pay_categories").delete().eq("user_id", userId),
      supabase.from("user_paypal_categories").delete().eq("user_id", userId),
      supabase.from("user_large_purchase_categories").delete().eq("user_id", userId),
      supabase.from("user_travel_preferences").delete().eq("user_id", userId),
      supabase.from("user_multiplier_tiers").delete().eq("user_id", userId),
      supabase.from("user_feature_flags").delete().eq("user_id", userId),
      supabase.from("user_card_debit_pay").delete().eq("user_id", userId),
      supabase.from("user_compare_categories").delete().eq("user_id", userId),
      supabase.from("user_compare_evaluation_cards").delete().eq("user_id", userId),
      supabase.from("user_cap_selections").delete().eq("user_id", userId),
      supabase.from("user_card_perks").delete().eq("user_id", userId),
      supabase.from("user_bonus_display_settings").delete().eq("user_id", userId),
      supabase.from("user_spend_bonus_values").delete().eq("user_id", userId),
      supabase.from("user_welcome_bonus_settings").delete().eq("user_id", userId),
      supabase.from("user_welcome_bonus_value_overrides").delete().eq("user_id", userId),
    ]);

    revalidatePath("/admin/users");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <span className="text-zinc-400">{users.length} users</span>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Cards Added
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Spending Edits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                First Activity
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((user) => (
              <UserRow key={user.userId} user={user} onDelete={deleteUser} />
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No users yet.
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user,
  onDelete,
}: {
  user: UserStats;
  onDelete: (userId: string) => Promise<void>;
}) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <tr className="hover:bg-zinc-800/30">
      <td className="px-6 py-4">
        <div>
          {user.email ? (
            <div className="text-white font-medium">{user.email}</div>
          ) : (
            <div className="text-zinc-500 italic">No email found</div>
          )}
          {(user.firstName || user.lastName) && (
            <div className="text-sm text-zinc-400">
              {[user.firstName, user.lastName].filter(Boolean).join(" ")}
            </div>
          )}
          <div className="text-xs text-zinc-600 font-mono">{user.userId}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`font-mono ${user.cardsAdded > 0 ? "text-white" : "text-zinc-600"}`}>
          {user.cardsAdded}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`font-mono ${user.spendingEdits > 0 ? "text-white" : "text-zinc-600"}`}>
          {user.spendingEdits}
        </span>
      </td>
      <td className="px-6 py-4 text-zinc-400 text-sm">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-6 py-4 text-right">
        <form
          action={async () => {
            "use server";
            await onDelete(user.userId);
          }}
        >
          <button
            type="submit"
            className="text-red-400 hover:text-red-300 text-sm"
            onClick={(e) => {
              if (!confirm(`Delete all data for ${user.email || user.userId}? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}

