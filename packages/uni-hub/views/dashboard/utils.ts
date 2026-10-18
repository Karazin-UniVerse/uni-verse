import { CONTROL_TYPES, TRADITIONAL_GRADES } from '@core/constants/grades';
import { OPPORTUNITY_APP_STATUS, OPPORTUNITY_MODERATE_ACTION } from '@core/constants/opportunities';
import type { ControlType } from '@core/utils/grades';
import type { NotificationListItem } from '@ui';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import type { Notification } from '@core/types/moodle';
import { getGradeRawValue } from '@uni-hub/utils/grades';
import type { FeatureFlagKey, FeatureFlags } from '@core/constants/features';
import { NAV_KEY, STUDY_VIEWS, type NavKey, type StudyView } from './constants';

const NOTIFICATION_MESSAGE_MAX_LENGTH = 100;

const CONTROL_TYPE_KEYS: Record<ControlType, TranslationKey> = {
  [CONTROL_TYPES.EXAM]: 'control.exam',
  [CONTROL_TYPES.CREDIT]: 'control.credit',
  [CONTROL_TYPES.DIFFERENTIATED_CREDIT]: 'control.diffCredit',
};

export function getControlTypeLabel(
  controlType: ControlType,
  formatMessage: (key: TranslationKey) => string,
): string {
  const key = CONTROL_TYPE_KEYS[controlType] ?? 'control.exam';

  return formatMessage(key);
}

const TRADITIONAL_GRADE_KEYS: Record<string, TranslationKey> = {
  [TRADITIONAL_GRADES.EXCELLENT]: 'grades.excellent',
  [TRADITIONAL_GRADES.GOOD]: 'grades.good',
  [TRADITIONAL_GRADES.SATISFACTORY]: 'grades.satisfactory',
  [TRADITIONAL_GRADES.UNSATISFACTORY]: 'grades.unsatisfactory',
  [TRADITIONAL_GRADES.PASSED]: 'grades.passed',
  [TRADITIONAL_GRADES.FAILED]: 'grades.failed',
};

export function getTraditionalGradeLabel(
  grade: string,
  formatMessage?: (key: TranslationKey) => string,
): string {
  const translationKey = TRADITIONAL_GRADE_KEYS[grade];

  if (translationKey && formatMessage) {
    return formatMessage(translationKey);
  }

  return grade;
}

