import type { QueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@core/types/auth';
import { safeStorage } from './api.storage';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';

export const USER_SESSION_STORAGE_KEYS = [
  'isLoggedIn',
  'sessionUser',
  'accessToken',
  'authProvider',
  'isMoodleLinked',
  'moodleToken',
  'username',
  'userEmail',
  'universe_student_profile',
  'universe_student_profile_v2',
  'universe_dashboard_data',
  'universe_last_sync_time',
] as const;

let sessionGeneration = 0;
let cachedSessionUserRaw: string | null = null;
let cachedSessionUser: SessionUser | null = null;
const sessionUserListeners = new Set<() => void>();

function notifySessionUserListeners(): void {
  for (const listener of sessionUserListeners) {
    listener();
  }
}

export function getSessionGeneration(): number {
  return sessionGeneration;
}

export function readSessionUser(): SessionUser | null {
  const raw = safeStorage.getItem('sessionUser');

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser> | null;

    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') {
      return null;
    }

    return {
      id: parsed.id,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      name: typeof parsed.name === 'string' ? parsed.name : null,
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      isLinked: Boolean(parsed.isLinked),
    };
  } catch {
    return null;
  }
}

export function getSessionUserSnapshot(): SessionUser | null {
  const raw = safeStorage.getItem('sessionUser');

  if (raw === cachedSessionUserRaw) {
    return cachedSessionUser;
  }

  cachedSessionUserRaw = raw;
  cachedSessionUser = readSessionUser();

  return cachedSessionUser;
}

export function subscribeSessionUser(listener: () => void): () => void {
  sessionUserListeners.add(listener);

  const handleStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === 'sessionUser') {
      listener();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return (): void => {
    sessionUserListeners.delete(listener);

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function saveSessionUser(user?: SessionUser | null): void {
  if (!user || typeof user.id !== 'string') {
    return;
  }

  const previousUser = readSessionUser();

  if (previousUser && previousUser.id !== user.id) {
    sessionGeneration += 1;
  }

  const serialized = JSON.stringify(user);

  safeStorage.setItem('sessionUser', serialized);

  if (user.email) {
    safeStorage.setItem('userEmail', user.email);
  }

  cachedSessionUserRaw = serialized;
  cachedSessionUser = readSessionUser();
  notifySessionUserListeners();
}

export function clearUserSessionStorage(): void {
  sessionGeneration += 1;
  useGamificationStore.getState().setActiveUser(null);

  for (const key of USER_SESSION_STORAGE_KEYS) {
    safeStorage.removeItem(key);
  }

  cachedSessionUserRaw = null;
  cachedSessionUser = null;
  notifySessionUserListeners();
}

export function endSession(queryClient: QueryClient): void {
  void queryClient.cancelQueries();
  clearUserSessionStorage();
  queryClient.clear();
}
