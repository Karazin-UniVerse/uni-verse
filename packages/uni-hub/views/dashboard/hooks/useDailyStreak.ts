import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { safeStorage } from '@uni-hub/services/api.storage';
import { parseJwt } from '@uni-hub/utils/jwt';
import { isLoggedIn } from '@core/utils/auth';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';

export function useDailyStreak(userId: string | null): void {
  const router = useRouter();

  useEffect(() => {
    const store = useGamificationStore.getState();

    store.setActiveUser(userId);

    if (!userId) return;

    const verifySession = (): boolean => {
      const token = safeStorage.getItem('accessToken');

      if (!isLoggedIn() || !token || parseJwt(token)?.sub !== userId) {
        store.setActiveUser(null);
        router.replace('/login');

        return false;
      }

      return true;
    };

    if (verifySession()) store.checkIn();

    const onStorage = (): void => {
      verifySession();
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      store.setActiveUser(null);
    };
  }, [userId, router]);
}
