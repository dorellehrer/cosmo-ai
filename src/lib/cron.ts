/**
 * Cron utilities — parse cron expressions and calculate next run times.
 */

import { CronExpressionParser } from 'cron-parser';

/** Calculate the next run time from a cron expression */
export function getNextRun(schedule: string, from?: Date): Date {
  const interval = CronExpressionParser.parse(schedule, {
    currentDate: from || new Date(),
  });
  return interval.next().toDate();
}

/** Check if a cron expression is valid */
export function isValidCron(schedule: string): boolean {
  try {
    CronExpressionParser.parse(schedule);
    return true;
  } catch {
    return false;
  }
}

/** Convert a cron expression to a human-readable description */
export function cronToHuman(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute === '0' && hour === '*') return 'Every hour';
  if (minute === '*/5') return 'Every 5 minutes';
  if (minute === '*/15') return 'Every 15 minutes';
  if (minute === '*/30') return 'Every 30 minutes';

  // Daily at specific time
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && hour !== '*' && minute !== '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  }

  // Weekdays at specific time
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5' && hour !== '*' && minute !== '*') {
    return `Weekdays at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  }

  // Weekly
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (dayOfMonth === '*' && month === '*' && /^\d$/.test(dayOfWeek) && hour !== '*' && minute !== '*') {
    const dayNum = parseInt(dayOfWeek);
    return `${dayNames[dayNum]}s at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC`;
  }

  return schedule;
}

/** Common schedule presets */
export const SCHEDULE_PRESETS = [
  { label: 'Every morning (8:00 AM)', value: '0 8 * * *' },
  { label: 'Every evening (6:00 PM)', value: '0 18 * * *' },
  { label: 'Weekday mornings (8:00 AM)', value: '0 8 * * 1-5' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Monday mornings (9:00 AM)', value: '0 9 * * 1' },
  { label: 'Friday afternoons (5:00 PM)', value: '0 17 * * 5' },
] as const;
