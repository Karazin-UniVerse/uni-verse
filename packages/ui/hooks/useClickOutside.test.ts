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

import { useClickOutside } from './useClickOutside';

describe('useClickOutside hook', () => {
  let listeners: Record<string, (event: unknown) => void> = {};

  beforeEach(() => {
    effects.length = 0;
    listeners = {};
    vi.stubGlobal('document', {
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
    const handler = vi.fn();

    useClickOutside(ref, handler);

    // Run registered effects
    for (const effect of effects) {
      effect();
    }

    expect(listeners.mousedown).toBeUndefined();
  });

  it('registers listeners and invokes handler on outside click', () => {
    const handler = vi.fn();
    const targetElement = { id: 'outside' };
    const containerElement = {
      contains: vi.fn((t) => t !== targetElement),
    } as unknown as HTMLElement;

    const ref: RefObject<HTMLElement | null> = { current: containerElement };

    useClickOutside(ref, handler);

    // Execute effects and capture cleanups
    const cleanups: (() => void)[] = [];

    for (const effect of effects) {
      const cleanup = effect();

      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    }

    expect(listeners.mousedown).toBeDefined();
    expect(listeners.touchstart).toBeDefined();

    listeners.mousedown({ target: targetElement });
    expect(handler).toHaveBeenCalledTimes(1);

    // Test cleanup
    for (const cleanup of cleanups) {
      cleanup();
    }

    expect(listeners.mousedown).toBeUndefined();
    expect(listeners.touchstart).toBeUndefined();
  });

  it('does not invoke handler on click inside element', () => {
    const handler = vi.fn();
    const targetElement = { id: 'inside' };
    const containerElement = {
      contains: vi.fn((t) => t === targetElement),
    } as unknown as HTMLElement;

    const ref: RefObject<HTMLElement | null> = { current: containerElement };

    useClickOutside(ref, handler);

    for (const effect of effects) {
      effect();
    }

    listeners.mousedown({ target: targetElement });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not invoke handler when clicking inside ignoreRef', () => {
    const handler = vi.fn();
    const triggerElement = { id: 'trigger' };
    const ignoreElement = {
      contains: vi.fn((t) => t === triggerElement),
    } as unknown as HTMLElement;

    const containerElement = {
      contains: vi.fn(() => false),
    } as unknown as HTMLElement;

    const ref: RefObject<HTMLElement | null> = { current: containerElement };
    const ignoreRef: RefObject<HTMLElement | null> = { current: ignoreElement };

    useClickOutside(ref, handler, { ignoreRef });

    for (const effect of effects) {
      effect();
    }

    listeners.mousedown({ target: triggerElement });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not register listeners when enabled is false', () => {
    const handler = vi.fn();
    const ref: RefObject<HTMLElement | null> = { current: null };

    useClickOutside(ref, handler, { enabled: false });

    for (const effect of effects) {
      effect();
    }

    expect(listeners.mousedown).toBeUndefined();
  });
});
