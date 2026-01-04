/**
 * Export users from Clerk Development instance
 * 
 * Usage:
 * 1. Set your DEVELOPMENT Clerk secret key as CLERK_SECRET_KEY_DEV
 * 2. Run: npx tsx scripts/export-clerk-users.ts
 * 3. This creates users.json for the migration script
 */

const CLERK_SECRET_KEY_DEV = process.env.CLERK_SECRET_KEY_DEV;

if (!CLERK_SECRET_KEY_DEV) {
  console.error("Please set CLERK_SECRET_KEY_DEV environment variable");
  console.error("This should be your DEVELOPMENT Clerk secret key (sk_test_...)");
  process.exit(1);
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  created_at: number;
  external_id: string | null;
}

interface ExportedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

async function fetchAllUsers(): Promise<ClerkUser[]> {
  const allUsers: ClerkUser[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY_DEV}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const users: ClerkUser[] = await response.json();
    
    if (users.length === 0) {
      break;
    }

    allUsers.push(...users);
    offset += limit;

    console.log(`Fetched ${allUsers.length} users...`);

    if (users.length < limit) {
      break;
    }
  }

  return allUsers;
}

async function main() {
  console.log("Fetching users from Clerk Development...\n");

  const users = await fetchAllUsers();

  console.log(`\nTotal users found: ${users.length}\n`);

  // Format for Clerk migration script
  const exportedUsers: ExportedUser[] = users.map((user) => ({
    userId: user.id,
    email: user.email_addresses[0]?.email_address || "",
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    createdAt: new Date(user.created_at).toISOString(),
  }));

  // Print user list
  console.log("Users to migrate:");
  console.log("─".repeat(60));
  exportedUsers.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email} (${u.firstName} ${u.lastName})`);
  });
  console.log("─".repeat(60));

  // Save to file for migration script
  const fs = await import("fs");
  
  // Format for Clerk's migration script (users.json)
  const migrationFormat = users.map((user) => ({
    userId: user.id, // Preserve original user ID so Supabase data stays linked!
    emailAddress: [user.email_addresses[0]?.email_address].filter(Boolean),
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    // Note: Passwords cannot be migrated - users will need to reset
  }));

  fs.writeFileSync(
    "scripts/users.json",
    JSON.stringify(migrationFormat, null, 2)
  );

  console.log(`\n✅ Exported ${users.length} users to scripts/users.json`);
  console.log("\nNext steps:");
  console.log("1. Clone Clerk migration script: git clone https://github.com/clerk/migration-script.git");
  console.log("2. Copy scripts/users.json to migration-script/users.json");
  console.log("3. Set CLERK_SECRET_KEY to your PRODUCTION key in migration-script/.env");
  console.log("4. Run: cd migration-script && npm install && npm start");
  console.log("\n⚠️  Note: Passwords cannot be migrated. Users will need to:");
  console.log("   - Use 'Forgot Password' to set a new password, OR");
  console.log("   - Sign in with Google/OAuth if they used that originally");
}

main().catch(console.error);

