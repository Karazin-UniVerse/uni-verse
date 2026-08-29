import React from 'react';
import styles from './Skeleton.module.scss';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
};

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, className, style }) => (
  <div
    className={`${styles.skeleton} ${className ?? ''}`}
    style={{ width, height, ...style }}
    aria-hidden
  />
);
