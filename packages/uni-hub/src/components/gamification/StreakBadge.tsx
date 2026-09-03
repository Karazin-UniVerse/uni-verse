import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useGamificationStore } from '../../store/useGamificationStore';
import styles from './StreakBadge.module.scss';

function getDaysPlural(count: number): string {
  const abs = Math.abs(count) % 100;
  const num = abs % 10;

  if (abs > 10 && abs < 20) {
    return 'дней';
  }

  if (num > 1 && num < 5) {
    return 'дня';
  }

  if (num === 1) {
    return 'день';
  }

  return 'дней';
}

export const StreakBadge: React.FC = () => {
  const streak = useGamificationStore((state) => state.currentStreak);
  const controls = useAnimationControls();

  useEffect(() => {
    void controls.start({
      scale: [1, 1.12, 1],
      transition: { duration: 0.35 },
    });
  }, [streak, controls]);

  const daysLabel = getDaysPlural(streak);

  return (
    <motion.div className={styles.badge} animate={controls} title={`Стрик: ${streak} дн.`}>
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
