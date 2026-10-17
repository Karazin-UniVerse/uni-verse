import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return serverFallback when matchMedia is not matching', () => {
    const { result } = renderHook(() => useMediaQuery(BREAKPOINTS.md, 'less', false));

    expect(result.current).toBe(false);
  });

  it('should respect true serverFallback', () => {
    const { result } = renderHook(() => useMediaQuery(BREAKPOINTS.md, 'wider', true));

    expect(result.current).toBe(true);
  });

  it('should support readable comparison-first signature', () => {
    const { result: mobileResult } = renderHook(() => useMediaQuery('less', BREAKPOINTS.md, false));
    const { result: desktopResult } = renderHook(() =>
      useMediaQuery('wider', BREAKPOINTS.md, true),
    );

    expect(mobileResult.current).toBe(false);
    expect(desktopResult.current).toBe(true);
  });

  it('should handle raw query string with fallback', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)', true));

    expect(result.current).toBe(true);
  });
});
