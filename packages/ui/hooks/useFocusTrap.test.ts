import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RefObject } from 'react';

type EffectCallback = () => void | (() => void);

const effects: EffectCallback[] = [];

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  return {
    ...actual,
    useRef: vi.fn((val) => ({ current: val })),
    useEffect: vi.fn((fn: EffectCallback) => {
      effects.push(fn);
    }),
  };
});

import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap hook', () => {
  let listeners: Record<string, (event: unknown) => void> = {};
  let rafCallback: FrameRequestCallback | null = null;
  const mockRaf = vi.fn((callback: FrameRequestCallback) => {
    rafCallback = callback;

    return 123;
  });
  const mockCaf = vi.fn();

  beforeEach(() => {
    effects.length = 0;
    listeners = {};
    rafCallback = null;

    vi.stubGlobal('requestAnimationFrame', mockRaf);
    vi.stubGlobal('cancelAnimationFrame', mockCaf);
    vi.stubGlobal('document', {
      activeElement: null,
      addEventListener: vi.fn((event: string, callback: (e: unknown) => void) => {
        listeners[event] = callback;
      }),
      removeEventListener: vi.fn((event: string) => {
        delete listeners[event];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('handles SSR environment when document is undefined', () => {
    vi.stubGlobal('document', undefined);

    const ref: RefObject<HTMLElement | null> = { current: null };

    useFocusTrap(ref);

    for (const effect of effects) {
      effect();
    }

    expect(mockRaf).not.toHaveBeenCalled();
    expect(listeners.keydown).toBeUndefined();
  });

  it('focuses first element and traps Tab / Shift+Tab', () => {
    const firstButton = { focus: vi.fn() };
    const lastButton = { focus: vi.fn() };
    const container = {
      focus: vi.fn(),
      querySelectorAll: vi.fn(() => [firstButton, lastButton]),
    } as unknown as HTMLElement;

    const previouslyFocused = { focus: vi.fn() };

    (document as { activeElement: unknown }).activeElement = previouslyFocused;

    const ref: RefObject<HTMLElement | null> = { current: container };

    useFocusTrap(ref, { enabled: true, restoreFocus: true });

    const cleanups: (() => void)[] = [];

    for (const effect of effects) {
      const cleanup = effect();

      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    }

    expect(mockRaf).toHaveBeenCalledTimes(1);

    if (rafCallback) {
      (rafCallback as (t: number) => void)(0);
    }

    expect(firstButton.focus).toHaveBeenCalledTimes(1);

    // Forward Tab from last element
    (document as { activeElement: unknown }).activeElement = lastButton;

    const preventDefaultTab = vi.fn();

    listeners.keydown({
      key: 'Tab',
      shiftKey: false,
      preventDefault: preventDefaultTab,
    });

    expect(preventDefaultTab).toHaveBeenCalledTimes(1);
    expect(firstButton.focus).toHaveBeenCalledTimes(2);

    // Backward Shift+Tab from first element
    (document as { activeElement: unknown }).activeElement = firstButton;

    const preventDefaultShiftTab = vi.fn();

    listeners.keydown({
      key: 'Tab',
      shiftKey: true,
      preventDefault: preventDefaultShiftTab,
    });

    expect(preventDefaultShiftTab).toHaveBeenCalledTimes(1);
    expect(lastButton.focus).toHaveBeenCalledTimes(1);

    // Cleanup and verify focus restoration
    for (const cleanup of cleanups) {
      cleanup();
    }

    expect(mockCaf).toHaveBeenCalledWith(123);
    expect(listeners.keydown).toBeUndefined();
    expect(previouslyFocused.focus).toHaveBeenCalledTimes(1);
  });

  it('focuses container when no focusable elements are found', () => {
    const container = {
      focus: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    } as unknown as HTMLElement;

    const ref: RefObject<HTMLElement | null> = { current: container };

    useFocusTrap(ref);

    for (const effect of effects) {
      effect();
    }

    if (rafCallback) {
      (rafCallback as (t: number) => void)(0);
    }

    expect(container.focus).toHaveBeenCalledTimes(1);
  });
});
