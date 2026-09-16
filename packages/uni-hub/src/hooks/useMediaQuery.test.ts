import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Breakpoint } from '@universe/core';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery hook', () => {
  it('returns serverFallback when rendered in SSR / Node environment', () => {
    const TestComponent = () => {
      const isMatched = useMediaQuery(Breakpoint.MD, 'less', false);

      return React.createElement('div', { 'data-testid': 'result' }, String(isMatched));
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('false');
  });

  it('respects true serverFallback in SSR / Node environment', () => {
    const TestComponent = () => {
      const isMatched = useMediaQuery(Breakpoint.MD, 'wider', true);

      return React.createElement('div', { 'data-testid': 'result' }, String(isMatched));
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('true');
  });

  it('handles raw query string in SSR', () => {
    const TestComponent = () => {
      const isMatched = useMediaQuery('(min-width: 1024px)', true);

      return React.createElement('div', { 'data-testid': 'result' }, String(isMatched));
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('true');
  });
});
