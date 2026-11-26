import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@core/utils/auth';
import { readSessionUser } from '@uni-hub/services/api.session';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';

export function useAuthProtection(userId: string | null): void {
  const router = useRouter();

  useEffect(() => {
    const verifySession = (): boolean => {
      const sessionUser = readSessionUser();

      if (!isLoggedIn() || !sessionUser || !userId || sessionUser.id !== userId) {
        useGamificationStore.getState().setActiveUser(null);
        router.replace('/login');

        return false;
      }

      return true;
    };

    verifySession();

    const onStorage = (event: StorageEvent): void => {
      if (!event.key || event.key === 'sessionUser' || event.key === 'isLoggedIn') {
        verifySession();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [userId, router]);
}
