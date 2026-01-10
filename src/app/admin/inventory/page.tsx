import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { InventoryTypeForm } from "./type-form";
import { InventoryTypesTable } from "./inventory-types-table";

export default async function InventoryTypesPage() {
  const supabase = createClient();
  const { data: types, error } = await supabase
    .from("inventory_types")
    .select("*")
    .order("display_order");

  if (error) {
    return <div className="text-red-400">Error loading inventory types: {error.message}</div>;
  }

  async function createType(formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const trackingType = formData.get("tracking_type") as "quantity" | "dollar_value" | "single_use";
    
    // Get the max display_order and add 1
    const { data: maxOrder } = await supabase
      .from("inventory_types")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();
    
    const displayOrder = (maxOrder?.display_order ?? 0) + 1;

    await supabase.from("inventory_types").insert({ 
      name, 
      slug, 
      tracking_type: trackingType,
      display_order: displayOrder 
    });
    revalidatePath("/admin/inventory");
  }

  async function deleteType(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("inventory_types").delete().eq("id", id);
    revalidatePath("/admin/inventory");
  }

  async function updateType(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const trackingType = formData.get("tracking_type") as "quantity" | "dollar_value" | "single_use";
    const isActive = formData.get("is_active") === "true";

    await supabase.from("inventory_types").update({ 
      name, 
      slug, 
      tracking_type: trackingType,
      is_active: isActive 
    }).eq("id", id);
    revalidatePath("/admin/inventory");
  }

  async function reorderTypes(typeIds: string[]) {
    "use server";
    const supabase = createClient();
    
    // Update each type's display_order based on its position in the array
    for (let i = 0; i < typeIds.length; i++) {
      await supabase
        .from("inventory_types")
        .update({ display_order: i + 1 })
        .eq("id", typeIds[i]);
    }
    
    revalidatePath("/admin/inventory");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory Types</h1>
          <p className="text-zinc-400 mt-1">Manage the types of items users can track in their inventory</p>
        </div>
      </div>

      {/* Add New Type Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Type</h2>
        <InventoryTypeForm action={createType} />
      </div>

      {/* Types Table */}
      <InventoryTypesTable
        types={types ?? []}
        onDelete={deleteType}
        onUpdate={updateType}
        onReorder={reorderTypes}
      />
    </div>
  );
}



