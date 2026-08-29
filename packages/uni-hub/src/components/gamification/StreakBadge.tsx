import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useGamificationStore } from '../../store/useGamificationStore';
import styles from './StreakBadge.module.scss';

export const StreakBadge: React.FC = () => {
  const streak = useGamificationStore((s) => s.currentStreak);
  const controls = useAnimationControls();

  useEffect(() => {
    void controls.start({
      scale: [1, 1.12, 1],
      transition: { duration: 0.35 },
    });
  }, [streak, controls]);

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
      <span className={styles.label}>дней</span>
    </motion.div>
  );
};
