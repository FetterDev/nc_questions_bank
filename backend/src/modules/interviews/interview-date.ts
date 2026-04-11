import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(value: string, fieldLabel: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new BadRequestException(`${fieldLabel} must be in YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || formatDateOnly(date) !== value) {
    throw new BadRequestException(`${fieldLabel} must be a valid date`);
  }

  return date;
}

export function parseMonth(value: string) {
  if (!MONTH_PATTERN.test(value)) {
    throw new BadRequestException('month must be in YYYY-MM format');
  }

  const monthStart = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(monthStart.getTime()) || formatMonth(monthStart) !== value) {
    throw new BadRequestException('month must be valid');
  }

  return {
    month: value,
    monthStart,
    nextMonthStart: addMonths(monthStart, 1),
  };
}

export function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatMonth(value: Date) {
  return value.toISOString().slice(0, 7);
}

export function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS);
}

export function addWeeks(value: Date, weeks: number) {
  return addDays(value, weeks * 7);
}

export function addMonths(value: Date, months: number) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1, 0, 0, 0, 0),
  );
}

export function startOfWeekUtc(value: Date) {
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(
    new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())),
    diff,
  );
}

export function endOfWeekUtc(value: Date) {
  return addDays(startOfWeekUtc(value), 6);
}

export function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function getMonthDays(monthStart: Date, nextMonthStart: Date) {
  const days: string[] = [];
  let cursor = monthStart;

  while (cursor.getTime() < nextMonthStart.getTime()) {
    days.push(formatDateOnly(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function ensureWeeklyPeriod(periodStart: Date, periodEnd: Date) {
  const diffDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS);

  if (diffDays !== 6) {
    throw new BadRequestException(
      'Interview cycle period must span exactly 7 calendar days',
    );
  }
}

export function isDateWithinRange(value: Date, rangeStart: Date, rangeEnd: Date) {
  return value.getTime() >= rangeStart.getTime() && value.getTime() <= rangeEnd.getTime();
}

export function createWeeklyBuckets(from: Date, to: Date) {
  const buckets: Array<{
    start: Date;
    end: Date;
    label: string;
  }> = [];
  let cursor = startOfWeekUtc(from);
  const end = endOfWeekUtc(to);

  while (cursor.getTime() <= end.getTime()) {
    const bucketEnd = addDays(cursor, 6);

    buckets.push({
      start: cursor,
      end: bucketEnd,
      label: formatDateOnly(cursor),
    });

    cursor = addWeeks(cursor, 1);
  }

  return buckets;
}
