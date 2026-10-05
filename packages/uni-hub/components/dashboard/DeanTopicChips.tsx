'use client';

import React from 'react';
import { TopicChips } from '@universe/ui';
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
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
}

export const DeanTopicChips: React.FC<DeanTopicChipsProps> = ({ selectedTopic, onSelectTopic }) => {
  const { formatMessage } = useLanguage();

  const options = DEAN_TOPIC_KEYS.map((key) => {
    const topic = formatMessage(key);

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
    />
  );
};
