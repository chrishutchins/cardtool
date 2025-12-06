import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { isCurrentUserAdmin } from "@/lib/admin";

export default async function Home() {
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white">
              CardTool
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
                  href="/spending"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  My Spending
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
      <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Maximize Your
            <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Credit Card Rewards
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Track your cards, understand earning rates, and discover which currencies
            are active in your wallet. Make smarter spending decisions.
          </p>

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
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Track Your Cards</h3>
            <p className="mt-2 text-zinc-400">
              Add all your credit cards to your wallet and see their earning rates at a glance.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Currency Upgrades</h3>
            <p className="mt-2 text-zinc-400">
              Automatically detect when holding one card upgrades another&apos;s rewards currency.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Spending Caps</h3>
            <p className="mt-2 text-zinc-400">
              Track bonus category caps and know when rates change mid-year.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
