import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { useEscapeKey } from './useEscapeKey';

describe('useEscapeKey hook', () => {
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

    const handler = vi.fn();

    useEscapeKey(handler);

    for (const effect of effects) {
      effect();
    }

    expect(listeners.keydown).toBeUndefined();
  });

  it('registers keydown listener and invokes handler on Escape', () => {
    const handler = vi.fn();

    useEscapeKey(handler);

    const cleanups: (() => void)[] = [];

    for (const effect of effects) {
      const cleanup = effect();

      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    }

    expect(listeners.keydown).toBeDefined();

    listeners.keydown({ key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);

    listeners.keydown({ key: 'Enter' });
    expect(handler).toHaveBeenCalledTimes(1);

    for (const cleanup of cleanups) {
      cleanup();
    }

    expect(listeners.keydown).toBeUndefined();
  });

  it('does not register listener when enabled is false', () => {
    const handler = vi.fn();

    useEscapeKey(handler, { enabled: false });

    for (const effect of effects) {
      effect();
    }

    expect(listeners.keydown).toBeUndefined();
  });
});
