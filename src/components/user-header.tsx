"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/wallet", label: "My Wallet" },
  { href: "/returns", label: "Returns" },
  { href: "/compare", label: "Compare" },
  { href: "/spending", label: "Spending" },
  { href: "/point-values", label: "Point Values" },
  { href: "/settings", label: "Settings" },
];

export function UserHeader() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-white">
              CardTool
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
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
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Admin →
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  );
}
