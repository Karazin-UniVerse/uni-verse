import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToday } from './useToday';

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
});
