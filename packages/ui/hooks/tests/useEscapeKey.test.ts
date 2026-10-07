import { describe, it, expect } from 'vitest';
import { useEscapeKey, shouldTriggerEscapeKey } from '../useEscapeKey';

describe('useEscapeKey & shouldTriggerEscapeKey', () => {
  it('exports useEscapeKey function', () => {
    expect(typeof useEscapeKey).toBe('function');
  });

  it('identifies Escape key accurately', () => {
    expect(shouldTriggerEscapeKey({ key: 'Escape' } as KeyboardEvent)).toBe(true);
    expect(shouldTriggerEscapeKey({ key: 'Enter' } as KeyboardEvent)).toBe(false);
    expect(shouldTriggerEscapeKey({ key: 'Tab' } as KeyboardEvent)).toBe(false);
  });
});
