'use client';

import React from 'react';
import { TopicChips } from '@ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';

export const DEAN_TOPIC_KEYS: TranslationKey[] = [
  'dean.topic.certificate',
  'dean.topic.transcript',
  'dean.topic.session',
  'dean.topic.individual',
  'dean.topic.other',
];

export interface DeanTopicChipsProps {
  topics?: (TranslationKey | string)[];
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
  disabled?: boolean;
  className?: string;
}

export const DeanTopicChips: React.FC<DeanTopicChipsProps> = ({
  selectedTopic,
  onSelectTopic,
  disabled,
  className,
  topics = DEAN_TOPIC_KEYS,
}) => {
  const { formatMessage } = useLanguage();

  const options = topics.map((key) => {
    const topic = formatMessage(key as TranslationKey);

    return {
      id: topic,
      label: topic,
    };
  });

  return (
    <TopicChips
      label={formatMessage('dean.sectionLabel')}
      options={options}
      selectedId={selectedTopic}
      onSelect={onSelectTopic}
      disabled={disabled}
      className={className}
    />
  );
};
