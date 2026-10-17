'use client';

import React from 'react';
import { SegmentedControl, type SegmentedControlItem } from '@universe/ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { StudyTabProps } from '../types';
import { STUDY_VIEW, type StudyView } from '../constants';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export const StudyTab: React.FC<StudyTabProps> = ({ view, onViewChange, children }) => {
  const { formatMessage } = useLanguage();

  const items: SegmentedControlItem<StudyView>[] = [
    { id: STUDY_VIEW.Subjects, label: formatMessage('study.views.subjects') },
    { id: STUDY_VIEW.Grades, label: formatMessage('study.views.grades') },
    { id: STUDY_VIEW.Assignments, label: formatMessage('study.views.assignments') },
  ];

  return (
    <div className={styles.studyStack}>
      <SegmentedControl
        items={items}
        selectedId={view}
        panelIdPrefix="study-panel"
        ariaLabel={formatMessage('nav.study')}
        onSelect={onViewChange}
      />
      <div className={styles.studyPanel} role="tabpanel" id={`study-panel-${view}`}>
        {children}
      </div>
    </div>
  );
};
