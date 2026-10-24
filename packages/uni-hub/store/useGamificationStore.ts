import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BadgeId } from '@uni-hub/constants/gamification';
import { shiftDateKey, toLocalDateKey } from '@uni-hub/utils/gamification';
import { fireConfetti } from '@uni-hub/utils/confetti';
import { playSuccess } from '@uni-hub/utils/soundEffects';

type UserProgress = {
  currentStreak: number;
  lastActiveDate: string | null;
  unlockedBadges: BadgeId[];
  lastCheckInWasNight: boolean;
};

const EMPTY_PROGRESS: UserProgress = {
  currentStreak: 0,
  lastActiveDate: null,
  unlockedBadges: [],
  lastCheckInWasNight: false,
};

type GamificationState = UserProgress & {
  activeUserId: string | null;
  progressByUser: Record<string, UserProgress>;
  soundEnabled: boolean;
  setActiveUser: (userId: string | null) => void;
  checkIn: () => void;
  unlockBadge: (id: BadgeId) => boolean;
  setSoundEnabled: (enabled: boolean) => void;
  triggerCelebration: () => void;
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      ...EMPTY_PROGRESS,
      activeUserId: null,
      progressByUser: {},
      soundEnabled: true,

      setActiveUser: (userId) => {
        void useGamificationStore.persist.rehydrate();

        if (get().activeUserId === userId) return;

        set({
          ...((userId && get().progressByUser[userId]) || EMPTY_PROGRESS),
          activeUserId: userId,
        });
      },

      checkIn: () => {
        void useGamificationStore.persist.rehydrate();
        const today = toLocalDateKey();
        const { lastActiveDate, currentStreak, activeUserId, unlockedBadges } = get();

        if (!activeUserId || lastActiveDate === today) {
          return;
        }

        const yesterday = shiftDateKey(today, -1);
        const nextStreak = lastActiveDate === yesterday ? currentStreak + 1 : 1;
        const hour = new Date().getHours();
        const atNight = hour >= 22 || hour < 5;

        const progress: UserProgress = {
          currentStreak: nextStreak,
          lastActiveDate: today,
          lastCheckInWasNight: atNight,
          unlockedBadges,
        };

        set({ ...progress, progressByUser: { ...get().progressByUser, [activeUserId]: progress } });
      },

      unlockBadge: (id) => {
        void useGamificationStore.persist.rehydrate();
        const { unlockedBadges, activeUserId, currentStreak, lastActiveDate, lastCheckInWasNight } =
          get();

        if (!activeUserId || unlockedBadges.includes(id)) {
          return false;
        }

        const progress: UserProgress = {
          currentStreak,
          lastActiveDate,
          lastCheckInWasNight,
          unlockedBadges: [...unlockedBadges, id],
        };

        set({ ...progress, progressByUser: { ...get().progressByUser, [activeUserId]: progress } });

        return true;
      },

      setSoundEnabled: (enabled) => {
        void useGamificationStore.persist.rehydrate();
        set({ soundEnabled: enabled });
      },

      triggerCelebration: () => {
        fireConfetti();
        playSuccess(get().soundEnabled);
      },
    }),
    {
      name: 'universe-gamification',
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as
          Pick<GamificationState, 'progressByUser' | 'soundEnabled'> | undefined;
        const progressByUser = saved?.progressByUser ?? {};

        return {
          ...current,
          progressByUser,
          soundEnabled: saved?.soundEnabled ?? current.soundEnabled,
          ...((current.activeUserId && progressByUser[current.activeUserId]) || EMPTY_PROGRESS),
        };
      },
      migrate: (persisted) => ({
        progressByUser: {},
        soundEnabled: (persisted as { soundEnabled?: boolean }).soundEnabled ?? true,
      }),
      partialize: (state) => ({
        progressByUser: state.progressByUser,
        soundEnabled: state.soundEnabled,
      }),
    },
  ),
);
