import { describe, it, expect } from 'vitest';
import { DEAN_TOPIC_KEYS } from './DeanContactModal';
import { uk } from '@uni-hub/i18n/locales/uk';
import { en } from '@uni-hub/i18n/locales/en';

describe('DeanContactModal', () => {
  it('defines valid and meaningful template topic translation keys', () => {
    expect(DEAN_TOPIC_KEYS).toBeInstanceOf(Array);
    expect(DEAN_TOPIC_KEYS.length).toBeGreaterThan(0);
    expect(DEAN_TOPIC_KEYS).toContain('dean.topic.certificate');
    expect(DEAN_TOPIC_KEYS).toContain('dean.topic.transcript');
    expect(DEAN_TOPIC_KEYS).toContain('dean.topic.session');
    expect(DEAN_TOPIC_KEYS).toContain('dean.topic.individual');
    expect(DEAN_TOPIC_KEYS).toContain('dean.topic.other');
  });

  it('all template topic translation keys exist and are non-empty in uk and en locales', () => {
    for (const key of DEAN_TOPIC_KEYS) {
      expect(typeof uk[key]).toBe('string');
      expect(uk[key].trim().length).toBeGreaterThan(0);
      expect(typeof en[key]).toBe('string');
      expect(en[key].trim().length).toBeGreaterThan(0);
    }
  });
});
