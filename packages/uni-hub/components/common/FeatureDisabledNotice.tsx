'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './FeatureDisabledNotice.module.scss';

export interface FeatureDisabledNoticeProps {
  title?: string;
  description?: string;
  featureName?: string;
  onBackToOverview?: () => void;
  showFeatureTag?: boolean;
}

export const FeatureDisabledNotice: React.FC<FeatureDisabledNoticeProps> = ({
  title,
  description,
  featureName,
  onBackToOverview,
  showFeatureTag = process.env.NEXT_PUBLIC_FEATURE_PANEL === 'true',
}) => {
  const { formatMessage } = useLanguage();

  return (
    <output className={styles.noticeContainer}>
      <div className={styles.iconWrapper} aria-hidden>
        <ShieldAlert size={28} />
      </div>

      <h3 className={styles.title}>{title ?? formatMessage('featureGate.disabledTitle')}</h3>

      <p className={styles.description}>
        {description ?? formatMessage('featureGate.disabledDescription')}
      </p>

      {showFeatureTag && featureName && <span className={styles.featureTag}>{featureName}</span>}

      {onBackToOverview && (
        <Button type="button" variant="primary" size="medium" onClick={onBackToOverview}>
          <ArrowLeft size={16} className={styles.btnIcon} />
          {formatMessage('featureGate.backToOverview')}
        </Button>
      )}
    </output>
  );
};
