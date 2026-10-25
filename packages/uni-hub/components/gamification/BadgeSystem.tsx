import React, { useEffect, useRef } from 'react';
import type { Grade } from '@core/types/moodle';
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
  const { formatMessage } = useLanguage();
  const unlockedBadges = useGamificationStore((state) => state.unlockedBadges);
  const unlockBadge = useGamificationStore((state) => state.unlockBadge);
  const triggerCelebration = useGamificationStore((state) => state.triggerCelebration);
  const lastCheckInWasNight = useGamificationStore((state) => state.lastCheckInWasNight);
  const activeUserId = useGamificationStore((state) => state.activeUserId);
  const notifiedRef = useRef<Set<string>>(new Set(unlockedBadges));

  useEffect(() => {
    if (!activeUserId) return;

    const toUnlock = evaluateBadgeUnlocks({
      unlocked: unlockedBadges,
      grades,
      checkedInAtNight: lastCheckInWasNight,
      submittedBeforeDeadline,
    });

    for (const id of toUnlock) {
      const newly = unlockBadge(id);

      const notificationKey = `${activeUserId}:${id}`;

      if (newly && !notifiedRef.current.has(notificationKey)) {
        notifiedRef.current.add(notificationKey);
        const badge = BADGES[id];

        toast.success(`${formatMessage('badge.unlocked')}: ${badge.title} — ${badge.description}`);
        triggerCelebration();
      }
    }
  }, [
    activeUserId,
    grades,
    unlockedBadges,
    lastCheckInWasNight,
    submittedBeforeDeadline,
    unlockBadge,
    triggerCelebration,
    toast,
    formatMessage,
  ]);

  return null;
};
