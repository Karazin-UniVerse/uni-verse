import React, { useEffect, useState } from 'react';
import styles from './ProgressBar.module.scss';

import type { ProgressBarProps } from './ProgressBar.types';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  ariaLabel,
  ariaLabelledBy,
  className,
  max = 100,
  tone = 'info',
}) => {
  const [width, setWidth] = useState(0);

  const safeMax = Number.isFinite(max) ? Math.max(0, max) : 100;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(safeMax, value)) : 0;
  const percentage = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;

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
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuetext={`${Math.round(percentage)}%`}
    >
      <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
};
