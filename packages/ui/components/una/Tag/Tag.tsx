import React from 'react';
import styles from './Tag.module.scss';

import type { TagProps } from './Tag.types';

export const Tag: React.FC<TagProps> = ({
  children,
  className,
  size = 'small',
  tone = 'default',
}) => {
  const toneClass = tone === 'neutral' ? styles.default : styles[tone];
  const sizeClass = styles[size] ?? styles.small;

  return (
    <span className={`${styles.tag} ${sizeClass} ${toneClass} ${className ?? ''}`.trim()}>
      {children}
    </span>
  );
};

export default Tag;
