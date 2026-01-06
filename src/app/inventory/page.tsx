import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { InventoryClient } from "./inventory-client";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";

export const metadata: Metadata = {
  title: "Inventory | CardTool",
  description: "Track gift cards, free nights, lounge visits, and more",
};

export default async function InventoryPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();

  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);

  // Fetch inventory types
  const { data: inventoryTypes } = await supabase
    .from("inventory_types")
    .select("id, name, slug, tracking_type, display_order")
    .eq("is_active", true)
    .order("display_order");

  // Fetch user's inventory items with type info
  const { data: inventoryItems } = await supabase
    .from("user_inventory")
    .select(`
      id,
      type_id,
      name,
      brand,
      expiration_date,
      code,
      pin,
      url,
      notes,
      quantity,
      quantity_used,
      original_value_cents,
      remaining_value_cents,
      is_used,
      used_at,
      source_credit_usage_id,
      created_at,
      inventory_types:type_id (
        id,
        name,
        slug,
        tracking_type
      )
    `)
    .eq("user_id", effectiveUserId)
    .order("expiration_date", { ascending: true, nullsFirst: false });

  // Fetch existing brands for autocomplete (from credits and inventory)
  const [creditBrands, inventoryBrands] = await Promise.all([
    supabase
      .from("card_credits")
      .select("brand_name")
      .not("brand_name", "is", null),
    supabase
      .from("user_inventory")
      .select("brand")
      .eq("user_id", effectiveUserId)
      .not("brand", "is", null),
  ]);

  const allBrands = new Set<string>();
  creditBrands.data?.forEach(c => {
    if (c.brand_name) allBrands.add(c.brand_name);
  });
  inventoryBrands.data?.forEach(i => {
    if (i.brand) allBrands.add(i.brand);
  });
  const brandSuggestions = Array.from(allBrands).sort();

  // Server actions
  async function addInventoryItem(formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = await createClient();

    const typeId = formData.get("type_id") as string;
    const name = formData.get("name") as string;
    const brandRaw = formData.get("brand") as string;
    const brand = brandRaw?.trim() || null;
    const expirationDateRaw = formData.get("expiration_date") as string;
    const expirationDate = expirationDateRaw?.trim() || null;
    const code = (formData.get("code") as string)?.trim() || null;
    const pin = (formData.get("pin") as string)?.trim() || null;
    const url = (formData.get("url") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const quantityStr = formData.get("quantity") as string;
    const quantity = quantityStr ? parseInt(quantityStr) : 1;
    const originalValueStr = formData.get("original_value") as string;
    const originalValueCents = originalValueStr ? Math.round(parseFloat(originalValueStr) * 100) : null;
    const sourceCreditUsageId = (formData.get("source_credit_usage_id") as string)?.trim() || null;

    const { error } = await supabase.from("user_inventory").insert({
      user_id: userId,
      type_id: typeId,
      name,
      brand,
      expiration_date: expirationDate,
      code,
      pin,
      url,
      notes,
      quantity,
      quantity_used: 0,
      original_value_cents: originalValueCents,
      remaining_value_cents: originalValueCents,
      is_used: false,
      source_credit_usage_id: sourceCreditUsageId,
    });

    if (error) {
      console.error("Error adding inventory item:", error);
      return;
    }

    revalidatePath("/inventory");
  }

  async function updateInventoryItem(itemId: string, formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = await createClient();

    // Verify ownership
    const { data: item } = await supabase
      .from("user_inventory")
      .select("id")
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (!item) {
      console.error("Unauthorized: item does not belong to user");
      return;
    }

    const typeId = formData.get("type_id") as string;
    const name = formData.get("name") as string;
    const brandRaw = formData.get("brand") as string;
    const brand = brandRaw?.trim() || null;
    const expirationDateRaw = formData.get("expiration_date") as string;
    const expirationDate = expirationDateRaw?.trim() || null;
    const code = (formData.get("code") as string)?.trim() || null;
    const pin = (formData.get("pin") as string)?.trim() || null;
    const url = (formData.get("url") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const quantityStr = formData.get("quantity") as string;
    const quantity = quantityStr ? parseInt(quantityStr) : 1;
    const originalValueStr = formData.get("original_value") as string;
    const originalValueCents = originalValueStr ? Math.round(parseFloat(originalValueStr) * 100) : null;
    const remainingValueStr = formData.get("remaining_value") as string;
    const remainingValueCents = remainingValueStr ? Math.round(parseFloat(remainingValueStr) * 100) : null;
    const quantityUsedStr = formData.get("quantity_used") as string;
    const quantityUsed = quantityUsedStr ? parseInt(quantityUsedStr) : 0;

    await supabase.from("user_inventory").update({
      type_id: typeId,
      name,
      brand,
      expiration_date: expirationDate,
      code,
      pin,
      url,
      notes,
      quantity,
      quantity_used: quantityUsed,
      original_value_cents: originalValueCents,
      remaining_value_cents: remainingValueCents,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId);

    revalidatePath("/inventory");
  }

  async function useInventoryItem(itemId: string, formData: FormData) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = await createClient();

    // Get current item with type info
    const { data: item } = await supabase
      .from("user_inventory")
      .select(`
        id,
        quantity,
        quantity_used,
        remaining_value_cents,
        inventory_types:type_id (
          tracking_type
        )
      `)
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (!item) {
      console.error("Unauthorized: item does not belong to user");
      return;
    }

    const trackingType = (item.inventory_types as { tracking_type: string } | null)?.tracking_type;

    if (trackingType === "single_use") {
      // Mark as fully used
      await supabase.from("user_inventory").update({
        is_used: true,
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", itemId);
    } else if (trackingType === "quantity") {
      const useCountStr = formData.get("use_count") as string;
      const useCount = useCountStr ? parseInt(useCountStr) : 1;
      const newQuantityUsed = (item.quantity_used ?? 0) + useCount;
      const isFullyUsed = newQuantityUsed >= (item.quantity ?? 1);

      await supabase.from("user_inventory").update({
        quantity_used: newQuantityUsed,
        is_used: isFullyUsed,
        used_at: isFullyUsed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", itemId);
    } else if (trackingType === "dollar_value") {
      const useAmountStr = formData.get("use_amount") as string;
      const useAmountCents = useAmountStr ? Math.round(parseFloat(useAmountStr) * 100) : 0;
      const newRemaining = Math.max(0, (item.remaining_value_cents ?? 0) - useAmountCents);
      const isFullyUsed = newRemaining === 0;

      await supabase.from("user_inventory").update({
        remaining_value_cents: newRemaining,
        is_used: isFullyUsed,
        used_at: isFullyUsed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", itemId);
    }

    revalidatePath("/inventory");
  }

  async function markItemUnused(itemId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = await createClient();

    // Verify ownership
    const { data: item } = await supabase
      .from("user_inventory")
      .select("id, original_value_cents, quantity")
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (!item) {
      console.error("Unauthorized: item does not belong to user");
      return;
    }

    // Reset to unused state
    await supabase.from("user_inventory").update({
      is_used: false,
      used_at: null,
      quantity_used: 0,
      remaining_value_cents: item.original_value_cents,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId);

    revalidatePath("/inventory");
  }

  async function deleteInventoryItem(itemId: string) {
    "use server";
    const userId = await getEffectiveUserId();
    if (!userId) return;

    const supabase = await createClient();

    // Verify ownership before delete
    const { data: item } = await supabase
      .from("user_inventory")
      .select("id")
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (!item) {
      console.error("Unauthorized: item does not belong to user");
      return;
    }

    await supabase.from("user_inventory").delete().eq("id", itemId);
    revalidatePath("/inventory");
  }

  // Transform for client
  type InventoryItemRaw = {
    id: string;
    type_id: string;
    name: string;
    brand: string | null;
    expiration_date: string | null;
    code: string | null;
    pin: string | null;
    url: string | null;
    notes: string | null;
    quantity: number;
    quantity_used: number;
    original_value_cents: number | null;
    remaining_value_cents: number | null;
    is_used: boolean;
    used_at: string | null;
    source_credit_usage_id: string | null;
    created_at: string;
    inventory_types: {
      id: string;
      name: string;
      slug: string;
      tracking_type: string;
    } | null;
  };

  const transformedItems = (inventoryItems ?? []) as unknown as InventoryItemRaw[];

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader isAdmin={isAdmin} creditTrackingEnabled={true} emulationInfo={emulationInfo} />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Inventory</h1>
          <p className="text-zinc-400 mt-1">
            Track gift cards, free nights, lounge visits, and more
          </p>
        </div>

        <InventoryClient
          inventoryItems={transformedItems}
          inventoryTypes={inventoryTypes ?? []}
          brandSuggestions={brandSuggestions}
          onAddItem={addInventoryItem}
          onUpdateItem={updateInventoryItem}
          onUseItem={useInventoryItem}
          onMarkUnused={markItemUnused}
          onDeleteItem={deleteInventoryItem}
        />
      </div>
    </div>
  );
}

