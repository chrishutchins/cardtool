import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Footer } from "@/components/footer";
import { CheckCircle, Lock, CreditCard, TrendingUp, Calculator } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CardTool - Maximize Your Credit Card Rewards",
  description:
    "Track 100+ credit cards. Optimize spending across 30+ categories. Never leave rewards on the table.",
};

export default async function Home() {
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white">
              <span className="text-blue-400">Card</span>
              <span>Tool</span>
            </Link>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
              <SignedIn>
                <Link
                  href="/wallet"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  My Wallet
                </Link>
                <Link
                  href="/returns"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Earnings
                </Link>
                <Link
                  href="/compare"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Compare
                </Link>
                <Link
                  href="/credits"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Credits
                </Link>
                <Link
                  href="/spending"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Spending
                </Link>
                <Link
                  href="/point-values"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Point Values
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Settings
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
              See exactly which card
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                earns you the most
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
              Track 100+ credit cards. Optimize spending across 30+ categories.
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
                  href="/wallet"
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Open My Wallet
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
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Track Your Cards
              </h3>
              <p className="mt-2 text-zinc-400">
                Add all your credit cards to your wallet and see their earning
                rates at a glance.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Currency Upgrades
              </h3>
              <p className="mt-2 text-zinc-400">
                Automatically detect when holding one card upgrades
                another&apos;s rewards currency.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Spending Caps
              </h3>
              <p className="mt-2 text-zinc-400">
                Track bonus category caps and know when rates change mid-year.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-32">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Add Your Cards
                </h3>
                <p className="text-zinc-400">
                  Add the credit cards you carry to your virtual wallet.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                  2
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Enter Your Spending
                </h3>
                <p className="text-zinc-400">
                  Tell us how much you spend in each category annually.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  See Your Earnings
                </h3>
                <p className="text-zinc-400">
                  View which card to use for maximum rewards on every purchase.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-32 text-center">
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to maximize your rewards?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                Join the beta and start seeing exactly how much you could be
                earning with your credit cards.
              </p>
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Get Started for Free
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/wallet"
                  className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Go to My Wallet
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
