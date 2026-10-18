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
  resolveNavKey,
  toNotificationListItem,
  isStudyView,
  parseRouteId,
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
    it('should strip html tags and decode common entities', () => {
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

  describe('isStudyView', () => {
    it('should return true for canonical study views', () => {
      expect(isStudyView('subjects')).toBe(true);
      expect(isStudyView('grades')).toBe(true);
      expect(isStudyView('assignments')).toBe(true);
    });

    it('should return false for unknown or invalid views', () => {
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
      const item = toNotificationListItem(
        { ...notification, fullmessage: 'a'.repeat(150) },
        'en-US',
      );

      expect(item.message).toBe(`${'a'.repeat(100)}...`);
    });

    it('should keep messages of exactly 100 characters untouched', () => {
      const item = toNotificationListItem(
        { ...notification, fullmessage: 'a'.repeat(100) },
        'en-US',
      );

      expect(item.message).toBe('a'.repeat(100));
    });

    it('translates platform notification subject and JSON message using formatMessage', () => {
      const platformNotif = {
        id: 'plat-1',
        subject: 'notifications.opportunityApplicationStatus.title',
        message: JSON.stringify({
          opportunityTitle: 'Frontend Intern',
          status: 'ACCEPTED',
          comment: 'Welcome!',
        }),
        timecreated: 1_788_000_000,
        read: false,
      };

      const withFormatter = toNotificationListItem(
        platformNotif,
        'en-US',
        (key, values): string => {
          if (key === 'notifications.opportunityApplicationStatus.title') {
            return 'Application Status';
          }

          if (key === 'notifications.status.ACCEPTED') {
            return 'accepted';
          }

          if (key === 'notifications.opportunityApplicationStatus.messageWithComment') {
            return `${values?.opportunityTitle}: ${values?.status} (${values?.comment})`;
          }

          return key;
        },
      );

      expect(withFormatter.title).toBe('Application Status');
      expect(withFormatter.message).toBe('Frontend Intern: accepted (Welcome!)');
    });

    it('translates new application and moderation platform notifications and handles invalid JSON', () => {
      const formatter = (key: string, values?: Record<string, string | number>): string =>
        `${key}:${JSON.stringify(values ?? {})}`;

      const newAppItem = toNotificationListItem(
        {
          id: 'plat-2',
          subject: 'notifications.opportunityNewApplication.title',
          message: JSON.stringify({ opportunityTitle: 'AI Lab', applicantName: 'Oleh' }),
          timecreated: 1_788_000_000,
          read: false,
        },
        'en-US',
        formatter,
      );

      expect(newAppItem.message).toContain('notifications.opportunityNewApplication.message');
      expect(newAppItem.message).toContain('AI Lab');

      const moderatedItem = toNotificationListItem(
        {
          id: 'plat-3',
          subject: 'notifications.opportunityModerated.title',
          message: JSON.stringify({ opportunityTitle: 'AI Lab', action: 'APPROVE' }),
          timecreated: 1_788_000_000,
          read: true,
        },
        'en-US',
        formatter,
      );

      expect(moderatedItem.message).toContain('notifications.opportunityModerated.message');

      const invalidJsonItem = toNotificationListItem(
        {
          id: 'plat-4',
          subject: 'notifications.opportunityModerated.title',
          message: '{bad-json}',
          timecreated: 1_788_000_000,
          read: true,
        },
        'en-US',
        formatter,
      );

      expect(invalidJsonItem.message).toBe('{bad-json}');
    });

    it('does not format platform notification if notification ID is numeric (Moodle notification collision)', () => {
      const moodleWithCollision = toNotificationListItem(
        {
          id: 42,
          subject: 'notifications.opportunityModerated.title',
          message: 'Original Moodle Message',
          timecreated: 1_788_000_000,
          read: false,
        },
        'en-US',
        (): string => 'Translated Platform Title',
      );

      expect(moodleWithCollision.title).toBe('notifications.opportunityModerated.title');
      expect(moodleWithCollision.message).toBe('Original Moodle Message');
    });

    it('passes through link property on platform notifications', () => {
      const platformItem = toNotificationListItem(
        {
          id: 'plat-1',
          subject: 'notifications.opportunityNewApplication.title',
          message: JSON.stringify({ opportunityTitle: 'AI Lab', applicantName: 'Oleh' }),
          link: '/opportunities/123',
          timecreated: 1_788_000_000,
          read: true,
        },
        'en-US',
      );

      expect(platformItem.id).toBe('plat-1');
      expect(platformItem.link).toBe('/opportunities/123');
      expect(platformItem.isRead).toBe(true);
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

    it('returns null for zero and unsafe large integers', () => {
      expect(parseRouteId('0')).toBeNull();
      expect(parseRouteId('999999999999999999999')).toBeNull();
    });
  });
});
