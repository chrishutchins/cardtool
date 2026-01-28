"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  onboardingId?: string;
  exact?: boolean;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(item: NavEntry): item is NavGroup {
  return "items" in item;
}

// Grouped navigation structure for signed-in users
const baseNavGroups: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", onboardingId: "dashboard" },
  {
    label: "Cards",
    items: [
      { href: "/wallet", label: "Wallet", onboardingId: "wallet" },
      { href: "/compare", label: "Compare", onboardingId: "compare" },
      { href: "/credits", label: "Credits", onboardingId: "credits" },
      { href: "/offers", label: "Offers", onboardingId: "offers" },
    ],
  },
  {
    label: "Rewards",
    items: [
      { href: "/balances", label: "Balances", onboardingId: "balances" },
      { href: "/inventory", label: "Inventory", onboardingId: "inventory" },
      { href: "/transfer-partners", label: "Transfer Partners", onboardingId: "transfer-partners" },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/spend-optimizer", label: "Spend Optimizer", onboardingId: "spend-optimizer" },
      { href: "/application-rules", label: "Application Rules", onboardingId: "application-rules" },
      { href: "/credit-report", label: "Credit Report", onboardingId: "credit-report" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/point-values", label: "Point Values", onboardingId: "point-values" },
      { href: "/spending", label: "Spending", onboardingId: "spending" },
      { href: "/settings", label: "Other Settings", onboardingId: "settings" },
    ],
  },
];

/** Filter navigation based on admin status */
function getNavGroups(isAdmin: boolean): NavEntry[] {
  return baseNavGroups.map((entry) => {
    if (isNavGroup(entry)) {
      return {
        ...entry,
        items: entry.items.filter((item) => !item.adminOnly || isAdmin),
      };
    }
    return entry;
  });
}

interface HomeNavProps {
  isAdmin?: boolean;
}

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if any item in the group is active
  const isGroupActive = group.items.some((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 text-sm transition-colors ${
          isGroupActive
            ? "text-white"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-[80] py-1">
          {group.items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-onboarding={item.onboardingId}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HomeNav({ isAdmin = false }: HomeNavProps) {
  const pathname = usePathname();
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

            {/* Desktop nav with dropdowns */}
            <div className="hidden min-[900px]:flex items-center gap-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
              <SignedIn>
                {getNavGroups(isAdmin).map((item) => {
                  if (isNavGroup(item)) {
                    return <NavDropdown key={item.label} group={item} pathname={pathname} />;
                  }

                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-onboarding={item.onboardingId}
                      className={`text-sm transition-colors ${
                        isActive ? "text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </SignedIn>
            </div>

            {/* Mobile dropdown button */}
            <SignedIn>
              <div className="min-[900px]:hidden relative">
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
                  <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-[70] py-1">
                    {isAdmin && (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setIsOpen(false)}
                          className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                          Admin
                        </Link>
                        <div className="border-t border-zinc-700 my-1" />
                      </>
                    )}
                    {getNavGroups(isAdmin).map((entry, index) => {
                      if (isNavGroup(entry)) {
                        // Render group with section header
                        return (
                          <div key={entry.label}>
                            {index > 0 && <div className="border-t border-zinc-700 my-1" />}
                            <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                              {entry.label}
                            </div>
                            {entry.items.map((item) => {
                              const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  data-onboarding={item.onboardingId}
                                  onClick={() => setIsOpen(false)}
                                  className={`block pl-6 pr-4 py-2 text-sm transition-colors ${
                                    isActive
                                      ? "bg-zinc-700 text-white"
                                      : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                  }`}
                                >
                                  {item.label}
                                </Link>
                              );
                            })}
                          </div>
                        );
                      }

                      // Render standalone item
                      const isActive = entry.exact
                        ? pathname === entry.href
                        : pathname.startsWith(entry.href);
                      return (
                        <div key={entry.href}>
                          {index > 0 && <div className="border-t border-zinc-700 my-1" />}
                          <Link
                            href={entry.href}
                            data-onboarding={entry.onboardingId}
                            onClick={() => setIsOpen(false)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                            }`}
                          >
                            {entry.label}
                          </Link>
                        </div>
                      );
                    })}
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
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  );
}
