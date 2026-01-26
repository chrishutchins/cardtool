import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BrandForm } from "./brand-form";
import { BrandsTable } from "./brands-table";

export default async function BrandsPage() {
  const supabase = createClient();
  
  // Fetch brands and card counts in parallel
  const [brandsResult, cardCountsResult] = await Promise.all([
    supabase
      .from("brands")
      .select("*")
      .order("name"),
    supabase
      .from("cards")
      .select("brand_id")
      .not("brand_id", "is", null)
  ]);

  if (brandsResult.error) {
    return <div className="text-red-400">Error loading brands: {brandsResult.error.message}</div>;
  }

  const brands = brandsResult.data;
  
  // Build card count map by brand_id
  const cardCountMap = new Map<string, number>();
  if (cardCountsResult.data) {
    for (const card of cardCountsResult.data) {
      if (card.brand_id) {
        const count = cardCountMap.get(card.brand_id) ?? 0;
        cardCountMap.set(card.brand_id, count + 1);
      }
    }
  }

  async function createBrand(formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    await supabase.from("brands").insert({ name, slug });
    revalidatePath("/admin/brands");
  }

  async function deleteBrand(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("brands").delete().eq("id", id);
    revalidatePath("/admin/brands");
  }

  async function updateBrand(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    await supabase.from("brands").update({ name, slug }).eq("id", id);
    revalidatePath("/admin/brands");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Brands</h1>
      </div>

      {/* Add New Brand Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Brand</h2>
        <BrandForm action={createBrand} />
      </div>

      {/* Brands Table */}
      <BrandsTable
        brands={brands ?? []}
        cardCounts={cardCountMap}
        onDelete={deleteBrand}
        onUpdate={updateBrand}
      />
    </div>
  );
}
