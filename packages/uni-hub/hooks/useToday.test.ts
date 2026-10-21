import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getMsUntilMidnight, useToday } from './useToday';

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current date in browser client environment', () => {
    const fixedDate = new Date(2026, 9, 7, 10, 0, 0);

    vi.setSystemTime(fixedDate);

    const { result } = renderHook(() => useToday());

    expect(result.current).toBeInstanceOf(Date);
    expect(result.current?.getFullYear()).toBe(2026);
    expect(result.current?.getDate()).toBe(7);
  });

  it('should return valid date when initialDate is provided', () => {
    const fixedDate = new Date(2026, 9, 7, 10, 0, 0);

    vi.setSystemTime(fixedDate);

    const { result } = renderHook(() => useToday(fixedDate));

    expect(result.current?.getFullYear()).toBe(2026);
    expect(result.current?.getDate()).toBe(7);
  });

  describe('getMsUntilMidnight', () => {
    it('should calculate remaining milliseconds until tomorrow midnight', () => {
      const now = new Date(2026, 9, 7, 10, 0, 0);
      const expectedMs = 14 * 60 * 60 * 1000;

      expect(getMsUntilMidnight(now)).toBe(expectedMs);
    });

    it('should clamp to minimum 1000ms when very close to midnight', () => {
      const nearMidnight = new Date(2026, 9, 7, 23, 59, 59, 900);

      expect(getMsUntilMidnight(nearMidnight)).toBe(1000);
    });

    it('should use current system time when parameter is omitted', () => {
      const fixedDate = new Date(2026, 9, 7, 20, 0, 0);

      vi.setSystemTime(fixedDate);

      const expectedMs = 4 * 60 * 60 * 1000;

      expect(getMsUntilMidnight()).toBe(expectedMs);
    });
  });
});
