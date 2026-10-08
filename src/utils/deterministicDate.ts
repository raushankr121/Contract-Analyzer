import type { ReminderAlert } from '../types/contract';

/**
 * Deterministic Date Engine
 * All calculations use zero heuristics or arbitrary guessing.
 * Formulas are strictly mathematical offsets from verified dates.
 */

export function parseISODate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const date = new Date(year, month, day);
  return date;
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic calculation: Target Date minus N calendar days
 */
export function subtractDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() - days);
  return formatISODate(d);
}

/**
 * Deterministic calculation: Target Date plus N calendar days
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

/**
 * Deterministic calculation: Add N months (e.g. for initial term or renewal period)
 */
export function addMonths(dateStr: string, months: number): string {
  const d = parseISODate(dateStr);
  if (!d) return dateStr;
  d.setMonth(d.getMonth() + months);
  // Roll back 1 day to represent end of term (e.g. Jan 15 2025 + 12m = Jan 14 2026)
  d.setDate(d.getDate() - 1);
  return formatISODate(d);
}

/**
 * Deterministic Renewal Deadline Calculation
 * Formula: Renewal Deadline = Expiry Date - Notice Window (days)
 */
export function calculateRenewalDeadline(expiryDate: string, noticeWindowDays: number): {
  deadline: string;
  formula: string;
} {
  const deadline = subtractDays(expiryDate, noticeWindowDays);
  const formula = `Renewal Deadline = Expiry Date (${expiryDate}) - Notice Window (${noticeWindowDays} days) = ${deadline}`;
  return { deadline, formula };
}

/**
 * Difference in calendar days from current date (or reference date)
 */
export function getDaysRemaining(targetDateStr: string, referenceDateStr?: string): number {
  const target = parseISODate(targetDateStr);
  if (!target) return 0;
  
  const ref = referenceDateStr ? parseISODate(referenceDateStr) : new Date();
  if (!ref) return 0;
  
  // Normalize both to midnight UTC for pure calendar day comparison
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcRef = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
  
  const diffMs = utcTarget - utcRef;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate standard deterministic reminder triggers for any due date
 * Triggers: T-90, T-60, T-30, T-14, T-7, T-1 days
 */
export function generateDeterministicReminders(
  targetDate: string,
  labelPrefix: string,
  intervals: number[] = [90, 60, 30, 14, 7, 1]
): ReminderAlert[] {
  return intervals.map((daysBefore) => {
    const alertDate = subtractDays(targetDate, daysBefore);
    const daysRemaining = getDaysRemaining(alertDate);
    
    let alertLevel: 'CRITICAL' | 'WARNING' | 'INFO' = 'INFO';
    if (daysBefore <= 7) alertLevel = 'CRITICAL';
    else if (daysBefore <= 30) alertLevel = 'WARNING';
    
    return {
      id: `rem-${targetDate}-${daysBefore}`,
      label: `${labelPrefix} (T-${daysBefore}d Warning)`,
      date: alertDate,
      daysBefore,
      alertLevel,
      isPast: daysRemaining < 0,
      daysRemaining,
      triggerDescription: `Deterministic trigger ${daysBefore} calendar days prior to ${targetDate}`,
    };
  });
}

/**
 * Classifies deadline urgency
 */
export function getUrgencyTier(daysRemaining: number): {
  tier: 'OVERDUE' | 'URGENT' | 'UPCOMING' | 'LATER';
  label: string;
  colorClass: string;
} {
  if (daysRemaining < 0) {
    return { tier: 'OVERDUE', label: `${Math.abs(daysRemaining)} days overdue`, colorClass: 'badge-overdue' };
  }
  if (daysRemaining <= 14) {
    return { tier: 'URGENT', label: `${daysRemaining} days remaining (Critical)`, colorClass: 'badge-critical' };
  }
  if (daysRemaining <= 60) {
    return { tier: 'UPCOMING', label: `${daysRemaining} days remaining (Action required)`, colorClass: 'badge-warning' };
  }
  return { tier: 'LATER', label: `${daysRemaining} days remaining`, colorClass: 'badge-neutral' };
}

/**
 * Human friendly date formatter
 */
export function formatFriendlyDate(dateStr: string): string {
  const d = parseISODate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
