import { useState } from 'react';
import { safeStorage } from '@uni-hub/services/api.storage';
import { parseJwt, type JwtPayload } from '@uni-hub/utils/jwt';

export interface CurrentUser {
  userId: string | null;
  roles: string[];
  email?: string;
  name?: string;
}

export function useCurrentUser(): CurrentUser {
  const [jwt] = useState<JwtPayload | null>(() => {
    const token = safeStorage.getItem('accessToken');

    return token ? parseJwt(token) : null;
  });

  return {
    userId: jwt?.sub ?? null,
    roles: jwt?.roles ?? [],
    email: jwt?.email,
    name: jwt?.name,
  };
}
