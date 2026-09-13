import React from 'react';
import styles from './Skeleton.module.scss';

import type { SkeletonProps } from './Skeleton.types';

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className,
  style,
}) => (
  <div
    className={`${styles.skeleton} ${className ?? ''}`}
    style={{ width, height, borderRadius, ...style }}
    aria-hidden
  />
);

export default Skeleton;
