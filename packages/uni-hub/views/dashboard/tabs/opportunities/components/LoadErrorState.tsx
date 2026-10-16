'use client';

import React from 'react';
import { Button, Empty } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '../../OpportunitiesTab.module.scss';

export interface LoadErrorStateProps {
  onRetry: () => void;
}

export const LoadErrorState: React.FC<LoadErrorStateProps> = ({ onRetry }) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.errorState}>
      <Empty description={formatMessage('opportunities.error.load')} />
      <Button type="button" variant="secondary" size="small" onClick={onRetry}>
        {formatMessage('opportunities.error.retry')}
      </Button>
    </div>
  );
};
