import { useSyncExternalStore } from 'react';
import type { SessionUser } from '@core/types/auth';
import { getSessionUserSnapshot, subscribeSessionUser } from '@uni-hub/services/api.session';

export interface CurrentUser {
  userId: string | null;
  roles: string[];
  email?: string;
  name?: string;
}

function getServerSessionUserSnapshot(): SessionUser | null {
  return null;
}

export function useCurrentUser(): CurrentUser {
  const sessionUser = useSyncExternalStore(
    subscribeSessionUser,
    getSessionUserSnapshot,
    getServerSessionUserSnapshot,
  );

  return {
    userId: sessionUser?.id ?? null,
    roles: Array.isArray(sessionUser?.roles) ? sessionUser.roles : [],
    email: sessionUser?.email || undefined,
    name: sessionUser?.name ?? undefined,
  };
}
