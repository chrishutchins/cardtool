"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/issuers", label: "Issuers" },
  { href: "/admin/currencies", label: "Currencies" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/cards", label: "Cards" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-xl font-bold text-white">
              CardTool <span className="text-xs font-normal text-zinc-500">Admin</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-zinc-700 pr-4">
              <span className="text-xs text-zinc-500">User View:</span>
              <Link
                href="/wallet"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Wallet
              </Link>
              <Link
                href="/settings"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Settings
              </Link>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  );
}

