import type { QueryClient } from '@tanstack/react-query';
import { safeStorage } from './api.storage';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';

export const USER_SESSION_STORAGE_KEYS = [
  'isLoggedIn',
  'accessToken',
  'isMoodleLinked',
  'moodleToken',
  'username',
  'universe_student_profile',
  'universe_dashboard_data',
  'universe_last_sync_time',
] as const;

export function clearUserSessionStorage(): void {
  useGamificationStore.getState().setActiveUser(null);

  for (const key of USER_SESSION_STORAGE_KEYS) {
    safeStorage.removeItem(key);
  }
}

export function endSession(queryClient: QueryClient): void {
  clearUserSessionStorage();
  queryClient.clear();
}
