import React, { useEffect, useRef } from 'react';
import type { Grade } from '../../types';
import { BADGES, evaluateBadgeUnlocks } from '../../gamification/badges';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useToast } from '../ui/Toast';

type BadgeSystemProps = {
  grades: Grade[];
};

export const BadgeSystem: React.FC<BadgeSystemProps> = ({ grades }) => {
  const toast = useToast();
  const unlockedBadges = useGamificationStore((s) => s.unlockedBadges);
  const unlockBadge = useGamificationStore((s) => s.unlockBadge);
  const lastCheckInWasNight = useGamificationStore((s) => s.lastCheckInWasNight);
  const notifiedRef = useRef<Set<string>>(new Set(unlockedBadges));

  useEffect(() => {
    const toUnlock = evaluateBadgeUnlocks({
      unlocked: unlockedBadges,
      grades,
      checkedInAtNight: lastCheckInWasNight,
    });

    for (const id of toUnlock) {
      const newly = unlockBadge(id);
      if (newly && !notifiedRef.current.has(id)) {
        notifiedRef.current.add(id);
        const badge = BADGES[id];
        toast.success(`Ачивка: ${badge.title} — ${badge.description}`);
      }
    }
  }, [grades, unlockedBadges, lastCheckInWasNight, unlockBadge, toast]);

  return null;
};
