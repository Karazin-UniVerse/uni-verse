import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { shouldTriggerClickOutside, useClickOutside } from '../useClickOutside';

describe('useClickOutside & shouldTriggerClickOutside', () => {
  it('should export useClickOutside function', () => {
    expect(typeof useClickOutside).toBe('function');
  });

  it('should return false when target or eventTarget is missing', () => {
    const node = {} as Node;

    expect(shouldTriggerClickOutside(null, node)).toBe(false);
    expect(shouldTriggerClickOutside(node, null)).toBe(false);
    expect(shouldTriggerClickOutside(null, null)).toBe(false);
  });

  it('should return false when target contains eventTarget', () => {
    const child = {} as Node;
    const parent = {
      contains: vi.fn((n: unknown) => n === child),
    } as unknown as Node;

    expect(shouldTriggerClickOutside(parent, child)).toBe(false);
    expect(parent.contains).toHaveBeenCalledWith(child);
  });

  it('should return false when ignoreElement contains eventTarget', () => {
    const eventTarget = {} as Node;
    const target = {
      contains: vi.fn(() => false),
    } as unknown as Node;
    const ignoreElement = {
      contains: vi.fn((n: unknown) => n === eventTarget),
    } as unknown as Node;

    expect(shouldTriggerClickOutside(target, eventTarget, ignoreElement)).toBe(false);
  });

  it('should return true when eventTarget is outside target and ignoreElement', () => {
    const outsideNode = {} as Node;
    const target = {
      contains: vi.fn(() => false),
    } as unknown as Node;
    const ignoreElement = {
      contains: vi.fn(() => false),
    } as unknown as Node;

    expect(shouldTriggerClickOutside(target, outsideNode, ignoreElement)).toBe(true);
    expect(shouldTriggerClickOutside(target, outsideNode)).toBe(true);
  });

  it('should trigger handler on mousedown outside target element', () => {
    const targetEl = document.createElement('div');
    const outsideEl = document.createElement('button');

    document.body.appendChild(targetEl);
    document.body.appendChild(outsideEl);

    const handler = vi.fn();
    const ref = { current: targetEl };

    renderHook(() => useClickOutside(ref, handler));

    outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(targetEl);
    document.body.removeChild(outsideEl);
  });
});
