/**
 * Billing Cycle Calculator
 * 
 * Handles issuer-specific billing cycle formulas to calculate:
 * - Last statement close date
 * - Next statement close date
 * - Next payment due date
 */

// ============================================================================
// Types
// ============================================================================

export type BillingCycleFormula = 
  | 'due_minus_25'              // Cap1: Close = 25 days before due
  | 'due_minus_25_skip_sat'     // Amex, Wells Fargo: Close = 25 days before (26 if Saturday)
  | 'bilt_formula'              // Bilt: Same as Amex/Wells Fargo
  | 'due_plus_3'                // Chase cobrand + personal UR: Close = Due day + 3
  | 'due_plus_6'                // Chase business UR: Close = Due day + 6
  | 'close_plus_27_skip_weekend' // BoA Business: Due = 27 days after close (Fri → 26, Sat → 25)
  | 'boa_personal_formula'      // BoA Personal: Due day = Close day - 3 (fixed, no adjustment)
  | 'citi_formula'              // Citi: Complex formula with month boundary handling
  | 'usbank_formula';           // US Bank: Close = (due - 3)th weekday of month

export interface BillingDates {
  lastCloseDate: Date | null;
  nextCloseDate: Date | null;
  nextDueDate: Date | null;
  isAutoCalculated: {
    close: boolean;
    due: boolean;
  };
}

export interface FormulaInfo {
  primaryInput: 'close' | 'due';
  description: string;
  shortDescription: string;
}

// ============================================================================
// Formula Information
// ============================================================================

export const FORMULA_INFO: Record<BillingCycleFormula, FormulaInfo> = {
  'due_minus_25': {
    primaryInput: 'due',
    description: 'Statement closes 25 days before payment due date',
    shortDescription: 'Close = Due - 25 days',
  },
  'due_minus_25_skip_sat': {
    primaryInput: 'due',
    description: 'Statement closes 25 days before payment due date (26 if that falls on Saturday)',
    shortDescription: 'Close = Due - 25 days (skip Sat)',
  },
  'bilt_formula': {
    primaryInput: 'due',
    description: 'Statement closes 25 days before payment due date (26 if that falls on Saturday)',
    shortDescription: 'Close = Due - 25 days (skip Sat)',
  },
  'due_plus_3': {
    primaryInput: 'due',
    description: 'Statement closes on the day-of-month that is 3 days after the due day (Chase cobrand + personal)',
    shortDescription: 'Close Day = Due Day + 3',
  },
  'due_plus_6': {
    primaryInput: 'due',
    description: 'Statement closes on the day-of-month that is 6 days after the due day (Chase business UR)',
    shortDescription: 'Close Day = Due Day + 6',
  },
  'close_plus_27_skip_weekend': {
    primaryInput: 'close',
    description: 'Payment due 27 days after statement close (Fri → 26, Sat → 25) - BoA Business',
    shortDescription: 'Due = Close + 27 days (Fri/Sat adj)',
  },
  'boa_personal_formula': {
    primaryInput: 'close',
    description: 'Payment due day = Statement close day - 3 (fixed day-of-month, no weekend adjustment) - BoA Personal',
    shortDescription: 'Due Day = Close Day - 3',
  },
  'citi_formula': {
    primaryInput: 'due',
    description: 'Close day = Due day + 4, unless due is 27th/28th then 26 days before. Weekend adjustments apply.',
    shortDescription: 'Citi formula',
  },
  'usbank_formula': {
    primaryInput: 'due',
    description: 'Statement closes on the (due day - 3)th weekday of the month. E.g., due 16th → close on 13th weekday.',
    shortDescription: 'Close = (Due - 3)th weekday',
  },
};

// ============================================================================
// Date Helpers
// ============================================================================

function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Get the next occurrence of a specific day of month from a reference date.
 * @param dayOfMonth - The target day of month (1-31)
 * @param referenceDate - The date to calculate from
 * @param includeToday - If true and today matches the target day, return today. 
 *                       If false, always return a future date (next month if today matches).
 *                       Use includeToday=true for due dates (you still owe today!),
 *                       Use includeToday=false for close dates (the NEXT close is in the future).
 */
