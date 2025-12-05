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
        annual_fee_cents,
        default_earn_rate,
        primary_currency_id,
        secondary_currency_id,
        issuers:issuer_id (name),
        primary_currency:reward_currencies!cards_primary_currency_id_fkey (name, code, currency_type),
        secondary_currency:reward_currencies!cards_secondary_currency_id_fkey (name, code, currency_type)
      )
    `)
    .eq("user_id", user.id);

  // Get currency enablers for user's cards
  const userCardIds = walletCards?.map((wc) => wc.card_id) ?? [];
  
  // Only query enablers if user has cards (empty array in .in() can cause issues)
  const { data: enablers } = userCardIds.length > 0
    ? await supabase
        .from("card_currency_enablers")
        .select("card_id, enabler_card_id")
        .in("card_id", userCardIds)
    : { data: [] };

  // Calculate which cards have their secondary currency enabled
  const enabledSecondaryCards = new Set<string>();
  enablers?.forEach((enabler) => {
    if (userCardIds.includes(enabler.enabler_card_id)) {
      enabledSecondaryCards.add(enabler.card_id);
    }
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
    // Only delete if the wallet entry belongs to the current user
    await supabase
      .from("user_wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", user.id);
    revalidatePath("/wallet");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
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
            onRemove={removeFromWallet}
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

