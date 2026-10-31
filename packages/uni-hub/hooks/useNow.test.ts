import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from './useNow';

describe('useNow', () => {
  const BASE_TIMESTAMP = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIMESTAMP);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return current timestamp on initial render', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current).toBe(BASE_TIMESTAMP);
  });

  it('should update timestamp after intervalMs elapsed', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current).toBe(BASE_TIMESTAMP);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(BASE_TIMESTAMP + 1000);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(BASE_TIMESTAMP + 2000);
  });

  it('should clear interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { result, unmount } = renderHook(() => useNow());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(BASE_TIMESTAMP);
  });

  it('should respect custom intervalMs parameter', () => {
    const customInterval = 2500;
    const { result } = renderHook(() => useNow(customInterval));

    expect(result.current).toBe(BASE_TIMESTAMP);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current).toBe(BASE_TIMESTAMP);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(BASE_TIMESTAMP + 2500);
  });

  it('should reset interval when intervalMs changes', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { rerender, result } = renderHook(({ interval }) => useNow(interval), {
      initialProps: { interval: 1000 },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(BASE_TIMESTAMP + 1000);

    rerender({ interval: 500 });

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(BASE_TIMESTAMP + 1500);
  });
});
