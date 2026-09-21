import React, { useEffect, useRef } from 'react';
import type { Grade } from '@uni-hub/types';
import { BADGES } from '@uni-hub/constants/gamification';
import { evaluateBadgeUnlocks } from '@uni-hub/utils/gamification';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

type BadgeSystemProps = {
  grades: Grade[];
  submittedBeforeDeadline?: boolean;
};

export const BadgeSystem: React.FC<BadgeSystemProps> = ({ grades, submittedBeforeDeadline }) => {
  const toast = useToast();
  const { t } = useLanguage();
  const unlockedBadges = useGamificationStore((state) => state.unlockedBadges);
  const unlockBadge = useGamificationStore((state) => state.unlockBadge);
  const triggerCelebration = useGamificationStore((state) => state.triggerCelebration);
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

        toast.success(`${t('badge.unlocked')}: ${badge.title} — ${badge.description}`);
        triggerCelebration();
      }
    }
  }, [
    grades,
    unlockedBadges,
    lastCheckInWasNight,
    submittedBeforeDeadline,
    unlockBadge,
    triggerCelebration,
    toast,
    t,
  ]);

  return null;
};
