import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BadgeId } from '@uni-hub/constants/gamification';
import { shiftDateKey, toLocalDateKey } from '@uni-hub/utils/gamification';
import { fireConfetti } from '../utils/confetti';
import { playSuccess } from '../utils/soundEffects';

type GamificationState = {
  currentStreak: number;
  lastActiveDate: string | null;
  unlockedBadges: BadgeId[];
  soundEnabled: boolean;
  lastCheckInWasNight: boolean;
  checkIn: () => void;
  unlockBadge: (id: BadgeId) => boolean;
  setSoundEnabled: (enabled: boolean) => void;
  triggerCelebration: () => void;
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      lastActiveDate: null,
      unlockedBadges: [],
      soundEnabled: true,
      lastCheckInWasNight: false,

      checkIn: () => {
        const today = toLocalDateKey();
        const { lastActiveDate, currentStreak } = get();
        if (lastActiveDate === today) return;

        const yesterday = shiftDateKey(today, -1);
        const nextStreak = lastActiveDate === yesterday ? currentStreak + 1 : 1;
        const hour = new Date().getHours();
        const atNight = hour >= 22 || hour < 5;

        set({
          currentStreak: nextStreak,
          lastActiveDate: today,
          lastCheckInWasNight: atNight,
        });
      },

      unlockBadge: (id) => {
        const { unlockedBadges } = get();
        if (unlockedBadges.includes(id)) return false;
        set({ unlockedBadges: [...unlockedBadges, id] });
        return true;
      },

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      triggerCelebration: () => {
        fireConfetti();
        playSuccess(get().soundEnabled);
      },
    }),
    {
      name: 'universe-gamification',
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        lastActiveDate: state.lastActiveDate,
        unlockedBadges: state.unlockedBadges,
        soundEnabled: state.soundEnabled,
        lastCheckInWasNight: state.lastCheckInWasNight,
      }),
    },
  ),
);
