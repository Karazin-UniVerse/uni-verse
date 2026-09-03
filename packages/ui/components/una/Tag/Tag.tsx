import React from 'react';
import styles from './Tag.module.scss';

import type { TagProps } from './Tag.types';

export type { TagProps, TagTone } from './Tag.types';

export const Tag: React.FC<TagProps> = ({ children, tone = 'default', className }) => {
  const toneClass = tone === 'neutral' ? styles.default : styles[tone];
  return <span className={`${styles.tag} ${toneClass} ${className ?? ''}`}>{children}</span>;
};
