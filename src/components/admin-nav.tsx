"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/issuers", label: "Issuers" },
  { href: "/admin/currencies", label: "Currencies" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/multipliers", label: "Multipliers" },
  { href: "/admin/spending", label: "Spending" },
  { href: "/admin/point-values", label: "Point Values" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-white">
              CardTool <span className="text-xs font-normal text-zinc-500">Admin</span>
            </Link>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
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
                onClick={() => setIsOpen(!isOpen)}
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
                <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-50">
                  {navItems.map((item) => {
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
