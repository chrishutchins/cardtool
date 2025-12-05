import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { IssuerForm } from "./issuer-form";
import { IssuerRow } from "./issuer-row";

export default async function IssuersPage() {
  const supabase = await createClient();
  const { data: issuers, error } = await supabase
    .from("issuers")
    .select("*")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading issuers: {error.message}</div>;
  }

  async function createIssuer(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    await supabase.from("issuers").insert({ name, slug });
    revalidatePath("/admin/issuers");
  }

  async function deleteIssuer(id: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("issuers").delete().eq("id", id);
    revalidatePath("/admin/issuers");
  }

  async function updateIssuer(id: string, formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    await supabase.from("issuers").update({ name, slug }).eq("id", id);
    revalidatePath("/admin/issuers");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Issuers</h1>
      </div>

      {/* Add New Issuer Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Issuer</h2>
        <IssuerForm action={createIssuer} />
      </div>

      {/* Issuers Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {issuers?.map((issuer) => (
              <IssuerRow
                key={issuer.id}
                issuer={issuer}
                onDelete={deleteIssuer}
                onUpdate={updateIssuer}
              />
            ))}
          </tbody>
        </table>
        {issuers?.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No issuers yet. Add one above.
          </div>
        )}
      </div>
    </div>
  );
}

