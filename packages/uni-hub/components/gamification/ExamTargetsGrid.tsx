import React from 'react';
import clsx from 'clsx';
import type { ExamTargetRequirement, GradeAccumulationResult } from '@core/utils/grades';
import styles from './GradeSimulator.module.scss';

function getTargetStatusText(target: ExamTargetRequirement, isAdmitted: boolean): string {
  if (!isAdmitted) {
    return 'Недопуск';
  }

  if (!target.isAchievable) {
    return 'Недосяжно';
  }

  return `${target.requiredExamScore} б.`;
}

export type ExamTargetsGridProps = {
  examTargets: ExamTargetRequirement[];
  isAdmitted: boolean;
  accumulationResult: GradeAccumulationResult;
};

export const ExamTargetsGrid: React.FC<ExamTargetsGridProps> = ({
  examTargets,
  isAdmitted,
  accumulationResult,
}) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      <span className={styles.sectionTitle}>
        Цільові бали на іспиті («Що потрібно для оцінки?»)
      </span>
      <span className={styles.hint}>Мін. екзамену: 20 б.</span>
    </div>
    <div className={styles.targetsGrid}>
      {examTargets.map((target) => {
        const isCurrentAchieved =
          isAdmitted &&
          accumulationResult.isCoursePassed &&
          accumulationResult.ectsGrade === target.grade;
        const isUnreachable = !isAdmitted || !target.isAchievable;

        return (
          <div
            key={target.grade}
            className={clsx(
              styles.targetCard,
              isCurrentAchieved && styles.targetCardActive,
              isUnreachable && styles.targetCardUnreachable,
            )}
          >
            <span className={styles.targetGrade}>{target.grade}</span>
            <span className={styles.targetPoints}>≥ {target.minTotalScore} б.</span>
            <span className={styles.targetStatus}>{getTargetStatusText(target, isAdmitted)}</span>
          </div>
        );
      })}
    </div>
  </div>
);
