import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { IssuerForm } from "./issuer-form";
import { IssuersTable } from "./issuers-table";

export default async function IssuersPage() {
  const supabase = createClient();
  const { data: issuers, error } = await supabase
    .from("issuers")
    .select("*")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading issuers: {error.message}</div>;
  }

  async function createIssuer(formData: FormData) {
    "use server";
    const supabase = createClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    await supabase.from("issuers").insert({ name, slug });
    revalidatePath("/admin/issuers");
  }

  async function deleteIssuer(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("issuers").delete().eq("id", id);
    revalidatePath("/admin/issuers");
  }

  async function updateIssuer(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();
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
      <IssuersTable
        issuers={issuers ?? []}
        onDelete={deleteIssuer}
        onUpdate={updateIssuer}
      />
    </div>
  );
}

