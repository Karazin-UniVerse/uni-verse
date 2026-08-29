import React, { useMemo, useState } from 'react';
import type { Assignment, Grade } from '@/types';
import { computeSimulatedFinal } from '@/utils/gradeMath';
import { getValidGrades, getGradeTone, getGradeCourseName, getGradeRawValue } from '@/utils/grades';
import { useCountUp } from '@/hooks/useCountUp';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { ProgressBar } from '../ui/ProgressBar';
import { Empty } from '../ui/Empty';
import { SimpleButton, SimpleSlider } from '../../design-system';
import styles from './GradeSimulator.module.scss';

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const DEFAULT_SCORE = 75;

const clampScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCORE;
  }

  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value));
};

type GradeSimulatorProps = {
  open: boolean;
  onClose: () => void;
  grades: Grade[];
  assignments: Assignment[];
};

export const GradeSimulator: React.FC<GradeSimulatorProps> = ({
  open,
  onClose,
  grades,
  assignments,
}) => {
  const validGrades = useMemo(() => getValidGrades(grades), [grades]);

  const courseOptions = useMemo(
    () =>
      validGrades.map((g) => {
        const name = getGradeCourseName(g);
        return {
          value: name,
          label: name,
        };
      }),
    [validGrades],
  );

  const [courseName, setCourseName] = useState('');
  const selectedCourse = courseName || courseOptions[0]?.value || '';

  const currentGrade = validGrades.find((g) => getGradeCourseName(g) === selectedCourse);
  const currentScore = currentGrade
    ? (getGradeRawValue(currentGrade) ?? (Number.parseFloat(currentGrade.grade) || 0))
    : 0;

  const remaining = useMemo(() => {
    if (!selectedCourse) return [];
    const key = selectedCourse.trim().toLowerCase();
    return assignments.filter((a) => (a.courseName || '').trim().toLowerCase() === key);
  }, [assignments, selectedCourse]);

  const [scores, setScores] = useState<Record<number, number>>({});

  const remainingValues = remaining.map((a) => clampScore(scores[a.id] ?? DEFAULT_SCORE));
  const finalScore = computeSimulatedFinal(currentScore, remainingValues);
  const animatedFinal = useCountUp(Math.round(finalScore), 400, open);
  const tone = getGradeTone(finalScore);

  const setScore = (id: number, value: number) => {
    setScores((prev) => ({ ...prev, [id]: clampScore(value) }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Симулятор оценок — «Что, если?»" width={560}>
      {validGrades.length === 0 ? (
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
              {remaining.map((a) => {
                const value = scores[a.id] ?? 75;
                return (
                  <label key={a.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <span className={styles.name} title={a.name}>
                        {a.name}
                      </span>
                      <span className={styles.score}>{value}</span>
                    </div>
                    <SimpleSlider
                      min={MIN_SCORE}
                      max={MAX_SCORE}
                      value={value}
                      onChange={(val) => setScore(a.id, val)}
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
