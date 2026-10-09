'use client';

import React from 'react';
import { Award, CalendarDays, BookOpen } from 'lucide-react';
import { ConnectMoodleView } from '@universe/ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface ConnectMoodleTabProps {
  onConnect: () => void;
}

export const ConnectMoodleTab: React.FC<ConnectMoodleTabProps> = ({ onConnect }) => {
  const { formatMessage } = useLanguage();

  return (
    <ConnectMoodleView
      title={formatMessage('connectMoodle.title')}
      subtitle={formatMessage('connectMoodle.subtitle')}
      connectCtaLabel={formatMessage('connectMoodle.cta')}
      openMoodleLabel={formatMessage('connectMoodle.openMoodleLms')}
      onConnect={onConnect}
      features={[
        {
          id: 'grades',
          icon: <Award size={20} aria-hidden />,
          title: formatMessage('connectMoodle.featureGradesTitle'),
          description: formatMessage('connectMoodle.featureGradesDesc'),
        },
        {
          id: 'deadlines',
          icon: <CalendarDays size={20} aria-hidden />,
          title: formatMessage('connectMoodle.featureDeadlinesTitle'),
          description: formatMessage('connectMoodle.featureDeadlinesDesc'),
        },
        {
          id: 'courses',
          icon: <BookOpen size={20} aria-hidden />,
          title: formatMessage('connectMoodle.featureCoursesTitle'),
          description: formatMessage('connectMoodle.featureCoursesDesc'),
        },
      ]}
    />
  );
};

export default ConnectMoodleTab;
