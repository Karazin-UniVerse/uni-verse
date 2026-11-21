import { useState } from 'react';
import type { SessionUser } from '@core/types/auth';
import { readSessionUser } from '@uni-hub/services/api.session';

export interface CurrentUser {
  userId: string | null;
  roles: string[];
  email?: string;
  name?: string;
}

export function useCurrentUser(): CurrentUser {
  const [sessionUser] = useState<SessionUser | null>(() => readSessionUser());

  return {
    userId: sessionUser?.id ?? null,
    roles: Array.isArray(sessionUser?.roles) ? sessionUser.roles : [],
    email: sessionUser?.email || undefined,
    name: sessionUser?.name ?? undefined,
  };
}
