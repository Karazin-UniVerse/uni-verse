import { describe, it, expect } from 'vitest';
import { asList } from './arrays';

describe('asList', () => {
  it('returns the same array when the value is an array', () => {
    const items = [1, 2, 3];

    expect(asList(items)).toBe(items);
  });

  it('returns an empty array for null and undefined', () => {
    expect(asList(null)).toEqual([]);
    expect(asList(undefined)).toEqual([]);
  });

  it('returns an empty array when a non-array value slips through at runtime', () => {
    expect(asList({ items: [] } as unknown as number[])).toEqual([]);
  });
});
