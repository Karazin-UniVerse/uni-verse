import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '@uni-hub/i18n/translations';
import {
  getControlTypeLabel,
  getTraditionalGradeLabel,
  stripHtml,
  parseGradeScore,
  getExamScoreDisplay,
  isNavKey,
  toNotificationListItem,
} from './utils';

describe('dashboard utils', () => {
  describe('getControlTypeLabel', () => {
    it('should return Ukrainian labels for control types', () => {
      const formatMessage = (key: keyof typeof TRANSLATIONS.uk) => TRANSLATIONS.uk[key];

      expect(getControlTypeLabel('exam', formatMessage)).toBe('Іспит');
      expect(getControlTypeLabel('credit', formatMessage)).toBe('Залік');
      expect(getControlTypeLabel('differentiated_credit', formatMessage)).toBe('Диф. залік');
    });

    it('should return English labels for control types', () => {
      const formatMessage = (key: keyof typeof TRANSLATIONS.en) => TRANSLATIONS.en[key];

      expect(getControlTypeLabel('exam', formatMessage)).toBe('Exam');
      expect(getControlTypeLabel('credit', formatMessage)).toBe('Pass/Fail Credit');
      expect(getControlTypeLabel('differentiated_credit', formatMessage)).toBe('Graded Credit');
    });
  });

  describe('getTraditionalGradeLabel', () => {
    it('should translate traditional grades with formatMessage', () => {
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

    it('should return fallback value if unmapped or formatMessage omitted', () => {
      expect(getTraditionalGradeLabel('custom grade')).toBe('custom grade');
      expect(getTraditionalGradeLabel('відмінно')).toBe('відмінно');
    });
  });

  describe('stripHtml', () => {
    it('should strip html tags and decodes common entities', () => {
      expect(stripHtml('<p>Hello &amp; <strong>World</strong></p>')).toBe('Hello & World');
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });
  });

  describe('parseGradeScore', () => {
    it('should parse various grade formats into numbers [0, 100]', () => {
      expect(parseGradeScore(85)).toBe(85);
      expect(parseGradeScore({ totalScore: 92 })).toBe(92);
      expect(parseGradeScore({ grade: '75.5' })).toBe(76);
      expect(parseGradeScore(null)).toBe(0);
      expect(parseGradeScore(-5)).toBe(0);
      expect(parseGradeScore(150)).toBe(100);
    });
  });

  describe('getExamScoreDisplay', () => {
    it('should return dash for credit control type or missing score', () => {
      expect(getExamScoreDisplay(35, 'credit')).toBe('—');
      expect(getExamScoreDisplay(null, 'exam')).toBe('—');
      expect(getExamScoreDisplay(undefined, 'exam')).toBe('—');
    });

    it('should return string score for exam', () => {
      expect(getExamScoreDisplay(38, 'exam')).toBe('38');
    });
  });

  describe('isNavKey', () => {
    it('should return true for canonical navigation keys', () => {
      expect(isNavKey('overview')).toBe(true);
      expect(isNavKey('courses')).toBe(true);
      expect(isNavKey('grades')).toBe(true);
      expect(isNavKey('schedule')).toBe(true);
      expect(isNavKey('assignments')).toBe(true);
      expect(isNavKey('connectMoodle')).toBe(true);
      expect(isNavKey('opportunities')).toBe(true);
    });

    it('should return false for unknown or invalid keys', () => {
      expect(isNavKey('unknown')).toBe(false);
      expect(isNavKey('')).toBe(false);
      expect(isNavKey('Overview')).toBe(false);
    });
  });

  describe('toNotificationListItem', () => {
    const notification = {
      id: 7,
      subject: 'New assignment',
      message: '<p>Lab&nbsp;4 is <b>available</b></p>',
      timecreated: 1_788_000_000,
      read: false,
    };

    it('should map the notification fields and strip html from the message', () => {
      const item = toNotificationListItem(notification, 'en-US');

      expect(item.id).toBe(7);
      expect(item.title).toBe('New assignment');
      expect(item.message).toBe('Lab 4 is available');
      expect(item.isRead).toBe(false);
    });

    it('should expose the creation time as a locale string and an ISO date', () => {
      const item = toNotificationListItem(notification, 'en-US');

      expect(item.dateTime).toBe(new Date(1_788_000_000 * 1000).toISOString());
      expect(item.time).not.toBe('');
    });

    it('should truncate messages longer than 100 characters', () => {
      const item = toNotificationListItem({ ...notification, message: 'a'.repeat(150) }, 'en-US');

      expect(item.message).toBe(`${'a'.repeat(100)}...`);
    });

    it('should keep messages of exactly 100 characters untouched', () => {
      const item = toNotificationListItem({ ...notification, message: 'a'.repeat(100) }, 'en-US');

      expect(item.message).toBe('a'.repeat(100));
    });
  });
});
