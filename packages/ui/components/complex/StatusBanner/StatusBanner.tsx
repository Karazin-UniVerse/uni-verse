import React from 'react';
import clsx from 'clsx';
import type { StatusBannerProps } from './StatusBanner.types';
import styles from './StatusBanner.module.scss';

const toneClassMap = {
  success: styles.bannerSuccess,
  danger: styles.bannerDanger,
  warning: styles.bannerWarning,
  info: styles.bannerInfo,
};

export const StatusBanner: React.FC<StatusBannerProps> = ({ tone, children, icon, className }) => {
  const toneClass = toneClassMap[tone] || styles.bannerInfo;

  return (
    <div className={clsx(styles.statusBanner, toneClass, className)} role="status">
      {icon && <span className={styles.bannerIcon}>{icon}</span>}
      <div className={styles.bannerContent}>{children}</div>
    </div>
  );
};

export default StatusBanner;
