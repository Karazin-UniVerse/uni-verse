import type { ReactNode } from 'react';
import type { TagSize, TagTone } from '../../una/Tag/Tag.types';

export type CategoryPillProps = {
  label: string;
  className?: string;
  icon?: ReactNode;
  size?: TagSize;
  tone?: TagTone;
};
