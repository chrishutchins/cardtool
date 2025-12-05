import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CategoryForm } from "./category-form";
import { CategoryRow } from "./category-row";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("earning_categories")
    .select("*")
    .order("sort_order");

  if (error) {
    return <div className="text-red-400">Error loading categories: {error.message}</div>;
  }

  async function createCategory(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const sort_order = parseInt(formData.get("sort_order") as string) || 100;
    const description = (formData.get("description") as string | null) || null;

    await supabase.from("earning_categories").insert({
      name,
      slug,
      sort_order,
      description,
    });
    revalidatePath("/admin/categories");
  }

  async function deleteCategory(id: number) {
    "use server";
    const supabase = await createClient();
    await supabase.from("earning_categories").delete().eq("id", id);
    revalidatePath("/admin/categories");
  }

  async function updateCategory(id: number, formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const sort_order = parseInt(formData.get("sort_order") as string) || 100;
    const description = (formData.get("description") as string | null) || null;

    await supabase.from("earning_categories").update({
      name,
      slug,
      sort_order,
      description,
    }).eq("id", id);
    revalidatePath("/admin/categories");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Earning Categories</h1>
      </div>

      {/* Add New Category Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Category</h2>
        <CategoryForm action={createCategory} />
      </div>

      {/* Categories Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {categories?.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onDelete={deleteCategory}
                onUpdate={updateCategory}
              />
            ))}
          </tbody>
        </table>
        {categories?.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No categories yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}

