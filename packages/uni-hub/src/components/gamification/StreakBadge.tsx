import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import styles from './StreakBadge.module.scss';

export const StreakBadge: React.FC = () => {
  const streak = useGamificationStore((state) => state.currentStreak);
  const controls = useAnimationControls();
  const { language, formatMessage } = useLanguage();

  useEffect(() => {
    void controls.start({
      scale: [1, 1.12, 1],
      transition: { duration: 0.35 },
    });
  }, [streak, controls]);

  const getDaysLabel = (count: number): string => {
    if (language === 'en') {
      return Math.abs(count) === 1 ? formatMessage('streak.day') : formatMessage('streak.daysMany');
    }

    const abs = Math.abs(count) % 100;
    const num = abs % 10;

    if (abs > 10 && abs < 20) {
      return formatMessage('streak.daysMany');
    }

    if (num > 1 && num < 5) {
      return formatMessage('streak.daysFew');
    }

    if (num === 1) {
      return formatMessage('streak.day');
    }

    return formatMessage('streak.daysMany');
  };

  const daysLabel = getDaysLabel(streak);

  return (
    <motion.div
      className={styles.badge}
      animate={controls}
      title={`${formatMessage('streak.title')}: ${streak} ${daysLabel}`}
    >
      <motion.span
        className={styles.flame}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Flame size={18} fill="currentColor" />
      </motion.span>
      <span className={styles.count}>{streak}</span>
      <span className={styles.label}>{daysLabel}</span>
    </motion.div>
  );
};
