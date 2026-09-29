import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '@uni-hub/i18n/translations';
import {
  getControlTypeLabel,
  getTraditionalGradeLabel,
  stripHtml,
  parseGradeScore,
  getExamScoreDisplay,
} from './utils';

describe('dashboard utils', () => {
  describe('getControlTypeLabel', () => {
    it('returns Ukrainian labels for control types', () => {
      const formatMessage = (key: keyof typeof TRANSLATIONS.uk) => TRANSLATIONS.uk[key];

      expect(getControlTypeLabel('exam', formatMessage)).toBe('Іспит');
      expect(getControlTypeLabel('credit', formatMessage)).toBe('Залік');
      expect(getControlTypeLabel('differentiated_credit', formatMessage)).toBe('Диф. залік');
    });

    it('returns English labels for control types', () => {
      const formatMessage = (key: keyof typeof TRANSLATIONS.en) => TRANSLATIONS.en[key];

      expect(getControlTypeLabel('exam', formatMessage)).toBe('Exam');
      expect(getControlTypeLabel('credit', formatMessage)).toBe('Pass/Fail Credit');
      expect(getControlTypeLabel('differentiated_credit', formatMessage)).toBe('Graded Credit');
    });
  });

  describe('getTraditionalGradeLabel', () => {
    it('translates traditional grades with formatMessage', () => {
      const formatUk = (key: keyof typeof TRANSLATIONS.uk) => TRANSLATIONS.uk[key];
      const formatEn = (key: keyof typeof TRANSLATIONS.en) => TRANSLATIONS.en[key];

      expect(getTraditionalGradeLabel('відмінно', formatUk)).toBe('відмінно');
      expect(getTraditionalGradeLabel('відмінно', formatEn)).toBe('Excellent');
      expect(getTraditionalGradeLabel('добре', formatEn)).toBe('Good');
      expect(getTraditionalGradeLabel('задовільно', formatEn)).toBe('Satisfactory');
      expect(getTraditionalGradeLabel('незадовільно', formatEn)).toBe('Unsatisfactory');
      expect(getTraditionalGradeLabel('зараховано', formatEn)).toBe('Passed');
      expect(getTraditionalGradeLabel('не зараховано', formatEn)).toBe('Failed');
    });

    it('returns fallback value if unmapped or formatMessage omitted', () => {
      expect(getTraditionalGradeLabel('custom grade')).toBe('custom grade');
      expect(getTraditionalGradeLabel('відмінно')).toBe('відмінно');
    });
  });

  describe('stripHtml', () => {
    it('strips html tags and decodes common entities', () => {
      expect(stripHtml('<p>Hello &amp; <strong>World</strong></p>')).toBe('Hello & World');
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });
  });

  describe('parseGradeScore', () => {
    it('parses various grade formats into numbers [0, 100]', () => {
      expect(parseGradeScore(85)).toBe(85);
      expect(parseGradeScore({ totalScore: 92 })).toBe(92);
      expect(parseGradeScore({ grade: '75.5' })).toBe(76);
      expect(parseGradeScore(null)).toBe(0);
      expect(parseGradeScore(-5)).toBe(0);
      expect(parseGradeScore(150)).toBe(100);
    });
  });

  describe('getExamScoreDisplay', () => {
    it('returns dash for credit control type or missing score', () => {
      expect(getExamScoreDisplay(35, 'credit')).toBe('—');
      expect(getExamScoreDisplay(null, 'exam')).toBe('—');
      expect(getExamScoreDisplay(undefined, 'exam')).toBe('—');
    });

    it('returns string score for exam', () => {
      expect(getExamScoreDisplay(38, 'exam')).toBe('38');
    });
  });
});
