'use client';

import React from 'react';
import { Mail, Phone, Clock } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './DeanContactModal.module.scss';

export const DeanContactInfo: React.FC = () => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.infoGrid}>
      <div className={styles.infoItem}>
        <Mail size={16} />
        <span>
          <strong>{formatMessage('dean.email')}</strong> dean.cs@karazin.ua
        </span>
      </div>
      <div className={styles.infoItem}>
        <Phone size={16} />
        <span>
          <strong>{formatMessage('dean.phone')}</strong> +38 (057) 707-55-55
        </span>
      </div>
      <div className={styles.infoItem}>
        <Clock size={16} />
        <span>
          <strong>{formatMessage('dean.schedule')}</strong> {formatMessage('dean.scheduleValue')}
        </span>
      </div>
      <div className={styles.infoItem}>
        <span>
          ✈️ <strong>{formatMessage('dean.telegram')}</strong> @karazin_edean
        </span>
      </div>
    </div>
  );
};