export function stripHtml(html?: string | null): string {
  if (!html) {
    return '';
  }

  let insideTag = false;
  let cleanText = '';

  for (const character of html) {
    if (character === '<') {
      insideTag = true;
    } else if (character === '>') {
      insideTag = false;
    } else if (!insideTag) {
      cleanText += character;
    }
  }

  return cleanText
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&#39;', "'")
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

const PLATFORM_STATUS_KEYS: Record<string, TranslationKey> = {
  [OPPORTUNITY_APP_STATUS.ACCEPTED]: 'notifications.status.ACCEPTED',
  [OPPORTUNITY_APP_STATUS.REJECTED]: 'notifications.status.REJECTED',
  [OPPORTUNITY_APP_STATUS.UNDER_REVIEW]: 'notifications.status.UNDER_REVIEW',
};

const PLATFORM_ACTION_KEYS: Record<string, TranslationKey> = {
  [OPPORTUNITY_MODERATE_ACTION.APPROVE]: 'notifications.action.APPROVE',
  [OPPORTUNITY_MODERATE_ACTION.REJECT]: 'notifications.action.REJECT',
  [OPPORTUNITY_MODERATE_ACTION.REQUIRE_CHANGES]: 'notifications.action.REQUIRE_CHANGES',
};

const PLATFORM_TITLE_KEYS: Record<string, TranslationKey> = {
  'notifications.opportunityApplicationStatus.title':
    'notifications.opportunityApplicationStatus.title',
  'notifications.opportunityNewApplication.title': 'notifications.opportunityNewApplication.title',
  'notifications.opportunityModerated.title': 'notifications.opportunityModerated.title',
};

type MessageFormatter = (key: TranslationKey, values?: Record<string, string | number>) => string;

type PlatformNotificationPayload = {
  opportunityTitle?: string;
  applicantName?: string;
  status?: string;
  action?: string;
  comment?: string | null;
};

function parsePlatformPayload(rawMessage: string): PlatformNotificationPayload | null {
  if (!rawMessage.startsWith('{') || !rawMessage.endsWith('}')) {
    return null;
  }

  try {
    return JSON.parse(rawMessage) as PlatformNotificationPayload;
  } catch {
    return null;
  }
}

function translateCode(
  code: string | undefined,
  keyMap: Record<string, TranslationKey>,
  formatMessage: MessageFormatter,
): string {
  if (!code) {
    return '';
  }

  const translationKey = keyMap[code];

  return translationKey ? formatMessage(translationKey) : code;
}

function formatPlatformMessage(
  subject: string,
  rawMessage: string,
  formatMessage: MessageFormatter,
): string {
  const parsed = parsePlatformPayload(rawMessage);

  if (!parsed) {
    return rawMessage;
  }

  const opportunityTitle = parsed.opportunityTitle ?? '';

  if (subject === 'notifications.opportunityApplicationStatus.title') {
    const status = translateCode(parsed.status, PLATFORM_STATUS_KEYS, formatMessage);
    const messageKey = parsed.comment
      ? 'notifications.opportunityApplicationStatus.messageWithComment'
      : 'notifications.opportunityApplicationStatus.message';

    return formatMessage(messageKey, {
      opportunityTitle,
      status,
      comment: parsed.comment ?? '',
    });
  }

  if (subject === 'notifications.opportunityNewApplication.title') {
    return formatMessage('notifications.opportunityNewApplication.message', {
      opportunityTitle,
      applicantName: parsed.applicantName ?? '',
    });
  }

  if (subject === 'notifications.opportunityModerated.title') {
    const action = translateCode(parsed.action, PLATFORM_ACTION_KEYS, formatMessage);
    const messageKey = parsed.comment
      ? 'notifications.opportunityModerated.messageWithComment'
      : 'notifications.opportunityModerated.message';

    return formatMessage(messageKey, {
      opportunityTitle,
      action,
      comment: parsed.comment ?? '',
    });
  }

  return rawMessage;
}

export function toNotificationListItem(
  notification: Notification,
  localeTag: string,
  formatMessage?: MessageFormatter,
): NotificationListItem {
  const createdAt = new Date(notification.timecreated * 1000);
  const titleKey =
    typeof notification.id === 'string' ? PLATFORM_TITLE_KEYS[notification.subject] : undefined;
  const title = formatMessage && titleKey ? formatMessage(titleKey) : notification.subject;
  const rawMessage = notification.fullmessage ?? notification.message ?? '';
  const resolvedMessage =
    formatMessage && titleKey
      ? formatPlatformMessage(titleKey, notification.message ?? '', formatMessage)
      : rawMessage;

  return {
    id: notification.id,
    title,
    message: truncateText(stripHtml(resolvedMessage), NOTIFICATION_MESSAGE_MAX_LENGTH),
    time: createdAt.toLocaleString(localeTag),
    dateTime: createdAt.toISOString(),
    isRead: notification.read,
    link: notification.link ?? undefined,
  };
}

export function parseGradeScore(gradeItem: unknown): number {
  if (typeof gradeItem === 'number' && !Number.isNaN(gradeItem)) {
    return Math.min(100, Math.max(0, Math.round(gradeItem)));
  }

  const item = gradeItem as
    | (Parameters<typeof getGradeRawValue>[0] & {
        grade?: unknown;
        totalScore?: unknown;
      })
    | null
    | undefined;
  const rawValue = item ? getGradeRawValue(item) : null;

  if (rawValue !== null && rawValue !== undefined) {
    const parsed = Number(rawValue);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  if (item?.totalScore !== undefined && item?.totalScore !== null) {
    const parsed = Number(item.totalScore);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  const parsed = Number.parseFloat(String(item?.grade ?? ''));

  return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
}

export function getExamScoreDisplay(
  examScore: number | string | null | undefined,
  controlType?: ControlType,
): string {
  if (controlType === 'credit' || examScore === undefined || examScore === null) {
    return '—';
  }

  return String(examScore);
}

export interface NavKeyContext {
  navItems: ReadonlyArray<{ key: NavKey; featureFlag?: FeatureFlagKey }>;
  features: FeatureFlags;
  isMoodleLinked: boolean;
}

export function resolveNavKey(
  key: NavKey,
  { navItems, features, isMoodleLinked }: NavKeyContext,
): NavKey {
  if (key === NAV_KEY.ConnectMoodle && (isMoodleLinked || !features.isMoodleIntegrationEnabled)) {
    return NAV_KEY.Overview;
  }

  const featureFlag = navItems.find((item) => item.key === key)?.featureFlag;

  if (featureFlag && !features[featureFlag]) {
    return NAV_KEY.Overview;
  }

  return key;
}

const STUDY_VIEWS_SET: ReadonlySet<string> = new Set(STUDY_VIEWS);

export const isStudyView = (value: string): value is StudyView => STUDY_VIEWS_SET.has(value);

export function parseRouteId(rawId: string | string[] | undefined): number | null {
  if (typeof rawId !== 'string' || !/^\d+$/.test(rawId)) {
    return null;
  }

  const id = Number.parseInt(rawId, 10);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
