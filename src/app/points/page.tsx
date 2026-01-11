import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserHeader } from "@/components/user-header";
import { isAdminEmail } from "@/lib/admin";
import { getEffectiveUserId, getEmulationInfo } from "@/lib/emulation";
import { PointsClient } from "./points-client";

export const metadata: Metadata = {
  title: "Points Balances | CardTool",
  description: "Track your points and miles balances across all currencies",
};

// Type for currency with extended fields
type Currency = {
  id: string;
  name: string;
  code: string;
  currency_type: string;
  base_value_cents: number | null;
  program_name?: string | null;
  alliance?: string | null;
  expiration_policy?: string | null;
  is_transferable?: boolean | null;
  transfer_increment?: number | null;
};

// Type for balance
type PointBalance = {
  id: string;
  user_id: string;
  currency_id: string;
  player_number: number;
  balance: number;
  expiration_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_update_source: string | null;
};

export default async function PointsPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Get effective user ID for data reads (may be emulated user if admin is emulating)
  const effectiveUserId = await getEffectiveUserId();
  const emulationInfo = await getEmulationInfo();
  
  if (!effectiveUserId) {
    redirect("/sign-in");
  }

  const supabase = createClient();

  // Check if user is admin for showing credits link
  const isAdmin = isAdminEmail(user?.emailAddresses?.[0]?.emailAddress);

  // Fetch data in parallel
  const [
    currenciesResult,
    balancesResult,
    playersResult,
    userCurrencyValuesResult,
    userPointValueSettingsResult,
    pointValueTemplatesResult,
    featureFlagsResult,
  ] = await Promise.all([
    // All currencies
    supabase
      .from("reward_currencies")
      .select("id, name, code, currency_type, base_value_cents, program_name, alliance, expiration_policy, is_transferable, transfer_increment")
      .order("name"),
    
    // User's point balances
    supabase
      .from("user_point_balances")
      .select("*")
      .eq("user_id", effectiveUserId),
    
    // User's players
    supabase
      .from("user_players")
      .select("player_number, description")
      .eq("user_id", effectiveUserId)
      .order("player_number"),
    
    // User's custom currency values
    supabase
      .from("user_currency_values")
      .select("currency_id, value_cents")
      .eq("user_id", effectiveUserId),
    
    // User's point value settings (which template they selected)
    supabase
      .from("user_point_value_settings")
      .select("selected_template_id")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
    
    // Point value templates
    supabase
      .from("point_value_templates")
      .select("id, name, slug, description, source_url, is_default"),
    
    // Feature flags
    supabase
      .from("user_feature_flags")
      .select("credit_tracking_enabled")
      .eq("user_id", effectiveUserId)
      .maybeSingle(),
  ]);

  // Fetch template values if user has selected a template
  let templateValues: Record<string, number> = {};
  const selectedTemplateId = userPointValueSettingsResult.data?.selected_template_id;
  if (selectedTemplateId) {
    const { data: templateValueData } = await supabase
      .from("template_currency_values")
      .select("currency_id, value_cents")
      .eq("template_id", selectedTemplateId);
    
    if (templateValueData) {
      templateValues = templateValueData.reduce((acc, tv) => {
        acc[tv.currency_id] = tv.value_cents;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  // Build currency value map (user override > template > base)
  const userValues = (userCurrencyValuesResult.data ?? []).reduce((acc, uv) => {
    acc[uv.currency_id] = uv.value_cents;
    return acc;
  }, {} as Record<string, number>);

  const getCurrencyValue = (currency: Currency): number => {
    return userValues[currency.id] ?? templateValues[currency.id] ?? currency.base_value_cents ?? 1;
  };

  // Server actions
  async function updateBalance(currencyId: string, playerNumber: number, balance: number, expirationDate: string | null, notes: string | null) {
    "use server";
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    // Upsert balance
    const { error } = await supabase
      .from("user_point_balances")
      .upsert({
        user_id: userId,
        currency_id: currencyId,
        player_number: playerNumber,
        balance,
        expiration_date: expirationDate,
        notes,
        updated_at: new Date().toISOString(),
        last_update_source: "manual",
      }, {
        onConflict: "user_id,currency_id,player_number"
      });

    if (!error) {
      // Log history
      await supabase.from("user_point_balance_history").insert({
        user_id: userId,
        currency_id: currencyId,
        player_number: playerNumber,
        balance,
        recorded_at: new Date().toISOString(),
      });
    }

    revalidatePath("/points");
  }

  async function deleteBalance(currencyId: string, playerNumber: number) {
    "use server";
    const supabase = createClient();
    const userId = await getEffectiveUserId();
    if (!userId) return;

    await supabase
      .from("user_point_balances")
      .delete()
      .eq("user_id", userId)
      .eq("currency_id", currencyId)
      .eq("player_number", playerNumber);

    revalidatePath("/points");
  }

  const currencies = (currenciesResult.data ?? []) as Currency[];
  const balances = (balancesResult.data ?? []) as PointBalance[];
  const players = playersResult.data ?? [];
  const creditTrackingEnabled = featureFlagsResult.data?.credit_tracking_enabled ?? false;

  // Create a value lookup for each currency
  const currencyValues: Record<string, number> = {};
  currencies.forEach(c => {
    currencyValues[c.id] = getCurrencyValue(c);
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader 
        isAdmin={isAdmin} 
        creditTrackingEnabled={creditTrackingEnabled}
        emulationInfo={emulationInfo}
      />
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Points Balances</h1>
          <p className="text-zinc-400 mt-1">Track your points and miles across all currencies</p>
        </div>

        <PointsClient
          currencies={currencies}
          balances={balances}
          players={players}
          currencyValues={currencyValues}
          onUpdateBalance={updateBalance}
          onDeleteBalance={deleteBalance}
        />
      </main>
    </div>
  );
}
