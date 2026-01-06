"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";

const navItems = [
  { href: "/wallet", label: "My Wallet", onboardingId: "wallet" },
  { href: "/returns", label: "Earnings", onboardingId: "earnings" },
  { href: "/compare", label: "Compare", onboardingId: "compare" },
  { href: "/credits", label: "Credits", onboardingId: "credits" },
  { href: "/spending", label: "Spending", onboardingId: "spending" },
  { href: "/point-values", label: "Point Values", onboardingId: "point-values" },
  { href: "/settings", label: "Settings", onboardingId: "settings" },
];

interface HomeNavProps {
  isAdmin?: boolean;
}

export function HomeNav({ isAdmin = false }: HomeNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="border-b border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-white">
              <span className="text-blue-400">Card</span>
              <span>Tool</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
              <SignedIn>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-onboarding={item.onboardingId}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </SignedIn>
            </div>

            {/* Mobile dropdown button */}
            <SignedIn>
              <div className="md:hidden relative">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  data-mobile-menu-button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                >
                  Menu
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-[70]">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                      >
                        Admin
                      </Link>
                    )}
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-onboarding={item.onboardingId}
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </SignedIn>
          </div>

          {/* Right side - user button and auth links */}
          <div className="flex items-center gap-4">
            <SignedIn>
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
  );
}
