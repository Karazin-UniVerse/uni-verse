'use client';

import React from 'react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import styles from './DeanContactModal.module.scss';

export const DEAN_TOPIC_KEYS: TranslationKey[] = [
  'dean.topic.certificate',
  'dean.topic.transcript',
  'dean.topic.session',
  'dean.topic.individual',
  'dean.topic.other',
];

export interface DeanTopicChipsProps {
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
}

export const DeanTopicChips: React.FC<DeanTopicChipsProps> = ({ selectedTopic, onSelectTopic }) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.templatesSection}>
      <span className={styles.sectionLabel}>{formatMessage('dean.sectionLabel')}</span>
      <div className={styles.chipsList}>
        {DEAN_TOPIC_KEYS.map((key) => {
          const topic = formatMessage(key);

          return (
            <button
              key={key}
              type="button"
              className={`${styles.chipBtn} ${selectedTopic === topic ? styles.chipBtnActive : ''}`}
              onClick={() => {
                onSelectTopic(topic);
              }}
            >
              {topic}
            </button>
          );
        })}
      </div>
    </div>
  );
};
