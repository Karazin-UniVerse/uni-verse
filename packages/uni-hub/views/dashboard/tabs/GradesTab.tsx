'use client';

import React from 'react';
import { GradesChart } from '@uni-hub/components/grades';
import { GradeSimulatorTrigger } from '@uni-hub/components/gamification';
import { getValidGrades, getGradeCourseName } from '@uni-hub/utils/grades';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Grade } from '@uni-hub/types';
import type { GradesTabProps } from '../types';
import { mockFallbackGrades } from '../constants';
import { GradeTableRow, type GradeDisplayItem } from './GradeTableRow';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export const GradesTab: React.FC<GradesTabProps> = ({ grades, onOpenSimulator }) => {
  const { formatMessage } = useLanguage();
  const rawValidGrades = getValidGrades(grades);
  const validGrades = rawValidGrades.length > 0 ? rawValidGrades : mockFallbackGrades;

  return (
    <div className={styles.gradesStack}>
      <div className={styles.pageTitleRow} style={{ marginBottom: 0 }}>
        <span className={styles.muted}>{formatMessage('grades.subtitle')}</span>
        <GradeSimulatorTrigger onOpen={onOpenSimulator} />
      </div>
      <GradesChart grades={validGrades as Grade[]} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{formatMessage('grades.colCourse')}</th>
              <th>{formatMessage('grades.colCredits')}</th>
              <th>{formatMessage('grades.colControl')}</th>
              <th>{formatMessage('grades.colCurrent')}</th>
              <th>{formatMessage('grades.colExam')}</th>
              <th>{formatMessage('grades.colFinal')}</th>
              <th>{formatMessage('grades.colEcts')}</th>
              <th>{formatMessage('grades.colTraditional')}</th>
            </tr>
          </thead>
          <tbody>
            {(validGrades as GradeDisplayItem[]).map((gradeItem, index: number) => {
              const courseName =
                getGradeCourseName(gradeItem) ||
                gradeItem.courseName ||
                `${formatMessage('grades.discipline')} #${index + 1}`;

              return <GradeTableRow key={courseName + index} grade={gradeItem} index={index} />;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
