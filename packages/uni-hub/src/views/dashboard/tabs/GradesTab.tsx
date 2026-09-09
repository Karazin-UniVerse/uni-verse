'use client';

import React from 'react';
import { Tag, ProgressBar } from '@una';
import { calculateEctsGrade, calculateTraditionalGrade, type ControlType } from '@core/types';
import { GradesChart } from '@uni-hub/components/grades';
import { GradeSimulatorTrigger } from '@uni-hub/components/gamification';
import { getValidGrades, getGradeTone, getGradeCourseName } from '@uni-hub/utils/grades';
import type { GradesTabProps } from '../types';
import { mockFallbackGrades } from '../constants';
import { getControlTypeLabel, parseGradeScore, getExamScoreDisplay } from '../utils';
import styles from '@uni-hub/views/DashboardPage.module.scss';

interface GradeTableRowProps {
  grade: any;
  index: number;
}

const GradeTableRow: React.FC<GradeTableRowProps> = ({ grade, index }) => {
  const cName = getGradeCourseName(grade) || grade.courseName || `Дисципліна #${index + 1}`;
  const totalScore = parseGradeScore(grade);
  const controlType: ControlType | undefined = grade.controlType;
  const ects = calculateEctsGrade(totalScore);
  const trad = calculateTraditionalGrade(totalScore, controlType ?? undefined);
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
        <strong>{cName}</strong>
      </td>
      <td>{creditsDisplay}</td>
      <td>
        {controlType ? (
          <Tag tone={controlType === 'exam' ? 'info' : 'neutral'}>
            {getControlTypeLabel(controlType)}
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
        <Tag tone={totalScore >= 60 ? 'success' : 'danger'}>{trad}</Tag>
      </td>
    </tr>
  );
};

export const GradesTab: React.FC<GradesTabProps> = ({ grades, onOpenSimulator }) => {
  const rawValidGrades = getValidGrades(grades);
  const validGrades = rawValidGrades.length > 0 ? rawValidGrades : mockFallbackGrades;

  return (
    <div className={styles.gradesStack}>
      <div className={styles.pageTitleRow} style={{ marginBottom: 0 }}>
        <span className={styles.muted}>Електронна залікова книжка та симулятор оцінок</span>
        <GradeSimulatorTrigger onOpen={onOpenSimulator} />
      </div>
      <GradesChart grades={validGrades as any} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дисципліна</th>
              <th>Кредити ECTS</th>
              <th>Форма контролю</th>
              <th>Поточний бал (0–60)</th>
              <th>Екзамен (0–40)</th>
              <th>Підсумковий 100-бальний бал</th>
              <th>Оцінка ECTS</th>
              <th>Традиційна (національна) оцінка</th>
            </tr>
          </thead>
          <tbody>
            {validGrades.map((g: any, index: number) => {
              const cName = getGradeCourseName(g) || g.courseName || `Дисципліна #${index + 1}`;

              return <GradeTableRow key={cName + index} grade={g} index={index} />;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
