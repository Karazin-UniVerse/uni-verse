import type { ReactNode } from 'react';

export type ActionCardIconTone = 'moodle' | 'assignments' | 'schedule' | 'dean' | 'default';

export type ActionCardBadgeTone = 'info' | 'alert' | 'default';

export type ActionCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone?: ActionCardIconTone;
  badge?: string | number;
  badgeTone?: ActionCardBadgeTone;
  href?: string;
  target?: string;
  rel?: string;
  isExternal?: boolean;
  onClick?: () => void;
  className?: string;
  cardTitle?: string;
};
