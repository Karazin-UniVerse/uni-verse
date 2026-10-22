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

    let timer: ReturnType<typeof setTimeout>;
    const refresh = (): void => {
      clearTimeout(timer);

      const token = safeStorage.getItem('accessToken');

      if (!isLoggedIn() || !token || parseJwt(token)?.sub !== userId) {
        store.setActiveUser(null);
        router.replace('/login');

        return;
      }

      if (document.visibilityState !== 'hidden') store.checkIn();

      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      timer = setTimeout(refresh, midnight.getTime() - now.getTime());
    };

    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', refresh);
      store.setActiveUser(null);
    };
  }, [userId, router]);
}
