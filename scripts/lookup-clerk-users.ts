/**
 * Look up Clerk users by ID
 * 
 * Usage:
 * npx tsx scripts/lookup-clerk-users.ts user_37o9mwsPjh9JtEU4nJCkwTP8qUN user_38JVtsDztVfG2lZA6WzSMHMYqFv
 * 
 * Or to look up all users with excluded cards:
 * npx tsx scripts/lookup-clerk-users.ts --excluded-cards
 */

import "dotenv/config";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local if it exists
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error("Please set CLERK_SECRET_KEY environment variable");
  process.exit(1);
}

// User IDs that have added excluded cards (from database query)
const EXCLUDED_CARD_USERS = [
  { userId: "user_37o9mwsPjh9JtEU4nJCkwTP8qUN", card: "Sam's Club Mastercard" },
  { userId: "user_37o9n5P6aeTrBZxDPX0PIZhW1yb", card: "Gemini Card" },
  { userId: "user_37zwUpSy8CatplVEfcsgcSjp8d0", card: "Gemini Card" },
  { userId: "user_3821gyD7mOp0aKvf7IVZdYbMsSK", card: "Sam's Club Mastercard" },
  { userId: "user_387bLjkkWSB76RHKxG8FHuNyBLa", card: "Chase Prime Visa" },
  { userId: "user_388BTucptp5wRRlB7VAxUqEDHMR", card: "Sam's Club Mastercard" },
  { userId: "user_38IZSoxQLYIRAuW0OLU2LAGE8mN", card: "Chase Prime Visa" },
  { userId: "user_38J6vcbuzsKnil1bDJyJ9iAism9", card: "Hawaiian Personal" },
  { userId: "user_38JVtsDztVfG2lZA6WzSMHMYqFv", card: "Amazon Business Card, Chase DoorDash Rewards (x2)" },
  { userId: "user_38JZdVIzHDjeaRcJeBkzsp1GfXI", card: "FNBO Amtrak Preferred" },
];

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  created_at: number;
}

async function getUser(userId: string): Promise<ClerkUser | null> {
  try {
    const response = await fetch(
      `https://api.clerk.com/v1/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch user ${userId}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  let userIds: string[];
  let showCards = false;
  
  if (args.includes("--excluded-cards")) {
    userIds = EXCLUDED_CARD_USERS.map(u => u.userId);
    showCards = true;
    console.log("Looking up users who added excluded cards...\n");
  } else if (args.length === 0) {
    console.log("Usage:");
    console.log("  npx tsx scripts/lookup-clerk-users.ts <user_id1> <user_id2> ...");
    console.log("  npx tsx scripts/lookup-clerk-users.ts --excluded-cards");
    process.exit(1);
  } else {
    userIds = args;
  }

  console.log("─".repeat(80));
  console.log(`${"User ID".padEnd(35)} | ${"Email".padEnd(30)} | ${showCards ? "Excluded Cards" : "Name"}`);
  console.log("─".repeat(80));

  for (const userId of userIds) {
    const user = await getUser(userId);
    
    if (user) {
      const email = user.email_addresses[0]?.email_address || "(no email)";
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "(no name)";
      
      if (showCards) {
        const cardInfo = EXCLUDED_CARD_USERS.find(u => u.userId === userId)?.card || "";
        console.log(`${userId.padEnd(35)} | ${email.padEnd(30)} | ${cardInfo}`);
      } else {
        console.log(`${userId.padEnd(35)} | ${email.padEnd(30)} | ${name}`);
      }
    } else {
      console.log(`${userId.padEnd(35)} | (user not found)`);
    }
  }

  console.log("─".repeat(80));
}

main().catch(console.error);
