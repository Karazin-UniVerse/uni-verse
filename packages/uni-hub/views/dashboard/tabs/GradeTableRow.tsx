import React from 'react';
import { Tag, ProgressBar } from '@una';
import { GRADES_THRESHOLD } from '@core/constants/grades';
import {
  calculateEctsGrade,
  calculateTraditionalGrade,
  type ControlType,
} from '@core/utils/grades';
import { getGradeTone, getGradeCourseName } from '@uni-hub/utils/grades';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Grade } from '@uni-hub/types';
import {
  getControlTypeLabel,
  getTraditionalGradeLabel,
  parseGradeScore,
  getExamScoreDisplay,
} from '../utils';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export type GradeDisplayItem = Grade & {
  credits?: number | null;
  currentScore?: number | string | null;
  examScore?: number | string | null;
  totalScore?: number | string | null;
};

interface GradeTableRowProps {
  grade: GradeDisplayItem;
  index: number;
}

export const GradeTableRow: React.FC<GradeTableRowProps> = ({ grade, index }) => {
  const { formatMessage } = useLanguage();
  const courseName =
    getGradeCourseName(grade) ||
    grade.courseName ||
    `${formatMessage('grades.discipline')} #${index + 1}`;
  const totalScore = parseGradeScore(grade);
  const controlType: ControlType | undefined = grade.controlType;
  const ects = calculateEctsGrade(totalScore);
  const rawTraditional = calculateTraditionalGrade(totalScore, controlType ?? undefined);
  const traditionalGrade = getTraditionalGradeLabel(rawTraditional, formatMessage);
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
            {getControlTypeLabel(controlType, formatMessage)}
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
