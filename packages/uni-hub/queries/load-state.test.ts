import { describe, expect, it } from 'vitest';
import { hasLoadFailed } from './load-state';

describe('hasLoadFailed', () => {
  it('is true when the load failed and nothing is cached', () => {
    expect(hasLoadFailed({ isError: true, data: undefined })).toBe(true);
  });

  it('is false when a refetch failed but cached data is still there', () => {
    expect(hasLoadFailed({ isError: true, data: [] })).toBe(false);
  });

  it('is false when the load did not fail', () => {
    expect(hasLoadFailed({ isError: false, data: undefined })).toBe(false);
  });
});
