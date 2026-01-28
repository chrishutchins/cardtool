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

/**
 * Convert a Date object to YYYY-MM-DD string in LOCAL timezone (not UTC).
 * 
 * IMPORTANT: Do NOT use `date.toISOString().split('T')[0]` - that converts to UTC
 * which can shift the date by ±1 day depending on timezone.
 * 
 * Use this function instead when you need to store a date from a Date object.
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract the date portion (YYYY-MM-DD) from an ISO string WITHOUT timezone conversion.
 * 
 * This is safe to use when you receive ISO strings from external APIs and want to
 * preserve the date as-is without any timezone shifting.
 * 
 * Example: "2024-11-07T08:00:00.000+0000" → "2024-11-07"
 */
export function extractDateFromISO(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  // For ISO strings, just take the date part directly (first 10 characters: YYYY-MM-DD)
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}
