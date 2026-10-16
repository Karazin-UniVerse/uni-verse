import { describe, it, expect } from 'vitest';
import type { FeatureFlags } from '@core/constants/features';
import { TRANSLATIONS } from '@uni-hub/i18n/translations';
import { NAV_KEY } from './constants';
import {
  getControlTypeLabel,
  getTraditionalGradeLabel,
  stripHtml,
  parseGradeScore,
  getExamScoreDisplay,
  isNavKey,
  resolveNavKey,
  toNotificationListItem,
  isStudyView,
  parseRouteId,
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

  describe('isNavKey', () => {
    it('returns true for canonical navigation keys', () => {
      expect(isNavKey('overview')).toBe(true);
      expect(isNavKey('study')).toBe(true);
      expect(isNavKey('schedule')).toBe(true);
      expect(isNavKey('connectMoodle')).toBe(true);
      expect(isNavKey('opportunities')).toBe(true);
    });

    it('returns false for unknown or invalid keys', () => {
      expect(isNavKey('unknown')).toBe(false);
      expect(isNavKey('')).toBe(false);
      expect(isNavKey('Overview')).toBe(false);
    });

    it('returns false for keys merged into the study tab', () => {
      expect(isNavKey('courses')).toBe(false);
      expect(isNavKey('grades')).toBe(false);
      expect(isNavKey('assignments')).toBe(false);
    });
  });

  describe('isStudyView', () => {
    it('returns true for canonical study views', () => {
      expect(isStudyView('subjects')).toBe(true);
      expect(isStudyView('grades')).toBe(true);
      expect(isStudyView('assignments')).toBe(true);
    });

    it('returns false for unknown or invalid views', () => {
      expect(isStudyView('courses')).toBe(false);
      expect(isStudyView('')).toBe(false);
      expect(isStudyView('Grades')).toBe(false);
    });
  });

  describe('toNotificationListItem', () => {
    const notification = {
      id: 7,
      subject: 'New assignment',
      fullmessage: '<p>Lab&nbsp;4 is <b>available</b></p>',
      timecreated: 1_788_000_000,
      read: false,
    };

    it('maps the notification fields and strips html from the message', () => {
      const item = toNotificationListItem(notification, 'en-US');

      expect(item.id).toBe(7);
      expect(item.title).toBe('New assignment');
      expect(item.message).toBe('Lab 4 is available');
      expect(item.isRead).toBe(false);
    });

    it('exposes the creation time as a locale string and an ISO date', () => {
      const item = toNotificationListItem(notification, 'en-US');

      expect(item.dateTime).toBe(new Date(1_788_000_000 * 1000).toISOString());
      expect(item.time).not.toBe('');
    });

    it('truncates messages longer than 100 characters', () => {
      const item = toNotificationListItem(
        { ...notification, fullmessage: 'a'.repeat(150) },
        'en-US',
      );

      expect(item.message).toBe(`${'a'.repeat(100)}...`);
    });

    it('keeps messages of exactly 100 characters untouched', () => {
      const item = toNotificationListItem(
        { ...notification, fullmessage: 'a'.repeat(100) },
        'en-US',
      );

      expect(item.message).toBe('a'.repeat(100));
    });
  });
});

describe('resolveNavKey', () => {
  const navItems = [
    { key: NAV_KEY.Overview },
    { key: NAV_KEY.Study, featureFlag: 'isMoodleIntegrationEnabled' as const },
    { key: NAV_KEY.ConnectMoodle },
  ];
  const features: FeatureFlags = {
    isMoodleIntegrationEnabled: true,
    isEDeanEnabled: false,
    isOpportunitiesPlatformEnabled: false,
    isFeaturePanelEnabled: false,
  };

  it('keeps a key whose feature is enabled', () => {
    expect(resolveNavKey(NAV_KEY.Study, { navItems, features, isMoodleLinked: true })).toBe(
      NAV_KEY.Study,
    );
  });

  it('falls back to the overview when the feature of the key is off', () => {
    expect(
      resolveNavKey(NAV_KEY.Study, {
        navItems,
        features: { ...features, isMoodleIntegrationEnabled: false },
        isMoodleLinked: true,
      }),
    ).toBe(NAV_KEY.Overview);
  });

  it('shows the connect Moodle tab only while Moodle is enabled and not linked', () => {
    expect(
      resolveNavKey(NAV_KEY.ConnectMoodle, { navItems, features, isMoodleLinked: false }),
    ).toBe(NAV_KEY.ConnectMoodle);
    expect(resolveNavKey(NAV_KEY.ConnectMoodle, { navItems, features, isMoodleLinked: true })).toBe(
      NAV_KEY.Overview,
    );
    expect(
      resolveNavKey(NAV_KEY.ConnectMoodle, {
        navItems,
        features: { ...features, isMoodleIntegrationEnabled: false },
        isMoodleLinked: false,
      }),
    ).toBe(NAV_KEY.Overview);
  });

  describe('parseRouteId', () => {
    it('parses a positive integer segment', () => {
      expect(parseRouteId('5')).toBe(5);
    });

    it('returns null for non-numeric, decimal, missing or repeated segments', () => {
      expect(parseRouteId('abc')).toBeNull();
      expect(parseRouteId('5.5')).toBeNull();
      expect(parseRouteId(undefined)).toBeNull();
      expect(parseRouteId(['5'])).toBeNull();
    });
  });
});
