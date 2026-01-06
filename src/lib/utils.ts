import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC.
 * This prevents the off-by-one-day bug when displaying dates in local timezone.
 * 
 * When you do `new Date("2025-01-01")`, JavaScript parses it as UTC midnight,
 * which becomes Dec 31, 2024 in US timezones. This function parses it as local midnight.
 */
export function parseLocalDate(dateString: string): Date {
  // Handle ISO datetime strings (with time component)
  if (dateString.includes("T")) {
    return new Date(dateString);
  }
  
  // For date-only strings (YYYY-MM-DD), parse as local time
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string for display, handling timezone correctly.
 */
export function formatDate(dateString: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return "";
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", options ?? { month: "short", year: "numeric" });
}
