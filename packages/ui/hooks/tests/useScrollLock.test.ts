import { describe, it, expect } from 'vitest';
import { useScrollLock } from '../useScrollLock';

describe('useScrollLock', () => {
  it('exports useScrollLock function', () => {
    expect(typeof useScrollLock).toBe('function');
  });
});
