import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Footer } from "@/components/footer";
import { CheckCircle, Lock, Target, Wallet, BarChart3 } from "lucide-react";
import { Metadata } from "next";
import { HomeNav } from "@/components/home-nav";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "CardTool - Maximize Your Credit Card Rewards",
  description:
    "Track 100+ credit cards. Optimize spending across 30+ categories. Never leave rewards on the table.",
};

export default async function Home() {
  // Redirect authenticated users to dashboard
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <HomeNav isAdmin={isAdmin} />

      {/* Hero Section */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
              See exactly which cards
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                earn you the most
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
              Track all your cards and credits. Optimize spending across 30+ categories.
              Never leave rewards on the table.
            </p>

            {/* Social Proof */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span>100+ cards tracked</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span>30+ spending categories</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <span>Invite-only beta</span>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-center gap-4">
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Open Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Sign In
                </Link>
              </SignedOut>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  View Cards Database
                </Link>
              )}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Optimize Your Spending
              </h3>
              <p className="mt-2 text-zinc-400">
                See which card earns the most for all your spending, factoring in
                caps, other cards, how you redeem points, and more.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Know Your True Value
              </h3>
              <p className="mt-2 text-zinc-400">
                Track credits, perks, and rewards to see if your cards are
                actually worth their annual fees.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Make Smarter Decisions
              </h3>
              <p className="mt-2 text-zinc-400">
                Compare potential new cards against your wallet and see exactly
                how much more you&apos;d earn.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
