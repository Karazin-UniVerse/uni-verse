import React from 'react';
import type { Assignment } from '@uni-hub/types';
import { SimpleSlider } from '@una';
import styles from './GradeSimulator.module.scss';

export type RemainingAssignmentsSectionProps = {
  remainingAssignments: Assignment[];
  assignmentScores: Record<number, number>;
  onScoreChange: (id: number, score: number) => void;
};

export const RemainingAssignmentsSection: React.FC<RemainingAssignmentsSectionProps> = ({
  remainingAssignments,
  assignmentScores,
  onScoreChange,
}) => {
  if (remainingAssignments.length === 0) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          Окремі завдання семестру ({remainingAssignments.length})
        </span>
        <span className={styles.hint}>Впливають на семестровий бал</span>
      </div>
      <div className={styles.list}>
        {remainingAssignments.map((assignment) => {
          const score = assignmentScores[assignment.id] ?? 75;

          return (
            <label key={assignment.id} className={styles.row}>
              <div className={styles.rowTop}>
                <span className={styles.name} title={assignment.name}>
                  {assignment.name}
                </span>
                <span className={styles.score}>{score} %</span>
              </div>
              <SimpleSlider
                aria-label={`Бал за завдання ${assignment.name}`}
                min={0}
                max={100}
                value={score}
                onChange={(newScore: number) => onScoreChange(assignment.id, newScore)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
};
