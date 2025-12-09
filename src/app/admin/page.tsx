import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboard() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  const [issuersResult, currenciesResult, categoriesResult, cardsResult, templatesResult, usersResult] =
    await Promise.all([
      supabase.from("issuers").select("*", { count: "exact", head: true }),
      supabase.from("reward_currencies").select("*", { count: "exact", head: true }),
      supabase.from("earning_categories").select("*", { count: "exact", head: true }),
      supabase.from("cards").select("*", { count: "exact", head: true }),
      supabase.from("point_value_templates").select("*", { count: "exact", head: true }),
      supabase.from("user_wallets").select("user_id"),
    ]);

  // Count unique users
  const uniqueUserIds = new Set((usersResult.data ?? []).map((u) => u.user_id));

  const stats = [
    {
      name: "Users",
      count: uniqueUserIds.size,
      href: "/admin/users",
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    },
    {
      name: "Cards",
      count: cardsResult.count ?? 0,
      href: "/admin/cards",
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    {
      name: "Issuers",
      count: issuersResult.count ?? 0,
      href: "/admin/issuers",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      name: "Currencies",
      count: currenciesResult.count ?? 0,
      href: "/admin/currencies",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Categories",
      count: categoriesResult.count ?? 0,
      href: "/admin/categories",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      name: "Point Value Templates",
      count: templatesResult.count ?? 0,
      href: "/admin/point-values",
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className={`rounded-xl border p-6 transition-all hover:scale-[1.02] ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-80">{stat.name}</p>
            <p className="mt-2 text-4xl font-bold">{stat.count}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/cards"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <span>+</span> Add Card
          </Link>
          <Link
            href="/admin/issuers"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <span>+</span> Add Issuer
          </Link>
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <span>+</span> Add Category
          </Link>
        </div>
      </div>
    </div>
  );
}

