import React from 'react';
import type { SpinnerProps } from './Spinner.types';
import styles from './Spinner.module.scss';

export const Spinner: React.FC<SpinnerProps> = ({ ariaLabel, className, tip, size = 'medium' }) => {
  const accessibleLabel = tip || ariaLabel || 'Завантаження...';

  return (
    <div
      className={`${styles.wrap} ${className ?? ''}`}
      role="status"
      aria-live="polite"
      aria-label={accessibleLabel}
    >
      <div className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />
      {tip && <p className={styles.tip}>{tip}</p>}
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {accessibleLabel}
      </span>
    </div>
  );
};

export default Spinner;
