import React from 'react';
import styles from './Skeleton.module.scss';

import type { SkeletonProps } from './Skeleton.types';

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, className, style }) => (
  <div
    className={`${styles.skeleton} ${className ?? ''}`}
    style={{ width, height, ...style }}
    aria-hidden
  />
);

export default Skeleton;
