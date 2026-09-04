import React from 'react';
import styles from './Tag.module.scss';

import type { TagProps } from './Tag.types';

export const Tag: React.FC<TagProps> = ({ children, className, tone = 'default' }) => {
  const toneClass = tone === 'neutral' ? styles.default : styles[tone];

  return <span className={`${styles.tag} ${toneClass} ${className ?? ''}`}>{children}</span>;
};

export default Tag;