function getNextOccurrenceOfDay(dayOfMonth: number, referenceDate: Date, includeToday: boolean = false): Date {
  const result = new Date(referenceDate);
  result.setHours(0, 0, 0, 0);
  
  // Handle days that don't exist in all months (29, 30, 31)
  const clampedDay = Math.min(dayOfMonth, getDaysInMonth(result.getFullYear(), result.getMonth()));
  
  const todayIsTargetDay = referenceDate.getDate() === clampedDay;
  const targetDayHasPassed = referenceDate.getDate() > clampedDay;
  
  if (todayIsTargetDay) {
    if (includeToday) {
      // Return today (for due dates - you still need to pay!)
      result.setDate(clampedDay);
    } else {
      // Return next month (for close dates - the NEXT close is in the future)
      result.setMonth(result.getMonth() + 1);
      const nextMonthDays = getDaysInMonth(result.getFullYear(), result.getMonth());
      result.setDate(Math.min(dayOfMonth, nextMonthDays));
    }
  } else if (targetDayHasPassed) {
    // Already past this month's occurrence, move to next month
    result.setMonth(result.getMonth() + 1);
    const nextMonthDays = getDaysInMonth(result.getFullYear(), result.getMonth());
    result.setDate(Math.min(dayOfMonth, nextMonthDays));
  } else {
    // Target day hasn't happened yet this month
    result.setDate(clampedDay);
  }
  
  return result;
}

/**
 * Get the previous occurrence of a specific day of month from a reference date.
 * @param dayOfMonth - The target day of month (1-31)
 * @param referenceDate - The date to calculate from
 * @param includeToday - If true and today matches the target day, return today.
 *                       If false, always return a past date (previous month if today matches).
 *                       Use includeToday=true for close dates in close-primary formulas (BoA).
 *                       Use includeToday=false for due dates when calculating lastClose in due-primary formulas.
 */
function getPreviousOccurrenceOfDay(dayOfMonth: number, referenceDate: Date, includeToday: boolean = true): Date {
  const result = new Date(referenceDate);
  result.setHours(0, 0, 0, 0);
  
  const clampedDay = Math.min(dayOfMonth, getDaysInMonth(result.getFullYear(), result.getMonth()));
  
  const todayIsTargetDay = referenceDate.getDate() === clampedDay;
  const targetDayHasPassed = referenceDate.getDate() > clampedDay;
  
  if (todayIsTargetDay) {
    if (includeToday) {
      // Return today
      result.setDate(clampedDay);
    } else {
      // Return previous month (for calculating lastClose when today is due day)
      result.setMonth(result.getMonth() - 1);
      const prevMonthDays = getDaysInMonth(result.getFullYear(), result.getMonth());
      result.setDate(Math.min(dayOfMonth, prevMonthDays));
    }
  } else if (targetDayHasPassed) {
    // This month's occurrence has passed, return this month
    result.setDate(clampedDay);
  } else {
    // Target day hasn't happened yet, go to previous month
    result.setMonth(result.getMonth() - 1);
    const prevMonthDays = getDaysInMonth(result.getFullYear(), result.getMonth());
    result.setDate(Math.min(dayOfMonth, prevMonthDays));
  }
  
  return result;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of month that is N days offset from a given day of month.
 * Handles month wrapping.
 */
function getDayOfMonthOffset(baseDayOfMonth: number, offset: number, referenceDate: Date): { dayOfMonth: number; monthOffset: number } {
  const tempDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), baseDayOfMonth);
  tempDate.setDate(tempDate.getDate() + offset);
  
  const monthDiff = (tempDate.getFullYear() - referenceDate.getFullYear()) * 12 + 
                    (tempDate.getMonth() - referenceDate.getMonth());
  
  return {
    dayOfMonth: tempDate.getDate(),
    monthOffset: monthDiff,
  };
}

// ============================================================================
// Formula Implementations
// ============================================================================

/**
 * Capital One: Close = 25 days before due
 * 
 * For formulas where close < due:
 * - If the close for the upcoming due has already passed, THAT is the lastClose
 * - Otherwise, lastClose is from the previous due cycle
 */
