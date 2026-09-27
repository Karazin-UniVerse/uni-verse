import { describe, it, expect } from 'vitest';
import { getScoreToneClass } from './RecentGradesFeed';
import styles from './RecentGradesFeed.module.scss';

describe('RecentGradesFeed', () => {
  describe('getScoreToneClass', () => {
    it('returns toneSuccess for scores 90 and above', () => {
      expect(getScoreToneClass('95')).toBe(styles.toneSuccess);
      expect(getScoreToneClass('90')).toBe(styles.toneSuccess);
      expect(getScoreToneClass('100 / 100')).toBe(styles.toneSuccess);
    });

    it('returns toneInfo for scores between 75 and 89', () => {
      expect(getScoreToneClass('88')).toBe(styles.toneInfo);
      expect(getScoreToneClass('75')).toBe(styles.toneInfo);
    });

    it('returns toneWarning for scores between 60 and 74', () => {
      expect(getScoreToneClass('65')).toBe(styles.toneWarning);
      expect(getScoreToneClass('60')).toBe(styles.toneWarning);
    });

    it('returns toneDanger for scores below 60', () => {
      expect(getScoreToneClass('55')).toBe(styles.toneDanger);
      expect(getScoreToneClass('0')).toBe(styles.toneDanger);
    });

    it('handles empty, null, and non-numeric inputs gracefully', () => {
      expect(getScoreToneClass(null)).toBe(styles.toneInfo);
      expect(getScoreToneClass(undefined)).toBe(styles.toneInfo);
      expect(getScoreToneClass('passed')).toBe(styles.toneInfo);
    });
  });
});
