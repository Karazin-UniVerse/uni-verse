import React, { useEffect, useState } from 'react';
import styles from './ProgressBar.module.scss';

type ProgressBarProps = {
  value: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  max?: number;
  tone?: 'success' | 'warning' | 'danger' | 'info';
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  ariaLabel,
  ariaLabelledBy,
  className,
  max = 100,
  tone = 'info',
}) => {
  const [width, setWidth] = useState(0);

  const normalizedMax = Math.max(0, max);
  const normalizedValue = Math.max(0, Math.min(normalizedMax, value));
  const percentage = normalizedMax > 0 ? (normalizedValue / normalizedMax) * 100 : 0;

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => setWidth(percentage));

    return () => cancelAnimationFrame(animationFrameId);
  }, [percentage]);

  const defaultAriaLabel = !ariaLabel && !ariaLabelledBy ? 'Прогрес' : ariaLabel;

  return (
    <div
      className={`${styles.track} ${className ?? ''}`}
      role="progressbar"
      aria-label={defaultAriaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={normalizedMax}
      aria-valuetext={`${Math.round(percentage)}%`}
    >
      <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
};
