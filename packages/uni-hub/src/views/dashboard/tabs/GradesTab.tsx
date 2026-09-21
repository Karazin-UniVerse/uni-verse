'use client';

import React from 'react';
import { Tag, ProgressBar } from '@una';
import {
  calculateEctsGrade,
  calculateTraditionalGrade,
  GRADES_THRESHOLD,
  type ControlType,
} from '@core/types';
import { GradesChart } from '@uni-hub/components/grades';
import { GradeSimulatorTrigger } from '@uni-hub/components/gamification';
import { getValidGrades, getGradeTone, getGradeCourseName } from '@uni-hub/utils/grades';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { GradesTabProps } from '../types';
import { mockFallbackGrades } from '../constants';
import {
  getControlTypeLabel,
  getTraditionalGradeLabel,
  parseGradeScore,
  getExamScoreDisplay,
} from '../utils';
import styles from '@uni-hub/views/DashboardPage.module.scss';

interface GradeTableRowProps {
  grade: any;
  index: number;
}

const GradeTableRow: React.FC<GradeTableRowProps> = ({ grade, index }) => {
  const { t } = useLanguage();
  const courseName =
    getGradeCourseName(grade) || grade.courseName || `${t('grades.discipline')} #${index + 1}`;
  const totalScore = parseGradeScore(grade);
  const controlType: ControlType | undefined = grade.controlType;
  const ects = calculateEctsGrade(totalScore);
  const rawTraditional = calculateTraditionalGrade(totalScore, controlType ?? undefined);
  const traditionalGrade = getTraditionalGradeLabel(rawTraditional, t);
  const tone = getGradeTone(totalScore);

  const currentScore =
    grade.currentScore !== undefined && grade.currentScore !== null
      ? String(grade.currentScore)
      : '—';

  const examScore = getExamScoreDisplay(grade.examScore, controlType);
  const creditsDisplay =
    grade.credits !== undefined && grade.credits !== null ? `${grade.credits} ECTS` : '—';

  return (
    <tr style={{ animationDelay: `${index * 40}ms` }}>
      <td>
        <strong>{courseName}</strong>
      </td>
      <td>{creditsDisplay}</td>
      <td>
        {controlType ? (
          <Tag tone={controlType === 'exam' ? 'info' : 'neutral'}>
            {getControlTypeLabel(controlType, t)}
          </Tag>
        ) : (
          '—'
        )}
      </td>
      <td>{currentScore}</td>
      <td>{examScore}</td>
      <td>
        <div className={styles.score100Cell}>
          <span style={{ fontWeight: 600, minWidth: '32px' }}>{totalScore}</span>
          <ProgressBar value={totalScore} tone={tone} className={styles.gradeProgress} />
        </div>
      </td>
      <td>
        <Tag tone={tone}>{ects}</Tag>
      </td>
      <td>
        <Tag tone={totalScore >= GRADES_THRESHOLD.SATISFACTORY ? 'success' : 'danger'}>
          {traditionalGrade}
        </Tag>
      </td>
    </tr>
  );
};

export const GradesTab: React.FC<GradesTabProps> = ({ grades, onOpenSimulator }) => {
  const { t } = useLanguage();
  const rawValidGrades = getValidGrades(grades);
  const validGrades = rawValidGrades.length > 0 ? rawValidGrades : mockFallbackGrades;

  return (
    <div className={styles.gradesStack}>
      <div className={styles.pageTitleRow} style={{ marginBottom: 0 }}>
        <span className={styles.muted}>{t('grades.subtitle')}</span>
        <GradeSimulatorTrigger onOpen={onOpenSimulator} />
      </div>
      <GradesChart grades={validGrades as any} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('grades.colCourse')}</th>
              <th>{t('grades.colCredits')}</th>
              <th>{t('grades.colControl')}</th>
              <th>{t('grades.colCurrent')}</th>
              <th>{t('grades.colExam')}</th>
              <th>{t('grades.colFinal')}</th>
              <th>{t('grades.colEcts')}</th>
              <th>{t('grades.colTraditional')}</th>
            </tr>
          </thead>
          <tbody>
            {validGrades.map((gradeItem: any, index: number) => {
              const courseName =
                getGradeCourseName(gradeItem) ||
                gradeItem.courseName ||
                `${t('grades.discipline')} #${index + 1}`;

              return <GradeTableRow key={courseName + index} grade={gradeItem} index={index} />;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
