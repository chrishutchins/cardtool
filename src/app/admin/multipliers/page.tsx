import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function MultipliersPage() {
  const supabase = await createClient();

  const { data: programs, error } = await supabase
    .from("earning_multiplier_programs")
    .select(`
      *,
      earning_multiplier_tiers(id, name, multiplier, sort_order),
      earning_multiplier_currencies(currency_id, reward_currencies(name)),
      earning_multiplier_cards(card_id, cards(name))
    `)
    .order("name");

  if (error) {
    return <div className="text-red-400">Error loading programs: {error.message}</div>;
  }

  async function createProgram(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const description = (formData.get("description") as string | null) || null;

    await supabase.from("earning_multiplier_programs").insert({
      name,
      slug,
      description,
    });
    revalidatePath("/admin/multipliers");
  }

  async function deleteProgram(id: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("earning_multiplier_programs").delete().eq("id", id);
    revalidatePath("/admin/multipliers");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Earning Multiplier Programs</h1>
          <p className="text-zinc-400 mt-1">
            Configure programs like Bank of America Preferred Rewards that multiply earnings across cards.
          </p>
        </div>
      </div>

      {/* Add New Program Form */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Program</h2>
        <form action={createProgram} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Program Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g., Bank of America Preferred Rewards"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
            <input
              type="text"
              name="description"
              placeholder="Optional description..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Add Program
            </button>
          </div>
        </form>
      </div>

      {/* Programs List */}
      <div className="space-y-4">
        {programs?.map((program) => {
          const tiers = program.earning_multiplier_tiers || [];
          const currencies = program.earning_multiplier_currencies || [];
          const cards = program.earning_multiplier_cards || [];
          const sortedTiers = [...tiers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

          return (
            <div
              key={program.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{program.name}</h3>
                    <span className="text-zinc-500 text-sm font-mono">{program.slug}</span>
                  </div>
                  {program.description && (
                    <p className="text-zinc-400 text-sm mb-4">{program.description}</p>
                  )}

                  {/* Tiers */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Tiers</h4>
                    {sortedTiers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {sortedTiers.map((tier) => (
                          <span
                            key={tier.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm"
                          >
                            {tier.name}
                            <span className="font-mono text-purple-400">{tier.multiplier}x</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-sm">No tiers configured</span>
                    )}
                  </div>

                  {/* Applies To */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Applies To</h4>
                    <div className="flex flex-wrap gap-2">
                      {currencies.map((c) => (
                        <span
                          key={c.currency_id}
                          className="inline-flex items-center px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs"
                        >
                          {(c.reward_currencies as { name: string } | null)?.name || "Unknown"}
                        </span>
                      ))}
                      {cards.map((c) => (
                        <span
                          key={c.card_id}
                          className="inline-flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs"
                        >
                          {(c.cards as { name: string } | null)?.name || "Unknown"}
                        </span>
                      ))}
                      {currencies.length === 0 && cards.length === 0 && (
                        <span className="text-zinc-500 text-sm">Not configured</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/admin/multipliers/${program.id}`}
                    className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
                  >
                    Configure
                  </Link>
                  <form action={deleteProgram.bind(null, program.id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}

        {programs?.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400">No multiplier programs yet. Add one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

