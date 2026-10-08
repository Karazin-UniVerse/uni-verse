import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMsUntilMidnight, useToday } from './useToday';

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns current date on initial render', () => {
    const fixedDate = new Date(2026, 9, 7, 10, 0, 0);

    vi.setSystemTime(fixedDate);

    const TestComponent = () => {
      const today = useToday();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'year' }, String(today.getFullYear())),
        React.createElement('span', { id: 'date' }, String(today.getDate())),
      );
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('id="year">2026</span>');
    expect(html).toContain('id="date">7</span>');
  });

  describe('getMsUntilMidnight', () => {
    it('calculates remaining milliseconds until tomorrow midnight', () => {
      const now = new Date(2026, 9, 7, 10, 0, 0);
      const expectedMs = 14 * 60 * 60 * 1000;

      expect(getMsUntilMidnight(now)).toBe(expectedMs);
    });

    it('clamps to minimum 1000ms when very close to midnight', () => {
      const nearMidnight = new Date(2026, 9, 7, 23, 59, 59, 900);

      expect(getMsUntilMidnight(nearMidnight)).toBe(1000);
    });

    it('uses current system time when parameter is omitted', () => {
      const fixedDate = new Date(2026, 9, 7, 20, 0, 0);

      vi.setSystemTime(fixedDate);

      const expectedMs = 4 * 60 * 60 * 1000;

      expect(getMsUntilMidnight()).toBe(expectedMs);
    });
  });
});
