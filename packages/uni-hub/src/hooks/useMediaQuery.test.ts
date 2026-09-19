import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BREAKPOINTS } from '@universe/core';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery hook', () => {
  it('returns serverFallback when rendered in SSR / Node environment', () => {
    const TestComponent = () => {
      const isMatched = useMediaQuery(BREAKPOINTS.md, 'less', false);

      return React.createElement('div', { 'data-testid': 'result' }, String(isMatched));
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('false');
  });

  it('respects true serverFallback in SSR / Node environment', () => {
    const TestComponent = () => {
      const isMatched = useMediaQuery(BREAKPOINTS.md, 'wider', true);

      return React.createElement('div', { 'data-testid': 'result' }, String(isMatched));
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('true');
  });

  it('supports readable comparison-first signature in SSR / Node environment', () => {
    const TestComponent = () => {
      const isMobile = useMediaQuery('less', BREAKPOINTS.md, false);
      const isDesktop = useMediaQuery('wider', BREAKPOINTS.md, true);

      return React.createElement(
        'div',
        null,
        React.createElement('span', { 'data-testid': 'mobile' }, String(isMobile)),
        React.createElement('span', { 'data-testid': 'desktop' }, String(isDesktop)),
      );
    };

    const html = renderToString(React.createElement(TestComponent));

    expect(html).toContain('false');
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
