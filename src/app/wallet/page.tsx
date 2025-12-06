import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { WalletCardList } from "./wallet-card-list";
import { AddCardModal } from "./add-card-modal";
import { UserHeader } from "@/components/user-header";

export default async function WalletPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get user's wallet cards with full card info
  const { data: walletCards } = await supabase
    .from("user_wallets")
    .select(`
      id,
      card_id,
      added_at,
      cards:card_id (
        id,
        name,
        slug,
        annual_fee,
        default_earn_rate,
        primary_currency_id,
        secondary_currency_id,
        issuers:issuer_id (name),
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (name, code, currency_type),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (name, code, currency_type)
      )
    `)
    .eq("user_id", user.id);

  // Get card IDs for queries
  const userCardIds = walletCards?.map((wc) => wc.card_id) ?? [];
  
  // Build set of currency IDs the user "owns" (from cards in wallet)
  const userPrimaryCurrencyIds = new Set(
    walletCards
      ?.map((wc) => wc.cards?.primary_currency_id)
      .filter((id): id is string => !!id)
  );

  // Cards with secondary currency enabled if user has a card with that as primary
  const enabledSecondaryCards = new Set<string>();
  walletCards?.forEach((wc) => {
    if (wc.cards?.secondary_currency_id && 
        userPrimaryCurrencyIds.has(wc.cards.secondary_currency_id)) {
      enabledSecondaryCards.add(wc.cards.id);
    }
  });

  // Get user's perks values for their cards
  const { data: perksValues } = userCardIds.length > 0
    ? await supabase
        .from("user_card_perks_values")
        .select("card_id, perks_value")
        .eq("user_id", user.id)
        .in("card_id", userCardIds)
    : { data: [] };

  // Build perks map
  const perksMap = new Map<string, number>();
  perksValues?.forEach((pv) => {
    perksMap.set(pv.card_id, pv.perks_value);
  });

  // Get all available cards for adding
  const { data: allCards } = await supabase
    .from("card_with_currency")
    .select("*")
    .eq("is_active", true)
    .order("issuer_name")
    .order("name");

  const cardsNotInWallet = allCards?.filter(
    (card) => card.id && !userCardIds.includes(card.id)
  ) ?? [];

  async function addToWallet(cardId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_wallets").insert({
      user_id: user.id,
      card_id: cardId,
    });
    revalidatePath("/wallet");
  }

  async function removeFromWallet(walletId: string) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  async function updatePerksValue(cardId: string, perksValue: number) {
    "use server";
    const user = await currentUser();
    if (!user) return;

    const supabase = await createClient();
    await supabase.from("user_card_perks_values").upsert(
      {
        user_id: user.id,
        card_id: cardId,
        perks_value: perksValue,
      },
      { onConflict: "user_id,card_id" }
    );
    revalidatePath("/wallet");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Wallet</h1>
            <p className="text-zinc-400 mt-1">
              {walletCards?.length ?? 0} card{walletCards?.length !== 1 ? "s" : ""} in your wallet
            </p>
          </div>
          <AddCardModal
            availableCards={cardsNotInWallet}
            onAddCard={addToWallet}
          />
        </div>

        {walletCards && walletCards.length > 0 ? (
          <WalletCardList
            walletCards={walletCards}
            enabledSecondaryCards={enabledSecondaryCards}
            perksMap={perksMap}
            onRemove={removeFromWallet}
            onUpdatePerks={updatePerksValue}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400 mb-4">Your wallet is empty.</p>
            <p className="text-zinc-500 text-sm">
              Add cards to track your rewards and see which currencies are active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
