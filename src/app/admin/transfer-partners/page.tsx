import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TransferPartnersTable } from "./transfer-partners-table";
import { TransferPartnerForm } from "./transfer-partner-form";

export default async function TransferPartnersPage() {
  const supabase = createClient();

  // Fetch transfer partners with source and destination currency info
  const { data: transferPartners, error } = await supabase
    .from("currency_transfer_partners")
    .select(`
      id,
      source_currency_id,
      destination_currency_id,
      source_units,
      destination_units,
      transfer_timing,
      notes,
      is_active,
      created_at,
      updated_at,
      source_currency:reward_currencies!currency_transfer_partners_source_currency_id_fkey(id, name, code, currency_type),
      destination_currency:reward_currencies!currency_transfer_partners_destination_currency_id_fkey(id, name, code, currency_type)
    `)
    .order("created_at", { ascending: false });

  // Fetch all currencies for dropdowns
  const { data: currencies } = await supabase
    .from("reward_currencies")
    .select("id, name, code, currency_type, is_transferable")
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading transfer partners: {error.message}</div>;
  }

  async function createTransferPartner(formData: FormData) {
    "use server";
    const supabase = createClient();
    const source_currency_id = formData.get("source_currency_id") as string;
    const destination_currency_id = formData.get("destination_currency_id") as string;
    const source_units = parseInt(formData.get("source_units") as string) || 1;
    const destination_units = parseInt(formData.get("destination_units") as string) || 1;
    const transfer_timing = (formData.get("transfer_timing") as string) || null;
    const notes = (formData.get("notes") as string) || null;

    const { error } = await supabase.from("currency_transfer_partners").insert({
      source_currency_id,
      destination_currency_id,
      source_units,
      destination_units,
      transfer_timing,
      notes,
      is_active: true,
    });

    if (error) {
      console.error("Error creating transfer partner:", error);
    }
    revalidatePath("/admin/transfer-partners");
  }

  async function deleteTransferPartner(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("currency_transfer_partners").delete().eq("id", id);
    revalidatePath("/admin/transfer-partners");
  }

  async function updateTransferPartner(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();
    const source_currency_id = formData.get("source_currency_id") as string;
    const destination_currency_id = formData.get("destination_currency_id") as string;
    const source_units = parseInt(formData.get("source_units") as string) || 1;
    const destination_units = parseInt(formData.get("destination_units") as string) || 1;
    const transfer_timing = (formData.get("transfer_timing") as string) || null;
    const notes = (formData.get("notes") as string) || null;
    const is_active = formData.get("is_active") === "on";

    await supabase.from("currency_transfer_partners").update({
      source_currency_id,
      destination_currency_id,
      source_units,
      destination_units,
      transfer_timing,
      notes,
      is_active,
    }).eq("id", id);
    revalidatePath("/admin/transfer-partners");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Transfer Partners</h1>
        <span className="text-zinc-400">{transferPartners?.length ?? 0} relationships</span>
      </div>

      {/* Add New Transfer Partner Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Transfer Partner</h2>
        <TransferPartnerForm 
          action={createTransferPartner} 
          currencies={currencies ?? []}
        />
      </div>

      {/* Transfer Partners Table */}
      <TransferPartnersTable
        transferPartners={transferPartners ?? []}
        currencies={currencies ?? []}
        onDelete={deleteTransferPartner}
        onUpdate={updateTransferPartner}
      />
    </div>
  );
}
