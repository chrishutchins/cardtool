"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState, useMemo } from "react";
import { EmulationBanner } from "./emulation-banner";
import { stopEmulation } from "@/lib/emulation";

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", onboardingId: "dashboard" },
  { href: "/wallet", label: "Wallet", onboardingId: "wallet" },
  { href: "/returns", label: "Earnings", onboardingId: "earnings" },
  { href: "/compare", label: "Compare", onboardingId: "compare" },
  { href: "/spending", label: "Spending", onboardingId: "spending" },
  { href: "/point-values", label: "Point Values", onboardingId: "point-values" },
  { href: "/settings", label: "Settings", onboardingId: "settings" },
];

interface EmulationInfo {
  isEmulating: boolean;
  emulatedUserId: string | null;
  emulatedUserEmail: string | null;
  realUserId: string;
}

interface UserHeaderProps {
  isAdmin?: boolean;
  creditTrackingEnabled?: boolean;
  emulationInfo?: EmulationInfo | null;
}

export function UserHeader({ isAdmin = false, creditTrackingEnabled = true, emulationInfo }: UserHeaderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Build nav items dynamically based on feature flags
  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    
    // Add Credits link if enabled for user or if admin (after Compare, 4th position)
    if (creditTrackingEnabled || isAdmin) {
      const compareIndex = items.findIndex(item => item.href === "/compare");
      items.splice(compareIndex + 1, 0, { 
        href: "/credits", 
        label: "Credits", 
        onboardingId: "credits" 
      });
      
      // Add Inventory link after Credits
      const creditsIndex = items.findIndex(item => item.href === "/credits");
      items.splice(creditsIndex + 1, 0, { 
        href: "/inventory", 
        label: "Inventory", 
        onboardingId: "inventory" 
      });
    }
    
    // Add Rules link after Spending
    const spendingIndex = items.findIndex(item => item.href === "/spending");
    items.splice(spendingIndex + 1, 0, { 
      href: "/rules", 
      label: "Rules", 
      onboardingId: "rules" 
    });
    
    return items;
  }, [creditTrackingEnabled, isAdmin]);

  return (
    <>
      {emulationInfo?.isEmulating && emulationInfo.emulatedUserId && (
        <EmulationBanner
          emulatedUserEmail={emulationInfo.emulatedUserEmail}
          emulatedUserId={emulationInfo.emulatedUserId}
          onStopEmulation={stopEmulation}
        />
      )}
      <nav className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-white">
              <span className="text-blue-400">Card</span>
              <span>Tool</span>
            </Link>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-onboarding={item.onboardingId}
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
                  {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
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
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Admin →
              </Link>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
