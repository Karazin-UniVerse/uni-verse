import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useNow } from '../../hooks/useNow';
import styles from './LiveCountdown.module.scss';

type LiveCountdownProps = {
  targetUnixSec: number;
  className?: string;
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const LiveCountdown: React.FC<LiveCountdownProps> = ({ targetUnixSec, className }) => {
  const now = useNow();
  const targetMs = targetUnixSec * 1000;
  const diff = targetMs - now;

  const tone = useMemo(() => {
    if (diff <= 0) return (
      <span className={`${styles.countdown} ${styles.danger} $(className ?? ''}`} title="Термін сплив">
        <Clock size={14} aria-hidden />
        <span className={styles.time}>Термін сплив</span>
      </span>
    );
    if (diff < SIX_HOURS_MS) return 'warning';
    return 'ok';
  }, [diff]);

  const label = diff <= 0 ? `−${formatRemaining(diff)}` : formatRemaining(diff);

  return (
    <span className={`${styles.countdown} ${styles[tone]} ${className ?? ''}`} title="До дедлайна">
      <Clock size={14} aria-hidden />
      <span className={styles.time}>{label}</span>
    </span>
  );
};
