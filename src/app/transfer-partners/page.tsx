import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { TransfersClient } from "./transfers-client";

export const metadata: Metadata = {
  title: "Transfer Partners | CardTool",
  description: "View transfer partners and ratios for all transferable currencies",
};

export default async function TransfersPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();
  
  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  const isAdmin = isAdminEmail(user?.emailAddresses?.[0]?.emailAddress);

  // Fetch data in parallel
  const [
    currenciesResult,
    transferPartnersResult,
  ] = await Promise.all([
    // All currencies
    supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type, program_name, alliance, is_transferable, transfer_increment")
      .order("name"),
    
    // All active transfer partners
    supabase
      .from("currency_transfer_partners")
      .select(`
        id,
        source_currency_id,
        destination_currency_id,
        source_units,
        destination_units,
        transfer_timing,
        notes,
        is_active
      `)
      .eq("is_active", true),
  ]);

  const currencies = currenciesResult.data ?? [];
  const transferPartners = transferPartnersResult.data ?? [];

  // Get transferable currencies (sources) - sorted by name
  const transferableCurrencies = currencies
    .filter(c => c.is_transferable)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get all destination currencies (airlines + hotels that have transfer partners)
  const destinationIds = new Set(transferPartners.map(tp => tp.destination_currency_id));
  const destinationCurrencies = currencies
    .filter(c => destinationIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex-1 bg-zinc-950">
      <UserHeader 
        isAdmin={isAdmin} 
        emulationInfo={emulationInfo}
      />
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Transfer Partners</h1>
          <p className="text-zinc-400 mt-1">Compare transfer ratios across all transferable point currencies</p>
        </div>

        <TransfersClient
          transferableCurrencies={transferableCurrencies}
          destinationCurrencies={destinationCurrencies}
          transferPartners={transferPartners}
        />
      </main>
    </div>
  );
}
