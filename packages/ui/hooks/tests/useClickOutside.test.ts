import { describe, it, expect, vi } from 'vitest';
import { shouldTriggerClickOutside, useClickOutside } from '../useClickOutside';

describe('useClickOutside & shouldTriggerClickOutside', () => {
  it('exports useClickOutside function', () => {
    expect(typeof useClickOutside).toBe('function');
  });

  it('returns false when target or eventTarget is missing', () => {
    const node = {} as Node;

    expect(shouldTriggerClickOutside(null, node)).toBe(false);
    expect(shouldTriggerClickOutside(node, null)).toBe(false);
    expect(shouldTriggerClickOutside(null, null)).toBe(false);
  });

  it('returns false when target contains eventTarget', () => {
    const child = {} as Node;
    const parent = {
      contains: vi.fn((n: unknown) => n === child),
    } as unknown as Node;

    expect(shouldTriggerClickOutside(parent, child)).toBe(false);
    expect(parent.contains).toHaveBeenCalledWith(child);
  });

  it('returns false when ignoreElement contains eventTarget', () => {
    const eventTarget = {} as Node;
    const target = {
      contains: vi.fn(() => false),
    } as unknown as Node;
    const ignoreElement = {
      contains: vi.fn((n: unknown) => n === eventTarget),
    } as unknown as Node;

    expect(shouldTriggerClickOutside(target, eventTarget, ignoreElement)).toBe(false);
  });

  it('returns true when eventTarget is outside target and ignoreElement', () => {
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
});
