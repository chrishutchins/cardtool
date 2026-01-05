"use client";

import { useState, useMemo } from "react";
import { UserRow } from "./user-row";

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

interface UsersTableProps {
  users: UserStats[];
  onDelete: (userId: string) => Promise<void>;
  onToggleAccountLinking: (userId: string, enabled: boolean) => Promise<void>;
  onEmulate: (userId: string, email: string | null) => Promise<void>;
}

export function UsersTable({
  users,
  onDelete,
  onToggleAccountLinking,
  onEmulate,
}: UsersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const email = user.email?.toLowerCase() ?? "";
      const firstName = user.firstName?.toLowerCase() ?? "";
      const lastName = user.lastName?.toLowerCase() ?? "";
      const fullName = `${firstName} ${lastName}`.trim();
      const userId = user.userId.toLowerCase();

      return (
        email.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        userId.includes(query)
      );
    });
  }, [users, searchQuery]);

  return (
    <div>
      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or user ID..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-zinc-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        )}
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
              <th className="px-6 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Account Linking
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredUsers.map((user) => (
              <UserRow
                key={user.userId}
                user={user}
                onDelete={onDelete}
                onToggleAccountLinking={onToggleAccountLinking}
                onEmulate={onEmulate}
              />
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            {searchQuery ? "No users match your search." : "No users yet."}
          </div>
        )}
      </div>
    </div>
  );
}

