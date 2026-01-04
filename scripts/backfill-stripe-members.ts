/**
 * Backfill script to populate stripe_members table with existing Stripe subscribers
 * 
 * Usage:
 *   npx tsx scripts/backfill-stripe-members.ts
 * 
 * Required env vars:
 *   STRIPE_SECRET_KEY - Your Stripe secret key
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is not set");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase environment variables are not set");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MemberRecord {
  email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  subscription_status: string;
  updated_at: string;
}

async function backfillStripeMembers() {
  console.log("🔄 Starting Stripe members backfill...\n");

  const members: MemberRecord[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  // Fetch all active subscriptions from Stripe
  console.log("📥 Fetching subscriptions from Stripe...");
  
  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.customer"],
    });

    for (const subscription of subscriptions.data) {
      const customer = subscription.customer as Stripe.Customer;
      
      if (customer.email) {
        members.push({
          email: customer.email.toLowerCase(),
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
        });
      }
    }

    hasMore = subscriptions.has_more;
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }

    process.stdout.write(`\r  Found ${members.length} active subscribers...`);
  }

  // Also fetch trialing subscriptions
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const subscriptions = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.customer"],
    });

    for (const subscription of subscriptions.data) {
      const customer = subscription.customer as Stripe.Customer;
      
      if (customer.email) {
        // Check if we already have this email (from active)
        const existing = members.find(m => m.email === customer.email?.toLowerCase());
        if (!existing) {
          members.push({
            email: customer.email.toLowerCase(),
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    hasMore = subscriptions.has_more;
    if (subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }
  }

  console.log(`\n\n✅ Found ${members.length} total active/trialing subscribers\n`);

  if (members.length === 0) {
    console.log("No subscribers to backfill.");
    return;
  }

  // Show sample of what we're about to insert
  console.log("📋 Sample records (first 5):");
  console.log("────────────────────────────────────────────────────────────");
  members.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.email} (${m.subscription_status})`);
  });
  if (members.length > 5) {
    console.log(`  ... and ${members.length - 5} more`);
  }
  console.log("────────────────────────────────────────────────────────────\n");

  // Upsert to Supabase in batches
  console.log("📤 Upserting to Supabase...");
  
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from("stripe_members")
      .upsert(batch, { onConflict: "email" });

    if (error) {
      console.error(`\n❌ Error upserting batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    process.stdout.write(`\r  Processed ${Math.min(i + batchSize, members.length)}/${members.length}...`);
  }

  console.log("\n");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`✅ Backfill complete!`);
  console.log(`   Inserted/Updated: ${inserted}`);
  if (errors > 0) {
    console.log(`   Errors: ${errors}`);
  }
  console.log("────────────────────────────────────────────────────────────");
}

backfillStripeMembers().catch(console.error);

