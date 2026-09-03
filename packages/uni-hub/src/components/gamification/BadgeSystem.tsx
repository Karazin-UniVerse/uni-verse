import React, { useEffect, useRef } from 'react';
import type { Grade } from '@uni-hub/types';
import { BADGES, evaluateBadgeUnlocks } from '@uni-hub/gamification/badges';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useToast } from '@uni-hub/components/ui/Toast';

type BadgeSystemProps = {
  grades: Grade[];
  submittedBeforeDeadline?: boolean;
};

export const BadgeSystem: React.FC<BadgeSystemProps> = ({
  grades,
  submittedBeforeDeadline,
}) => {
  const toast = useToast();
  const unlockedBadges = useGamificationStore((state) => state.unlockedBadges);
  const unlockBadge = useGamificationStore((state) => state.unlockBadge);
  const lastCheckInWasNight = useGamificationStore((state) => state.lastCheckInWasNight);
  const notifiedRef = useRef<Set<string>>(new Set(unlockedBadges));

  useEffect(() => {
    const toUnlock = evaluateBadgeUnlocks({
      unlocked: unlockedBadges,
      grades,
      checkedInAtNight: lastCheckInWasNight,
      submittedBeforeDeadline,
    });

    for (const id of toUnlock) {
      const newly = unlockBadge(id);

      if (newly && !notifiedRef.current.has(id)) {
        notifiedRef.current.add(id);
        const badge = BADGES[id];

        toast.success(`Ачивка: ${badge.title} — ${badge.description}`);
      }
    }
  }, [grades, unlockedBadges, lastCheckInWasNight, submittedBeforeDeadline, unlockBadge, toast]);

  return null;
};
