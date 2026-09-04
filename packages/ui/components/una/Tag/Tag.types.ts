import type { ReactNode } from 'react';

export type TagTone = 'default' | 'neutral' | 'success' | 'warning' | 'info' | 'danger';

export type TagProps = {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
};
