import { describe, it, expect } from 'vitest';
import { isBrowser } from './browser';

describe('browser utility', () => {
  it('should export a boolean isBrowser indicator', () => {
    expect(typeof isBrowser).toBe('boolean');
  });

  it('should be false in standard Node.js runtime without window global', () => {
    // In Node.js environment without DOM, typeof window is undefined
    const checkIsBrowser = typeof window !== 'undefined';

    expect(isBrowser).toBe(checkIsBrowser);
  });
});
