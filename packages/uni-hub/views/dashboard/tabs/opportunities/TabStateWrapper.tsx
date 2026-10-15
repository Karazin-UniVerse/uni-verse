import React from 'react';
import { Spinner, Empty } from '@una';
import styles from '../OpportunitiesTab.module.scss';
import { LoadErrorState } from './LoadErrorState';

export interface TabStateWrapperProps {
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  isEmpty: boolean;
  emptyDescription: string;
  children: React.ReactNode;
}

export const TabStateWrapper: React.FC<TabStateWrapperProps> = ({
  loading,
  isError,
  onRetry,
  isEmpty,
  emptyDescription,
  children,
}) => {
  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return <LoadErrorState onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <Empty description={emptyDescription} />;
  }

  return children;
};
