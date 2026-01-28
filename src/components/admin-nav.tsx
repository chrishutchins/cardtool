"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Grouped navigation structure
const navGroups: (NavItem | NavGroup)[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invite-codes", label: "Invite Codes" },
  {
    label: "Cards",
    items: [
      { href: "/admin/cards", label: "Cards", exact: true },
      { href: "/admin/cards/rules", label: "Application Rules" },
      { href: "/admin/issuers", label: "Issuers" },
      { href: "/admin/brands", label: "Brands" },
      { href: "/admin/multipliers", label: "Multipliers" },
    ],
  },
  {
    label: "Currencies",
    items: [
      { href: "/admin/currencies", label: "Currencies" },
      { href: "/admin/transfer-partners", label: "Transfer Partners" },
      { href: "/admin/point-values", label: "Point Values" },
      { href: "/admin/site-configs", label: "Balance Importing" },
    ],
  },
  {
    label: "Credits",
    items: [
      { href: "/admin/credits", label: "Credits", exact: true },
      { href: "/admin/credits/transactions", label: "Transactions" },
      { href: "/admin/credits/rules", label: "Matching Rules" },
    ],
  },
  {
    label: "Categories",
    items: [
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/spending", label: "Default Spending" },
    ],
  },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/demo", label: "Demo" },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
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
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isGroupActive
            ? "bg-zinc-800 text-white"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
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

export function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-white">
              CardTool <span className="text-xs font-normal text-zinc-500">Admin</span>
            </Link>

            {/* Desktop nav with dropdowns */}
            <div className="hidden md:flex items-center gap-1">
              {navGroups.map((item) => {
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
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile dropdown button */}
            <div className="md:hidden relative">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              >
                Menu
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {mobileMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-[70] py-1">
                  {navGroups.map((entry, index) => {
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
                                onClick={() => setMobileMenuOpen(false)}
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
                          onClick={() => setMobileMenuOpen(false)}
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
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/wallet"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              User →
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  );
}
