/**
 * Public API barrel — re-exports all sub-modules so that existing imports
 * from '@uni-hub/services/api' continue to work without changes.
 *
 * Sub-modules:
 *   api.storage.ts  — safeStorage, API_BASE_URL
 *   api.request.ts  — ApiClient, buildQueryString, getErrorMessage
 *   api.auth.ts     — AuthApi, authApi
 *   api.moodle.ts   — MoodleApi, moodleApi, GetAssignmentsParams
 */
export { safeStorage, API_BASE_URL } from './api.storage';
export { ApiClient, buildQueryString, getErrorMessage } from './api.request';
export type { RequestOptions } from './api.request';
export { AuthApi, authApi } from './api.auth';
export { MoodleApi, moodleApi } from './api.moodle';
export type { GetAssignmentsParams } from './api.moodle';
export { OpportunitiesApi, opportunitiesApi } from './api.opportunities';
export { NotificationsApi, notificationsApi } from './api.notifications';
export type { PlatformNotification, MarkAllAsReadResponse } from './api.notifications';
