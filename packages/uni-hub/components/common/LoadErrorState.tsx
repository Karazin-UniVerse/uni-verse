'use client';

import React from 'react';
import { Button, Empty } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './LoadErrorState.module.scss';

export interface LoadErrorStateProps {
  onRetry: () => void;
}

export const LoadErrorState: React.FC<LoadErrorStateProps> = ({ onRetry }) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.errorState}>
      <Empty description={formatMessage('common.error.load')} />
      <Button type="button" variant="secondary" size="small" onClick={onRetry}>
        {formatMessage('common.error.retry')}
      </Button>
    </div>
  );
};
