import type { ReactNode } from 'react';

export type StatusBannerTone = 'success' | 'danger' | 'warning' | 'info';

export type StatusBannerProps = {
  tone: StatusBannerTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
};
