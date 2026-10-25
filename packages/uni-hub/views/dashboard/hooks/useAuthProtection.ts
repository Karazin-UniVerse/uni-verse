import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@core/utils/auth';
import { safeStorage } from '@uni-hub/services/api.storage';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { parseJwt } from '@uni-hub/utils/jwt';

export function useAuthProtection(userId: string | null): void {
  const router = useRouter();

  useEffect(() => {
    const verifySession = (): boolean => {
      const token = safeStorage.getItem('accessToken');

      if (!isLoggedIn() || !token || !userId || parseJwt(token)?.sub !== userId) {
        useGamificationStore.getState().setActiveUser(null);
        router.replace('/login');

        return false;
      }

      return true;
    };

    verifySession();

    const onStorage = (event: StorageEvent): void => {
      if (!event.key || event.key === 'accessToken' || event.key === 'isLoggedIn') {
        verifySession();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [userId, router]);
}
