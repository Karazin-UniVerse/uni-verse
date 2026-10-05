import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type EffectCallback = () => void | (() => void);

const effects: EffectCallback[] = [];

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');

  return {
    ...actual,
    useEffect: vi.fn((fn: EffectCallback) => {
      effects.push(fn);
    }),
  };
});

import { useScrollLock } from './useScrollLock';

describe('useScrollLock hook', () => {
  let mockBody: { style: { overflow: string } };

  beforeEach(() => {
    effects.length = 0;
    mockBody = { style: { overflow: 'visible' } };

    vi.stubGlobal('document', {
      body: mockBody,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('handles SSR environment when document is undefined', () => {
    vi.stubGlobal('document', undefined);

    useScrollLock(true);

    for (const effect of effects) {
      effect();
    }

    expect(mockBody.style.overflow).toBe('visible');
  });

  it('locks body scroll and restores on cleanup', () => {
    useScrollLock(true);

    const cleanups: (() => void)[] = [];

    for (const effect of effects) {
      const cleanup = effect();

      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    }

    expect(mockBody.style.overflow).toBe('hidden');

    for (const cleanup of cleanups) {
      cleanup();
    }

    expect(mockBody.style.overflow).toBe('visible');
  });

  it('handles nested locks properly without premature unlocking', () => {
    useScrollLock(true);
    useScrollLock(true);

    const cleanups: (() => void)[] = [];

    for (const effect of effects) {
      const cleanup = effect();

      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    }

    expect(mockBody.style.overflow).toBe('hidden');

    // First unmount
    if (cleanups[0]) {
      cleanups[0]();
    }

    expect(mockBody.style.overflow).toBe('hidden');

    // Second unmount
    if (cleanups[1]) {
      cleanups[1]();
    }

    expect(mockBody.style.overflow).toBe('visible');
  });

  it('does nothing when enabled is false', () => {
    useScrollLock(false);

    for (const effect of effects) {
      effect();
    }

    expect(mockBody.style.overflow).toBe('visible');
  });
});
