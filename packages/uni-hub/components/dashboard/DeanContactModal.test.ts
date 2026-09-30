import { describe, it, expect } from 'vitest';
import { TEMPLATE_TOPICS } from './DeanContactModal';

describe('DeanContactModal', () => {
  it('defines valid and meaningful template topics for student inquiries', () => {
    expect(TEMPLATE_TOPICS).toBeInstanceOf(Array);
    expect(TEMPLATE_TOPICS.length).toBeGreaterThan(0);
    expect(TEMPLATE_TOPICS).toContain('Довідка про навчання');
    expect(TEMPLATE_TOPICS).toContain('Академічна довідка / виписка оцінок');
    expect(TEMPLATE_TOPICS).toContain('Питання щодо сесії та розкладу');
    expect(TEMPLATE_TOPICS).toContain('Індивідуальний графік навчання');
    expect(TEMPLATE_TOPICS).toContain('Інше звернення до деканату');
  });

  it('all template topics are non-empty strings', () => {
    for (const topic of TEMPLATE_TOPICS) {
      expect(typeof topic).toBe('string');
      expect(topic.trim().length).toBeGreaterThan(0);
    }
  });
});
