import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BenefitsViewerIndexPage() {
  const supabase = createClient();
  const { data: cards } = await supabase
    .from("card_with_currency")
    .select("id")
    .gt("annual_fee", 0)
    .order("issuer_name")
    .order("name");

  if (!cards?.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-lg font-semibold text-white">Benefits Viewer</h1>
        <p className="mt-2 text-sm text-zinc-400">No paid cards in database.</p>
      </div>
    );
  }

  redirect(`/admin/benefits-viewer/${cards[0].id}`);
}
