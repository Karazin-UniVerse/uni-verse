import { describe, expect, it } from 'vitest';
import { RESPONSE_CODES } from '@core/constants/response-codes';
import { hasHttpStatus } from './httpErrors';

describe('hasHttpStatus', () => {
  it('matches the status that the request helper appends to the message', () => {
    const failure = new Error('Calendar change would exclude published classes (HTTP 409)');

    expect(hasHttpStatus(failure, RESPONSE_CODES.CONFLICT)).toBe(true);
    expect(hasHttpStatus(failure, RESPONSE_CODES.FORBIDDEN)).toBe(false);
  });

  it('ignores values that are not errors', () => {
    expect(hasHttpStatus('(HTTP 409)', RESPONSE_CODES.CONFLICT)).toBe(false);
  });
});
