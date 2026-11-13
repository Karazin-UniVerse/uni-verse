import React from 'react';
import clsx from 'clsx';
import { Tag } from '../../una/Tag';
import type { CategoryPillProps } from './CategoryPill.types';
import styles from './CategoryPill.module.scss';

/**
 * Compact pill badge with an optional leading icon, built on top of `Tag`
 * for consistent height, border, and theme contrast across cards and detail views.
 */
export const CategoryPill: React.FC<CategoryPillProps> = ({
  label,
  className,
  icon,
  size = 'small',
  tone = 'neutral',
}) => (
  <Tag tone={tone} size={size} className={clsx(styles.categoryPill, className)}>
    {icon && (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    )}
    <span>{label}</span>
  </Tag>
);

export default CategoryPill;
