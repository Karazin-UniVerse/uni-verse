import React from 'react';
import styles from './Spinner.module.scss';

type SpinnerProps = {
  tip?: string;
  size?: 'small' | 'medium' | 'large';
};

export const Spinner: React.FC<SpinnerProps> = ({ tip, size = 'medium' }) => (
  <div className={styles.wrap}>
    <div className={`${styles.spinner} ${styles[size]}`} aria-hidden />
    {tip && <p className={styles.tip}>{tip}</p>}
  </div>
);
