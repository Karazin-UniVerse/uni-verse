import { describe, it, expect } from 'vitest';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap', () => {
  it('exports useFocusTrap function', () => {
    expect(typeof useFocusTrap).toBe('function');
  });
});
