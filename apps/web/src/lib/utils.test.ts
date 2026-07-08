import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cn, formatKobo, formatDate, formatRelativeDate } from './utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('drops falsy values', () => {
    expect(cn('text-ink', false, undefined, null, 'font-medium')).toBe('text-ink font-medium');
  });
});

describe('formatKobo', () => {
  it('formats whole naira amounts with no decimals', () => {
    expect(formatKobo(76900_00)).toBe('₦76,900');
  });

  it('keeps decimals only when the amount has a kobo remainder', () => {
    expect(formatKobo(7450)).toBe('₦74.50');
  });

  it('formats zero as a whole amount', () => {
    expect(formatKobo(0)).toBe('₦0');
  });
});

describe('formatDate', () => {
  it('formats a date string as medium en-NG style', () => {
    expect(formatDate('2026-06-22T00:00:00Z')).toMatch(/22 Jun(e)? 2026|Jun 22, 2026/);
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for the current day', () => {
    expect(formatRelativeDate('2026-07-07T09:00:00Z')).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    expect(formatRelativeDate('2026-07-06T09:00:00Z')).toBe('Yesterday');
  });

  it('returns "Nd ago" for less than a week ago', () => {
    expect(formatRelativeDate('2026-07-02T09:00:00Z')).toBe('5d ago');
  });

  it('falls back to a formatted date for a week or more ago', () => {
    const result = formatRelativeDate('2026-06-01T09:00:00Z');
    expect(result).not.toMatch(/ago|Today|Yesterday/);
  });
});
