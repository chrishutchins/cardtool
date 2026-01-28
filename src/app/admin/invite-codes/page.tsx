import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { InviteCodesTable, type InviteCode, type PlaidTier, PLAID_TIERS } from "./invite-codes-table";
import { AddInviteCodeModal } from "./add-code-modal";

export default async function InviteCodesPage() {
  const supabase = createClient();
  const user = await currentUser();
  const adminEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;

  // Fetch invite codes with usage stats
  const [codesResult, usageResult] = await Promise.all([
    supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_invite_codes")
      .select("invite_code_id"),
  ]);

  if (codesResult.error) {
    return <div className="text-red-400">Error loading invite codes: {codesResult.error.message}</div>;
  }

  // Count uses per invite code
  const usageCountMap = new Map<string, number>();
  if (usageResult.data) {
    for (const usage of usageResult.data) {
      if (usage.invite_code_id) {
        const count = usageCountMap.get(usage.invite_code_id) ?? 0;
        usageCountMap.set(usage.invite_code_id, count + 1);
      }
    }
  }

  const codes: InviteCode[] = (codesResult.data ?? []).map((code) => ({
    ...code,
    plaid_tier: code.plaid_tier as PlaidTier,
    times_used: usageCountMap.get(code.id) ?? 0,
  }));

  async function createCode(formData: FormData) {
    "use server";
    const supabase = createClient();
    const user = await currentUser();
    const adminEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;

    const code = (formData.get("code") as string).trim().toUpperCase();
    const description = (formData.get("description") as string)?.trim() || null;
    const plaidTier = formData.get("plaid_tier") as PlaidTier;
    const usesLimitStr = formData.get("uses_limit") as string;
    const expiresAtStr = formData.get("expires_at") as string;

    const usesLimit = usesLimitStr ? parseInt(usesLimitStr) : null;
    const expiresAt = expiresAtStr || null;

    await supabase.from("invite_codes").insert({
      code,
      description,
      plaid_tier: plaidTier,
      uses_remaining: usesLimit,
      uses_total: usesLimit,
      expires_at: expiresAt,
      created_by: adminEmail,
    });

    revalidatePath("/admin/invite-codes");
  }

  async function toggleActive(id: string, isActive: boolean) {
    "use server";
    const supabase = createClient();
    await supabase.from("invite_codes").update({ is_active: isActive }).eq("id", id);
    revalidatePath("/admin/invite-codes");
  }

  async function deleteCode(id: string) {
    "use server";
    const supabase = createClient();
    await supabase.from("invite_codes").delete().eq("id", id);
    revalidatePath("/admin/invite-codes");
  }

  async function updateCode(id: string, formData: FormData) {
    "use server";
    const supabase = createClient();

    const description = (formData.get("description") as string)?.trim() || null;
    const plaidTier = formData.get("plaid_tier") as PlaidTier;
    const usesRemainingStr = formData.get("uses_remaining") as string;
    const expiresAtStr = formData.get("expires_at") as string;

    const usesRemaining = usesRemainingStr === "" ? null : parseInt(usesRemainingStr);
    const expiresAt = expiresAtStr || null;

    await supabase.from("invite_codes").update({
      description,
      plaid_tier: plaidTier,
      uses_remaining: usesRemaining,
      expires_at: expiresAt,
    }).eq("id", id);

    revalidatePath("/admin/invite-codes");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Invite Codes</h1>
          <p className="text-zinc-400 mt-1">
            Manage invite codes for user sign-ups. Codes can grant Plaid access tiers.
          </p>
        </div>
        <AddInviteCodeModal onSubmit={createCode} plaidTiers={PLAID_TIERS} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-2xl font-bold text-white">{codes.length}</div>
          <div className="text-sm text-zinc-400">Total Codes</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-2xl font-bold text-emerald-400">
            {codes.filter((c) => c.is_active).length}
          </div>
          <div className="text-sm text-zinc-400">Active Codes</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-2xl font-bold text-amber-400">
            {codes.filter((c) => c.plaid_tier !== "disabled").length}
          </div>
          <div className="text-sm text-zinc-400">With Plaid Features</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-2xl font-bold text-blue-400">
            {codes.reduce((sum, c) => sum + c.times_used, 0)}
          </div>
          <div className="text-sm text-zinc-400">Total Uses</div>
        </div>
      </div>

      {/* Invite Codes Table */}
      <InviteCodesTable
        codes={codes}
        onToggleActive={toggleActive}
        onDelete={deleteCode}
        onUpdate={updateCode}
      />
    </div>
  );
}
