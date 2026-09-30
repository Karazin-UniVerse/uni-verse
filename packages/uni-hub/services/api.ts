/**
 * Public API barrel — re-exports all sub-modules so that existing imports
 * from '@uni-hub/services/api' continue to work without changes.
 *
 * Sub-modules:
 *   api.storage.ts  — safeStorage, isDemoMode, API_BASE_URL
 *   api.request.ts  — request, buildQueryString, getErrorMessage
 *   api.auth.ts     — AuthApi, authApi, GoogleAuthResponse
 *   api.moodle.ts   — MoodleApi, moodleApi, GetAssignmentsParams
 */
export { safeStorage, isDemoMode, API_BASE_URL } from './api.storage';
export { request, buildQueryString, getErrorMessage } from './api.request';
export { AuthApi, authApi } from './api.auth';
export type { GoogleAuthResponse } from './api.auth';
export { MoodleApi, moodleApi } from './api.moodle';
export type { GetAssignmentsParams } from './api.moodle';
