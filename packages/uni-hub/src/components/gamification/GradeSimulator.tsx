import React, { useEffect, useMemo, useState } from 'react';
import type { Assignment, Grade } from '@uni-hub/types';
import {
  getGradeCourseName,
  getGradeRawValue,
  getGradeTone,
  getValidGrades,
} from '@uni-hub/utils/grades';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { Modal } from '@ui/Modal';
import { Select } from '@ui/Select';
import { Empty } from '@ui/Empty';
import { ProgressBar } from '@ui/ProgressBar';
import { SimpleButton, SimpleSlider } from '@uni-hub/design-system';
import styles from './GradeSimulator.module.scss';

const DEFAULT_SCORE = 75;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return DEFAULT_SCORE;

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

export function computeSimulatedFinal(currentScore: number, remainingScores: number[]): number {
  if (remainingScores.length === 0) return currentScore;

  const simulatedAvg = remainingScores.reduce((sum, val) => sum + val, 0) / remainingScores.length;

  return currentScore * 0.7 + simulatedAvg * 0.3;
}

type GradeSimulatorProps = {
  assignments: Assignment[];
  grades: Grade[];
  onClose: () => void;
  open: boolean;
};

export const GradeSimulator: React.FC<GradeSimulatorProps> = ({
  assignments,
  grades,
  onClose,
  open,
}) => {
  const validGrades = useMemo(() => getValidGrades(grades), [grades]);

  const uniqueGrades = useMemo(() => {
    const seenCourseNames = new Set<string>();
    const uniqueList: Grade[] = [];

    for (const grade of validGrades) {
      const name = getGradeCourseName(grade).trim();

      if (name && !seenCourseNames.has(name.toLowerCase())) {
        seenCourseNames.add(name.toLowerCase());
        uniqueList.push(grade);
      }
    }

    return uniqueList;
  }, [validGrades]);

  const courseOptions = useMemo(
    () =>
      uniqueGrades.map((grade) => {
        const name = getGradeCourseName(grade).trim();

        return {
          value: name,
          label: name,
        };
      }),
    [uniqueGrades],
  );

  const [courseName, setCourseName] = useState('');

  const isSelectedCourseValid = courseOptions.some((option) => option.value === courseName);
  const selectedCourse = isSelectedCourseValid ? courseName : courseOptions[0]?.value || '';

  useEffect(() => {
    if (courseName && !isSelectedCourseValid && courseOptions.length > 0) {
      setCourseName(courseOptions[0].value);
    }
  }, [courseName, isSelectedCourseValid, courseOptions]);

  const currentGrade = uniqueGrades.find(
    (grade) =>
      getGradeCourseName(grade).trim().toLowerCase() === selectedCourse.trim().toLowerCase(),
  );

  const currentScore = currentGrade
    ? (getGradeRawValue(currentGrade) ?? (Number.parseFloat(currentGrade.grade) || 0))
    : 0;

  const remaining = useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    const key = selectedCourse.trim().toLowerCase();

    return assignments.filter(
      (assignment) => (assignment.courseName || '').trim().toLowerCase() === key,
    );
  }, [assignments, selectedCourse]);

  const [scores, setScores] = useState<Record<number, number>>({});

  const remainingValues = remaining.map((assignment) =>
    clampScore(scores[assignment.id] ?? DEFAULT_SCORE),
  );

  const finalScore = computeSimulatedFinal(currentScore, remainingValues);
  const animatedFinal = useCountUp(Math.round(finalScore), 400, open);
  const tone = getGradeTone(finalScore);

  const setScore = (id: number, value: number) => {
    setScores((previousScores) => ({ ...previousScores, [id]: clampScore(value) }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Симулятор оценок — «Что, если?»" width={560}>
      {uniqueGrades.length === 0 ? (
        <Empty description="Нет оценок для симуляции" />
      ) : (
        <div className={styles.body}>
          <p className={styles.hint}>
            Текущая оценка курса — 70% итога. Гипотетические работы делят оставшиеся 30%.
          </p>

          <Select
            value={selectedCourse}
            onChange={setCourseName}
            options={courseOptions}
            aria-label="Курс"
          />

          <div className={styles.forecast}>
            <div className={styles.forecastLabel}>Прогноз итога</div>
            <div className={styles.forecastValue}>{animatedFinal}</div>
            <ProgressBar value={finalScore} tone={tone} />
          </div>

          {remaining.length === 0 ? (
            <Empty description="Нет заданий по этому курсу — показываем только текущую оценку" />
          ) : (
            <div className={styles.list}>
              {remaining.map((assignment) => {
                const value = scores[assignment.id] ?? 75;

                return (
                  <label key={assignment.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <span className={styles.name} title={assignment.name}>
                        {assignment.name}
                      </span>
                      <span className={styles.score}>{value}</span>
                    </div>
                    <SimpleSlider
                      min={MIN_SCORE}
                      max={MAX_SCORE}
                      value={value}
                      onChange={(score) => setScore(assignment.id, score)}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

type GradeSimulatorTriggerProps = {
  onOpen: () => void;
};

export const GradeSimulatorTrigger: React.FC<GradeSimulatorTriggerProps> = ({ onOpen }) => (
  <SimpleButton type="button" variant="secondary" size="small" onClick={onOpen}>
    Что, если?
  </SimpleButton>
);
