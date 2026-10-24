import { useEffect } from 'react';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';

export function useDailyStreak(userId: string | null): void {
  useEffect(() => {
    const store = useGamificationStore.getState();

    store.setActiveUser(userId);

    if (!userId) {
      return;
    }

    store.checkIn();

    return () => {
      store.setActiveUser(null);
    };
  }, [userId]);
}
