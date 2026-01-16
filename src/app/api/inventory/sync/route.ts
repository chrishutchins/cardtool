import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, pointsImportRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import crypto from "crypto";

// Item from Tampermonkey script
interface InventoryImportItem {
  external_id: string;
  type_slug: string;
  name: string;
  brand: string;
  expiration_date?: string | null;
  notes?: string | null;
  player_number?: number | null;
}

// Authenticate via Clerk session OR sync token
async function authenticateUser(request: Request): Promise<{ userId: string | null; error?: string }> {
  // First try sync token (for Tampermonkey scripts on external sites)
  const syncToken = request.headers.get("x-sync-token");
  
  if (syncToken) {
    const tokenHash = crypto.createHash("sha256").update(syncToken).digest("hex");
    const supabase = createClient();
    
    const { data: tokenData, error } = await supabase
      .from("user_sync_tokens")
      .select("user_id")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    
    if (error) {
      logger.error({ err: error }, "Error validating sync token");
      return { userId: null, error: "Token validation failed" };
    }
    
    if (tokenData) {
      // Update last_used_at
      await supabase
        .from("user_sync_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
      
      return { userId: tokenData.user_id };
    }
    
    return { userId: null, error: "Invalid sync token" };
  }
  
  // Fall back to Clerk session (for requests from CardTool itself)
  const user = await currentUser();
  if (user) {
    return { userId: user.id };
  }
  
  return { userId: null, error: "Unauthorized" };
}

export async function POST(request: Request) {
  const { userId, error: authError } = await authenticateUser(request);

  if (!userId) {
    return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 requests per minute per user (reuse points import rate limit)
  const { success } = await checkRateLimit(pointsImportRateLimit, userId);
  if (!success) {
    logger.warn({ userId }, "Inventory sync rate limited");
    return NextResponse.json({ error: "Rate limited. Please wait before syncing again." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { items, playerNumber } = body as { items: InventoryImportItem[]; playerNumber?: number };

    // Validate required fields
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Missing required field: items (array)" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        created: 0,
        updated: 0,
      });
    }

    // Limit batch size
    if (items.length > 100) {
      return NextResponse.json(
        { error: "Too many items. Maximum 100 items per request." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch all inventory types for slug lookup
    const { data: inventoryTypes, error: typesError } = await supabase
      .from("inventory_types")
      .select("id, slug")
      .eq("is_active", true);

    if (typesError) {
      logger.error({ err: typesError }, "Error fetching inventory types");
      return NextResponse.json(
        { error: "Failed to fetch inventory types" },
        { status: 500 }
      );
    }

    const typesBySlug = new Map(inventoryTypes?.map(t => [t.slug, t.id]) || []);

    // Process each item
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const item of items) {
      // Validate item
      if (!item.external_id || !item.type_slug || !item.name || !item.brand) {
        errors.push(`Missing required field in item: ${JSON.stringify(item).substring(0, 100)}`);
        continue;
      }

      const typeId = typesBySlug.get(item.type_slug);
      if (!typeId) {
        errors.push(`Unknown type_slug: ${item.type_slug}`);
        continue;
      }

      // Check if item already exists
      const { data: existing } = await supabase
        .from("user_inventory")
        .select("id")
        .eq("user_id", userId)
        .eq("external_id", item.external_id)
        .maybeSingle();

      // Use item's player_number if set, otherwise use body-level playerNumber
      const itemPlayerNumber = item.player_number ?? playerNumber ?? null;

      if (existing) {
        // Update existing item
        const { error: updateError } = await supabase
          .from("user_inventory")
          .update({
            type_id: typeId,
            name: item.name,
            brand: item.brand,
            expiration_date: item.expiration_date || null,
            notes: item.notes || null,
            player_number: itemPlayerNumber,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          logger.error({ err: updateError, itemId: existing.id }, "Error updating inventory item");
          errors.push(`Failed to update item: ${item.external_id}`);
        } else {
          updated++;
        }
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from("user_inventory")
          .insert({
            user_id: userId,
            type_id: typeId,
            external_id: item.external_id,
            name: item.name,
            brand: item.brand,
            expiration_date: item.expiration_date || null,
            notes: item.notes || null,
            player_number: itemPlayerNumber,
            quantity: 1,
            quantity_used: 0,
            is_used: false,
          });

        if (insertError) {
          logger.error({ err: insertError, external_id: item.external_id }, "Error inserting inventory item");
          errors.push(`Failed to insert item: ${item.external_id}`);
        } else {
          created++;
        }
      }
    }

    logger.info(
      { userId, total: items.length, created, updated, errors: errors.length },
      "Inventory sync completed"
    );

    return NextResponse.json({
      success: true,
      synced: created + updated,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error({ err: error }, "Inventory sync error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
