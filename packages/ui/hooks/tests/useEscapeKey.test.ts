import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEscapeKey, shouldTriggerEscapeKey } from '../useEscapeKey';

describe('useEscapeKey & shouldTriggerEscapeKey', () => {
  it('should export useEscapeKey function', () => {
    expect(typeof useEscapeKey).toBe('function');
  });

  it('should identify Escape key accurately', () => {
    expect(shouldTriggerEscapeKey({ key: 'Escape' } as KeyboardEvent)).toBe(true);
    expect(shouldTriggerEscapeKey({ key: 'Enter' } as KeyboardEvent)).toBe(false);
    expect(shouldTriggerEscapeKey({ key: 'Tab' } as KeyboardEvent)).toBe(false);
  });

  it('should invoke handler when Escape key is pressed', () => {
    const handler = vi.fn();

    renderHook(() => useEscapeKey(handler));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not invoke handler when enabled is false', () => {
    const handler = vi.fn();

    renderHook(() => useEscapeKey(handler, { enabled: false }));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
