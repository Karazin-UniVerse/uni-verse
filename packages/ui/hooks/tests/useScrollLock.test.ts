import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollLock } from '../useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = 'auto';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('should export useScrollLock function', () => {
    expect(typeof useScrollLock).toBe('function');
  });

  it('should set body overflow to hidden when enabled', () => {
    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should not modify body overflow when enabled is false', () => {
    renderHook(() => useScrollLock(false));

    expect(document.body.style.overflow).toBe('auto');
  });

  it('should lock and restore explicit [data-scroll-container] elements', () => {
    const container = document.createElement('div');

    container.setAttribute('data-scroll-container', '');
    container.style.overflowY = 'auto';
    document.body.appendChild(container);

    const { unmount } = renderHook(() => useScrollLock(true));

    expect(container.style.overflowY).toBe('hidden');

    unmount();
    expect(container.style.overflowY).toBe('auto');

    container.remove();
  });

  it('should handle nested/stacked scroll locks without prematurely unlocking', () => {
    const hook1 = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    const hook2 = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    hook2.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    hook1.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
