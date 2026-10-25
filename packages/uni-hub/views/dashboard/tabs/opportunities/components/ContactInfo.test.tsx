import { describe, it, expect } from 'vitest';
import { isPhoneContact } from './ContactIcon';

describe('isPhoneContact', () => {
  it.each(['+38000000000', '0501234567', '+38 (050) 123-45-67'])(
    'treats %s as a phone',
    (value) => {
      expect(isPhoneContact(value)).toBe(true);
    },
  );

  it.each(['@student_tg', 'user@example.com', 't.me/student'])(
    'treats %s as not a phone',
    (value) => {
      expect(isPhoneContact(value)).toBe(false);
    },
  );
});