function calculateDueMinus25(dueDay: number, referenceDate: Date): { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  // Next due = upcoming payment due date
  const nextDue = getNextOccurrenceOfDay(dueDay, referenceDate, true);
  // Close for next due = 25 days before
  let closeForNextDue = subDays(nextDue, 25);
  
  let lastClose: Date;
  let nextClose: Date;
  
  if (closeForNextDue < today) {
    // The close for the upcoming due has already happened
    // So lastClose = that close, and nextClose = close for the following cycle
    lastClose = closeForNextDue;
    const futureDue = new Date(nextDue);
    futureDue.setMonth(futureDue.getMonth() + 1);
    nextClose = subDays(futureDue, 25);
  } else {
    // The close for the upcoming due hasn't happened yet
    // nextClose = that close, lastClose = close from previous due
    nextClose = closeForNextDue;
    const prevDue = getPreviousOccurrenceOfDay(dueDay, referenceDate, true);
    lastClose = subDays(prevDue, 25);
  }
  
  return {
    closeDay: lastClose.getDate(),
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Amex/Wells Fargo: Close = 25 days before due, or 26 if that falls on Saturday
 * 
 * For formulas where close < due:
 * - If the close for the upcoming due has already passed, THAT is the lastClose
 * - Otherwise, lastClose is from the previous due cycle
 */
function calculateDueMinus25SkipSat(dueDay: number, referenceDate: Date): { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  // Helper to calculate close with Saturday skip
  const calculateClose = (dueDate: Date): Date => {
    let close = subDays(dueDate, 25);
    if (isSaturday(close)) {
      close = subDays(dueDate, 26);
    }
    return close;
  };
  
  // Next due = upcoming payment due date
  const nextDue = getNextOccurrenceOfDay(dueDay, referenceDate, true);
  // Close for next due
  let closeForNextDue = calculateClose(nextDue);
  
  let lastClose: Date;
  let nextClose: Date;
  
  if (closeForNextDue < today) {
    // The close for the upcoming due has already happened
    // So lastClose = that close, and nextClose = close for the following cycle
    lastClose = closeForNextDue;
    const futureDue = new Date(nextDue);
    futureDue.setMonth(futureDue.getMonth() + 1);
    nextClose = calculateClose(futureDue);
  } else {
    // The close for the upcoming due hasn't happened yet
    // nextClose = that close, lastClose = close from previous due
    nextClose = closeForNextDue;
    const prevDue = getPreviousOccurrenceOfDay(dueDay, referenceDate, true);
    lastClose = calculateClose(prevDue);
  }
  
  return {
    closeDay: lastClose.getDate(),
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Chase cobrand + personal cards: Close day of month = Due day of month + 3
 * Note: This means if due is 15th, close is 18th (close happens AFTER due in day-of-month terms,
 * but close is for the PREVIOUS billing period)
 */
function calculateDuePlus3(dueDay: number, referenceDate: Date): { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  // For Chase, the close day is due day + 3, but it's in the same month cycle
  // Due on 15th means close on 18th
  let closeDay = dueDay + 3;
  
  // Handle month overflow (e.g., due day 29 -> close day 32 -> next month day 1 or 2)
  if (closeDay > 28) {
    // This will vary by month, we need to calculate properly
    const tempDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dueDay);
    tempDate.setDate(tempDate.getDate() + 3);
    closeDay = tempDate.getDate();
  }
  
  // For due-primary: include today for nextDue (you still need to pay!)
  // But exclude today for prevDue when calculating lastClose
  const nextDue = getNextOccurrenceOfDay(dueDay, referenceDate, true);
  const nextClose = addDays(nextDue, 3);
  
  const prevDue = getPreviousOccurrenceOfDay(dueDay, referenceDate, false);
  const lastClose = addDays(prevDue, 3);
  
  return {
    closeDay,
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Chase business UR cards: Close day of month = Due day of month + 6
 * Note: This means if due is 15th, close is 21st (close happens AFTER due in day-of-month terms,
 * but close is for the PREVIOUS billing period)
 */
function calculateDuePlus6(dueDay: number, referenceDate: Date): { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  // For Chase business UR cards, the close day is due day + 6
  // Due on 15th means close on 21st
  let closeDay = dueDay + 6;
  
  // Handle month overflow (e.g., due day 27 -> close day 33 -> next month day 2 or 3)
  if (closeDay > 28) {
    // This will vary by month, we need to calculate properly
    const tempDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dueDay);
    tempDate.setDate(tempDate.getDate() + 6);
    closeDay = tempDate.getDate();
  }
  
  // For due-primary: include today for nextDue (you still need to pay!)
  // But exclude today for prevDue when calculating lastClose
  const nextDue = getNextOccurrenceOfDay(dueDay, referenceDate, true);
  const nextClose = addDays(nextDue, 6);
  
  const prevDue = getPreviousOccurrenceOfDay(dueDay, referenceDate, false);
  const lastClose = addDays(prevDue, 6);
  
  return {
    closeDay,
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Bank of America Business: Due = 27 days after close
 * If 27 days lands on Friday -> 26 days (Thursday)
 * If 27 days lands on Saturday -> 25 days (Thursday)
 * 
 * NOTE: nextDue returns the NEXT payment due date (must be today or in the future).
 * If the due date for lastClose has passed, we calculate due date for nextClose instead.
 */
function calculateClosePlus27SkipWeekend(closeDay: number, referenceDate: Date): { dueDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  // For close-primary: DON'T include today for close dates (the NEXT close is in the future)
  // If today is close day, nextClose should be next month, but lastClose should be today
  const nextClose = getNextOccurrenceOfDay(closeDay, referenceDate, false);
  const lastClose = getPreviousOccurrenceOfDay(closeDay, referenceDate);
  
  // Helper to calculate due date with weekend adjustment
  const calculateDueFromClose = (closeDate: Date): Date => {
    let due = addDays(closeDate, 27);
    // Adjust for Fri/Sat - BoA business pushes EARLIER
    if (isFriday(due)) {
      due = addDays(closeDate, 26); // Move to Thursday
    } else if (isSaturday(due)) {
      due = addDays(closeDate, 25); // Move to Thursday
    }
    return due;
  };
  
  // Calculate due date for lastClose first
  let nextDue = calculateDueFromClose(lastClose);
  
  // If that due date is in the past, calculate due date for nextClose instead
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  if (nextDue < today) {
    nextDue = calculateDueFromClose(nextClose);
  }
  
  return {
    dueDay: nextDue.getDate(),
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Bank of America Personal: Due day = Close day - 3
 * Fixed day-of-month relationship, no weekend adjustment.
 * E.g., Close on 16th → Due on 13th (of next month)
 * E.g., Close on 26th → Due on 23rd (of next month)
 */
function calculateBoaPersonalFormula(closeDay: number, referenceDate: Date): { dueDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  // Due day is always close day - 3
  let dueDay = closeDay - 3;
  if (dueDay <= 0) {
    // Handle wrap-around (e.g., close on 2nd → due on 30th/29th of previous month concept)
    // But in practice, BoA close days are typically mid-month, so this is unlikely
    dueDay = dueDay + 28; // Approximate, but close day 1-3 would be rare
  }
  
  // For close-primary: DON'T include today for close dates
  const nextClose = getNextOccurrenceOfDay(closeDay, referenceDate, false);
  const lastClose = getPreviousOccurrenceOfDay(closeDay, referenceDate);
  
  // Due date is the next occurrence of dueDay after the close
  // For lastClose, find the next due after that close
  // For nextClose, find the next due after that close
  
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  // Calculate due date for lastClose (should be after lastClose)
  let nextDue = getNextOccurrenceOfDay(dueDay, lastClose, false);
  
  // If that due date is in the past, calculate due date for nextClose instead
  if (nextDue < today) {
    nextDue = getNextOccurrenceOfDay(dueDay, nextClose, false);
  }
  
  return {
    dueDay,
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Citi: Complex formula
 * - If due date is 27th or 28th: Close = 26 days before due (close < due)
 * - Otherwise: Close day = Due day + 4 (close > due)
 * - Weekend handling: Push to Friday, unless that crosses month boundary, then push to Monday
 */
function calculateCitiFormula(dueDay: number, referenceDate: Date): { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  const nextDue = getNextOccurrenceOfDay(dueDay, referenceDate, true);
  const prevDue = getPreviousOccurrenceOfDay(dueDay, referenceDate, true);
  let nextClose: Date;
  let lastClose: Date;
  
  if (dueDay === 27 || dueDay === 28) {
    // Close = 26 days before due (close < due, like Amex)
    // Calculate close for nextDue first
    let closeForNextDue = subDays(nextDue, 26);
    closeForNextDue = adjustCitiWeekend(closeForNextDue, nextDue);
    
    if (closeForNextDue < today) {
      // The close for the upcoming due has already happened
      // So lastClose = that close, and nextClose = close for the following cycle
      lastClose = closeForNextDue;
      const futureDue = new Date(nextDue);
      futureDue.setMonth(futureDue.getMonth() + 1);
      nextClose = subDays(futureDue, 26);
      nextClose = adjustCitiWeekend(nextClose, futureDue);
    } else {
      // The close for the upcoming due hasn't happened yet
      nextClose = closeForNextDue;
      lastClose = subDays(prevDue, 26);
      lastClose = adjustCitiWeekend(lastClose, prevDue);
    }
  } else {
    // Close day = Due day + 4 (close > due, like Chase)
    // nextClose = close for upcoming due (in future)
    nextClose = new Date(nextDue);
    nextClose.setDate(dueDay + 4);
    
    // If that overflows the month, wrap to next month
    if (nextClose.getMonth() !== nextDue.getMonth()) {
      const daysInMonth = getDaysInMonth(nextDue.getFullYear(), nextDue.getMonth());
      if (dueDay + 4 > daysInMonth) {
        nextClose = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, (dueDay + 4) - daysInMonth);
      }
    }
    nextClose = adjustCitiWeekend(nextClose, nextDue);
    
    // lastClose = close for previous due
    lastClose = new Date(prevDue);
    lastClose.setDate(dueDay + 4);
    if (lastClose.getMonth() !== prevDue.getMonth()) {
      const daysInMonth = getDaysInMonth(prevDue.getFullYear(), prevDue.getMonth());
      if (dueDay + 4 > daysInMonth) {
        lastClose = new Date(prevDue.getFullYear(), prevDue.getMonth() + 1, (dueDay + 4) - daysInMonth);
      }
    }
    lastClose = adjustCitiWeekend(lastClose, prevDue);
  }
  
  return {
    closeDay: nextClose.getDate(),
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * US Bank: Close = (due day - 3)th weekday of the month
 * E.g., if due is 16th, close is on the 13th weekday of the month
 */
function calculateUSBankFormula(dueDay: number, referenceDate: Date): { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date } {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  // Calculate which weekday number the close falls on
  const weekdayNumber = dueDay - 3;
  
  // Helper to find the Nth weekday of a given month
  const getNthWeekdayOfMonth = (year: number, month: number, n: number): Date => {
    const result = new Date(year, month, 1);
    let weekdayCount = 0;
    
    while (weekdayCount < n) {
      const dayOfWeek = result.getDay();
      // Monday = 1, Tuesday = 2, ..., Friday = 5 (weekdays)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        weekdayCount++;
        if (weekdayCount === n) {
          return result;
        }
      }
      result.setDate(result.getDate() + 1);
    }
    return result;
  };
  
  // Get next due
  const nextDue = getNextOccurrenceOfDay(dueDay, referenceDate, true);
  
  // Calculate close for nextDue (Nth weekday of the month containing nextDue)
  let closeForNextDue = getNthWeekdayOfMonth(nextDue.getFullYear(), nextDue.getMonth(), weekdayNumber);
  
  let lastClose: Date;
  let nextClose: Date;
  
  if (closeForNextDue < today) {
    // The close for the upcoming due has already happened
    // So lastClose = that close, and nextClose = close for the following cycle
    lastClose = closeForNextDue;
    const futureMonth = new Date(nextDue);
    futureMonth.setMonth(futureMonth.getMonth() + 1);
    nextClose = getNthWeekdayOfMonth(futureMonth.getFullYear(), futureMonth.getMonth(), weekdayNumber);
  } else {
    // The close for the upcoming due hasn't happened yet
    nextClose = closeForNextDue;
    const prevDue = getPreviousOccurrenceOfDay(dueDay, referenceDate, true);
    lastClose = getNthWeekdayOfMonth(prevDue.getFullYear(), prevDue.getMonth(), weekdayNumber);
  }
  
  return {
    closeDay: lastClose.getDate(),
    nextClose,
    nextDue,
    lastClose,
  };
}

/**
 * Citi weekend adjustment:
 * Push to Friday unless that would cross month boundary, then push to Monday
 */
function adjustCitiWeekend(closeDate: Date, dueDate: Date): Date {
  if (!isWeekend(closeDate)) {
    return closeDate;
  }
  
  // Try Friday first
  let adjusted = new Date(closeDate);
  if (isSaturday(closeDate)) {
    adjusted = subDays(closeDate, 1); // Friday
  } else if (isSunday(closeDate)) {
    adjusted = subDays(closeDate, 2); // Friday
  }
  
  // Check if Friday is in a different month than expected
  // For Citi, close should be in the month after due (or same month for high due days)
  if (adjusted.getMonth() !== closeDate.getMonth()) {
    // Friday crossed month boundary, use Monday instead
    if (isSaturday(closeDate)) {
      adjusted = addDays(closeDate, 2); // Monday
    } else if (isSunday(closeDate)) {
      adjusted = addDays(closeDate, 1); // Monday
    }
  }
  
  return adjusted;
}

// ============================================================================
// Main Calculator Function
// ============================================================================

/**
 * Calculate billing dates based on issuer formula and user inputs.
 * 
 * @param formula - The issuer's billing cycle formula (or null for manual entry)
 * @param statementCloseDay - User-entered close day (1-31) or null
 * @param paymentDueDay - User-entered due day (1-31) or null
 * @param referenceDate - Reference date for calculations (defaults to today)
 * @returns Calculated billing dates and auto-calculation flags
 */
export function calculateBillingDates(
  formula: BillingCycleFormula | string | null,
  statementCloseDay: number | null,
  paymentDueDay: number | null,
  referenceDate: Date = new Date()
): BillingDates {
  // Normalize reference date to start of day
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);
  
  // If both values are provided, use them as manual/fixed values
  if (statementCloseDay !== null && paymentDueDay !== null) {
    // For close dates: don't include today (next close is in the future)
    // For due dates: include today (you still need to pay!)
    const nextClose = getNextOccurrenceOfDay(statementCloseDay, refDate, false);
    const lastClose = getPreviousOccurrenceOfDay(statementCloseDay, refDate);
    const nextDue = getNextOccurrenceOfDay(paymentDueDay, refDate, true);
    
    return {
      lastCloseDate: lastClose,
      nextCloseDate: nextClose,
      nextDueDate: nextDue,
      isAutoCalculated: { close: false, due: false },
    };
  }
  
  // No formula - need both inputs
  if (!formula) {
    // Calculate what we can from available data
    if (statementCloseDay !== null) {
      // For close dates: don't include today (next close is in the future)
      const nextClose = getNextOccurrenceOfDay(statementCloseDay, refDate, false);
      const lastClose = getPreviousOccurrenceOfDay(statementCloseDay, refDate);
      return {
        lastCloseDate: lastClose,
        nextCloseDate: nextClose,
        nextDueDate: null,
        isAutoCalculated: { close: false, due: false },
      };
    }
    if (paymentDueDay !== null) {
      // For due dates: include today (you still need to pay!)
      const nextDue = getNextOccurrenceOfDay(paymentDueDay, refDate, true);
      return {
        lastCloseDate: null,
        nextCloseDate: null,
        nextDueDate: nextDue,
        isAutoCalculated: { close: false, due: false },
      };
    }
    return {
      lastCloseDate: null,
      nextCloseDate: null,
      nextDueDate: null,
      isAutoCalculated: { close: false, due: false },
    };
  }
  
  // Apply formula based on type
  const validFormula = formula as BillingCycleFormula;
  const formulaInfo = FORMULA_INFO[validFormula];
  
  if (!formulaInfo) {
    // Unknown formula, treat as manual
    return calculateBillingDates(null, statementCloseDay, paymentDueDay, referenceDate);
  }
  
  // Check if we have the primary input
  if (formulaInfo.primaryInput === 'due') {
    if (paymentDueDay === null) {
      // Need due day but don't have it
      if (statementCloseDay !== null) {
        // For close dates: don't include today (next close is in the future)
        const nextClose = getNextOccurrenceOfDay(statementCloseDay, refDate, false);
        const lastClose = getPreviousOccurrenceOfDay(statementCloseDay, refDate);
        return {
          lastCloseDate: lastClose,
          nextCloseDate: nextClose,
          nextDueDate: null,
          isAutoCalculated: { close: false, due: false },
        };
      }
      return {
        lastCloseDate: null,
        nextCloseDate: null,
        nextDueDate: null,
        isAutoCalculated: { close: false, due: false },
      };
    }
    
    // Calculate based on due day
    let result: { closeDay: number; nextClose: Date; nextDue: Date; lastClose: Date };
    
    switch (validFormula) {
      case 'due_minus_25':
        result = calculateDueMinus25(paymentDueDay, refDate);
        break;
      case 'due_minus_25_skip_sat':
      case 'bilt_formula':
        result = calculateDueMinus25SkipSat(paymentDueDay, refDate);
        break;
      case 'due_plus_3':
        result = calculateDuePlus3(paymentDueDay, refDate);
        break;
      case 'due_plus_6':
        result = calculateDuePlus6(paymentDueDay, refDate);
        break;
      case 'citi_formula':
        result = calculateCitiFormula(paymentDueDay, refDate);
        break;
      case 'usbank_formula':
        result = calculateUSBankFormula(paymentDueDay, refDate);
        break;
      default:
        return calculateBillingDates(null, statementCloseDay, paymentDueDay, referenceDate);
    }
    
    return {
      lastCloseDate: result.lastClose,
      nextCloseDate: result.nextClose,
      nextDueDate: result.nextDue,
      isAutoCalculated: { close: true, due: false },
    };
    
  } else {
    // Primary input is close day (BoA formulas)
    if (statementCloseDay === null) {
      // Need close day but don't have it
      if (paymentDueDay !== null) {
        // For due dates: include today (you still need to pay!)
        const nextDue = getNextOccurrenceOfDay(paymentDueDay, refDate, true);
        return {
          lastCloseDate: null,
          nextCloseDate: null,
          nextDueDate: nextDue,
          isAutoCalculated: { close: false, due: false },
        };
      }
      return {
        lastCloseDate: null,
        nextCloseDate: null,
        nextDueDate: null,
        isAutoCalculated: { close: false, due: false },
      };
    }
    
    // Calculate based on close day
    let result: { dueDay: number; nextClose: Date; nextDue: Date; lastClose: Date };
    
    switch (validFormula) {
      case 'close_plus_27_skip_weekend':
        result = calculateClosePlus27SkipWeekend(statementCloseDay, refDate);
        break;
      case 'boa_personal_formula':
        result = calculateBoaPersonalFormula(statementCloseDay, refDate);
        break;
      default:
        result = calculateClosePlus27SkipWeekend(statementCloseDay, refDate);
    }
    
    return {
      lastCloseDate: result.lastClose,
      nextCloseDate: result.nextClose,
      nextDueDate: result.nextDue,
      isAutoCalculated: { close: false, due: true },
    };
  }
}

/**
 * Get information about a billing cycle formula.
 */
export function getFormulaInfo(formula: BillingCycleFormula | string | null): FormulaInfo | null {
  if (!formula) return null;
  return FORMULA_INFO[formula as BillingCycleFormula] ?? null;
}

/**
 * Check if a formula requires the due day as primary input.
 */
export function requiresDueDay(formula: BillingCycleFormula | string | null): boolean {
  if (!formula) return true; // Default to due day
  const info = FORMULA_INFO[formula as BillingCycleFormula];
  return !info || info.primaryInput === 'due';
}

/**
 * Check if a formula requires the close day as primary input.
 */
export function requiresCloseDay(formula: BillingCycleFormula | string | null): boolean {
  if (!formula) return true; // Manual entry needs both
  const info = FORMULA_INFO[formula as BillingCycleFormula];
  return info?.primaryInput === 'close';
}

/**
 * Format a date for display in the UI.
 */
export function formatBillingDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date with year for display.
 */
export function formatBillingDateWithYear(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
