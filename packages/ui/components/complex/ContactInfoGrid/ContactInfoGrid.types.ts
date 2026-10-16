import type { ReactNode } from 'react';

export type ContactInfoItem = {
  id: string;
  label: string;
  value: ReactNode;
  icon?: ReactNode;
};

export type ContactInfoGridProps = {
  items: ContactInfoItem[];
  className?: string;
};
