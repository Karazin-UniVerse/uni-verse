import { describe, it, expect } from 'vitest';
import { isPhoneContact } from './ContactIcon';

describe('isPhoneContact', () => {
  it.each(['+38000000000', '0501234567', '+38 (050) 123-45-67'])(
    'should treat %s as a phone',
    (value) => {
      expect(isPhoneContact(value)).toBe(true);
    },
  );

  it.each(['@student_tg', 'user@example.com', 't.me/student'])(
    'should treat %s as not a phone',
    (value) => {
      expect(isPhoneContact(value)).toBe(false);
    },
  );
});
