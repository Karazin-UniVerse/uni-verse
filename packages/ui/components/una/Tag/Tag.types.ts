import type { ReactNode } from 'react';

export type TagTone = 'default' | 'neutral' | 'success' | 'warning' | 'info' | 'danger';
export type TagSize = 'small' | 'medium';

export type TagProps = {
  children: ReactNode;
  className?: string;
  size?: TagSize;
  tone?: TagTone;
};
