import React, { useEffect, useState } from 'react';
import styles from './ProgressBar.module.scss';

type ProgressBarProps = {
  value: number;
  max?: number;
  tone?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  tone = 'info',
  className,
}) => {
  const [width, setWidth] = useState(0);
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div
      className={`${styles.track} ${className ?? ''}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
};
