import React from 'react';
import { Spinner, Empty } from '@una';
import styles from '../OpportunitiesTab.module.scss';

export interface TabStateWrapperProps {
  loading: boolean;
  isEmpty: boolean;
  emptyDescription: string;
  children: React.ReactNode;
}

export const TabStateWrapper: React.FC<TabStateWrapperProps> = ({
  loading,
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

  if (isEmpty) {
    return <Empty description={emptyDescription} />;
  }

  return children;
};
