import React from 'react';
import styles from './Tag.module.scss';

type TagProps = {
  children: React.ReactNode;
  tone?: 'default' | 'neutral' | 'success' | 'warning' | 'info' | 'danger';
  className?: string;
};

export const Tag: React.FC<TagProps> = ({ children, className, tone = 'default' }) => {
  const toneClass = tone === 'neutral' ? styles.default : styles[tone];

  return <span className={`${styles.tag} ${toneClass} ${className ?? ''}`}>{children}</span>;
};
