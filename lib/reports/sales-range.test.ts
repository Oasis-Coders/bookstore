import { describe, expect, it } from 'vitest';
import { monthStartStr, resolveSalesRange, todayStr } from './sales-range';

describe('todayStr / monthStartStr', () => {
  it('formats a fixed date in UTC', () => {
    const now = new Date('2026-11-13T09:30:00Z');
    expect(todayStr(now)).toBe('2026-11-13');
    expect(monthStartStr(now)).toBe('2026-11-01');
  });

  it('handles the first of the month and the new year', () => {
    expect(monthStartStr(new Date('2026-11-01T00:00:00Z'))).toBe('2026-11-01');
    expect(todayStr(new Date('2026-11-01T00:00:00Z'))).toBe('2026-11-01');
    expect(monthStartStr(new Date('2027-01-05T12:00:00Z'))).toBe('2027-01-01');
    expect(todayStr(new Date('2027-01-05T12:00:00Z'))).toBe('2027-01-05');
  });
});

describe('resolveSalesRange', () => {
  const now = new Date('2026-11-13T09:30:00Z');

  it('defaults to the 1st of the current month through today when both are missing', () => {
    expect(resolveSalesRange(undefined, undefined, now)).toEqual({
      from: '2026-11-01',
      to: '2026-11-13',
    });
  });

  it('treats empty strings as missing', () => {
    expect(resolveSalesRange('', '', now)).toEqual({
      from: '2026-11-01',
      to: '2026-11-13',
    });
  });

  it('keeps an explicitly chosen range unchanged', () => {
    expect(resolveSalesRange('2026-10-01', '2026-10-31', now)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('keeps a partial range as-is (only from)', () => {
    expect(resolveSalesRange('2026-11-01', undefined, now)).toEqual({
      from: '2026-11-01',
      to: undefined,
    });
  });

  it('keeps a partial range as-is (only to)', () => {
    expect(resolveSalesRange(undefined, '2026-11-13', now)).toEqual({
      from: undefined,
      to: '2026-11-13',
    });
  });
});
