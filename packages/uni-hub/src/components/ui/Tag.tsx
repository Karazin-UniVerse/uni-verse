import React from 'react';
import styles from './Tag.module.scss';

type TagProps = {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'danger';
  className?: string;
};

export const Tag: React.FC<TagProps> = ({ children, tone = 'default', className }) => (
  <span className={`${styles.tag} ${styles[tone]} ${className ?? ''}`}>{children}</span>
);
