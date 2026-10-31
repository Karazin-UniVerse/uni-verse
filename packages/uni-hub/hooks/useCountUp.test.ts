import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return target value immediately when enabled is false', () => {
    const { result } = renderHook(() => useCountUp(100, 800, false));

    expect(result.current).toBe(100);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current).toBe(100);
  });

  it('should return target value immediately when duration is 0 or negative', () => {
    const { result: zeroDurationResult, rerender: rerenderZero } = renderHook(
      ({ target }) => useCountUp(target, 0),
      { initialProps: { target: 42 } },
    );
    const { result: negativeDurationResult } = renderHook(() => useCountUp(84, -500));

    expect(zeroDurationResult.current).toBe(42);
    expect(negativeDurationResult.current).toBe(84);

    rerenderZero({ target: 100 });

    expect(zeroDurationResult.current).toBe(100);
  });

  it('should animate value toward target over duration when enabled', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 1000, true), {
      initialProps: { target: 0 },
    });

    expect(result.current).toBe(0);

    rerender({ target: 100 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  it('should synchronize immediately to new target when target updates and enabled is false', () => {
    const { result, rerender } = renderHook(
      ({ target, enabled }) => useCountUp(target, 800, enabled),
      { initialProps: { target: 10, enabled: false } },
    );

    expect(result.current).toBe(10);

    rerender({ target: 99, enabled: false });

    expect(result.current).toBe(99);

    rerender({ target: 200, enabled: true });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ target: 300, enabled: false });

    expect(result.current).toBe(300);
  });

  it('should complete animation and settle at target value', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 800, true), {
      initialProps: { target: 0 },
    });

    rerender({ target: 150 });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current).toBe(150);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current).toBe(150);
  });

  it('should cancel animation frame on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { rerender, unmount } = renderHook(({ target }) => useCountUp(target, 800, true), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });
});
