export const OPPORTUNITY_NOTIFICATION_KEY = {
  APPLICATION_STATUS_TITLE: 'notifications.opportunityApplicationStatus.title',
  APPLICATION_STATUS_MESSAGE: 'notifications.opportunityApplicationStatus.message',
  APPLICATION_STATUS_MESSAGE_WITH_COMMENT:
    'notifications.opportunityApplicationStatus.messageWithComment',
  NEW_APPLICATION_TITLE: 'notifications.opportunityNewApplication.title',
  NEW_APPLICATION_MESSAGE: 'notifications.opportunityNewApplication.message',
  READY_FOR_REVIEW_TITLE: 'notifications.opportunityReadyForReview.title',
  READY_FOR_REVIEW_MESSAGE: 'notifications.opportunityReadyForReview.message',
  MODERATED_TITLE: 'notifications.opportunityModerated.title',
  MODERATED_MESSAGE: 'notifications.opportunityModerated.message',
  MODERATED_MESSAGE_WITH_COMMENT: 'notifications.opportunityModerated.messageWithComment',
} as const;

export const NOTIFICATION_TYPE = {
  OPPORTUNITY_READY_FOR_REVIEW: 'OPPORTUNITY_READY_FOR_REVIEW',
  OPPORTUNITY_APPLICATION_STATUS: 'OPPORTUNITY_APPLICATION_STATUS',
  OPPORTUNITY_NEW_APPLICATION: 'OPPORTUNITY_NEW_APPLICATION',
  OPPORTUNITY_MODERATED: 'OPPORTUNITY_MODERATED',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
