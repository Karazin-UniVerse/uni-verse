import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Assignment, Grade } from '@uni-hub/types';
import {
  getGradeCourseName,
  getGradeRawValue,
  getGradeTone,
  getValidGrades,
} from '@uni-hub/utils/grades';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { Modal, Select, Empty, ProgressBar, Button as SimpleButton, SimpleSlider, Tag } from '@una';
import {
  calculateAccumulatedGrade,
  calculateExamTargets,
  clampScore,
  computeSimulatedFinal,
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
  type ControlType,
} from '@uni-hub/utils/gradeMath';
import styles from './GradeSimulator.module.scss';

export { clampScore, computeSimulatedFinal };

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

  const currentGrade = uniqueGrades.find(
    (grade) =>
      getGradeCourseName(grade).trim().toLowerCase() === selectedCourse.trim().toLowerCase(),
  );

  const controlType: ControlType = currentGrade?.controlType ?? 'exam';
  const isExam = controlType === 'exam';
  const maxSemester = isExam ? MAX_SEMESTER_EXAM : MAX_SEMESTER_CREDIT;

  // Base scores extracted from grade record
  const baseSemester = useMemo(() => {
    if (!currentGrade) {
      return isExam ? 45 : 75;
    }

    if (currentGrade.currentScore !== undefined && currentGrade.currentScore !== null) {
      return clampScore(Number(currentGrade.currentScore), 0, maxSemester);
    }

    const raw = getGradeRawValue(currentGrade);

    if (raw !== null) {
      return clampScore(raw, 0, maxSemester);
    }

    const parsed = Number.parseFloat(currentGrade.grade);

    return clampScore(Number.isNaN(parsed) ? 45 : parsed, 0, maxSemester);
  }, [currentGrade, isExam, maxSemester]);

  const baseExam = useMemo(() => {
    if (!currentGrade || !isExam) {
      return 30;
    }

    if (currentGrade.examScore !== undefined && currentGrade.examScore !== null) {
      return clampScore(Number(currentGrade.examScore), 0, MAX_EXAM);
    }

    return 30;
  }, [currentGrade, isExam]);

  const [semesterOverrides, setSemesterOverrides] = useState<Record<string, number>>({});
  const [examOverrides, setExamOverrides] = useState<Record<string, number>>({});

  const semesterScore = semesterOverrides[selectedCourse] ?? baseSemester;
  const examScore = examOverrides[selectedCourse] ?? baseExam;

  const setSemesterScore = (val: number) => {
    setSemesterOverrides((prev) => ({
      ...prev,
      [selectedCourse]: clampScore(val, 0, maxSemester),
    }));
  };

  const setExamScore = (val: number) => {
    setExamOverrides((prev) => ({
      ...prev,
      [selectedCourse]: clampScore(val, 0, MAX_EXAM),
    }));
  };

  const remainingAssignments = useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    const key = selectedCourse.trim().toLowerCase();

    return assignments.filter(
      (assignment) => (assignment.courseName || '').trim().toLowerCase() === key,
    );
  }, [assignments, selectedCourse]);

  const [assignmentScores, setAssignmentScores] = useState<Record<number, number>>({});

  const setAssignmentScore = (id: number, value: number) => {
    setAssignmentScores((prev) => {
      const updated = { ...prev, [id]: clampScore(value, 0, 100) };

      if (remainingAssignments.length > 0) {
        const avg =
          remainingAssignments.reduce((sum, a) => sum + (updated[a.id] ?? 75), 0) /
          remainingAssignments.length;
        // Proportionally simulate semester score based on assignment progress
        const simulated = Math.round(baseSemester + (avg * (maxSemester - baseSemester)) / 100);

        setSemesterScore(clampScore(simulated, 0, maxSemester));
      }

      return updated;
    });
  };

  // Compute university accumulation result
  const accumulationResult = useMemo(
    () =>
      calculateAccumulatedGrade({
        semesterScore,
        controlType,
        examScore: isExam ? examScore : null,
      }),
    [semesterScore, controlType, examScore, isExam],
  );

  const examTargets = useMemo(
    () => (isExam ? calculateExamTargets(semesterScore) : []),
    [isExam, semesterScore],
  );

  const isAdmitted = !isExam || semesterScore >= MIN_EXAM_ADMISSION;
  const animatedFinal = useCountUp(accumulationResult.totalScore, 400, open);
  const tone = getGradeTone(accumulationResult.totalScore);

  return (
    <Modal open={open} onClose={onClose} title="Симулятор оцінок — «Що, якщо?»" width={580}>
      {uniqueGrades.length === 0 ? (
        <Empty description="Немає оцінок для симуляції" />
      ) : (
        <div className={styles.body}>
          <div className={styles.courseHeader}>
            <div className={styles.courseHeaderTop}>
              <span className={styles.sectionTitle}>Оберіть дисципліну:</span>
              <Tag tone={isExam ? 'info' : 'neutral'}>
                {isExam ? 'Іспит (60 семестр + 40 екзамен)' : 'Залік (100 б. накопичувально)'}
              </Tag>
            </div>
            <Select
              value={selectedCourse}
              onChange={setCourseName}
              options={courseOptions}
              aria-label="Дисципліна"
            />
          </div>

          {isExam && (
            <div
              className={clsx(
                styles.admissionBanner,
                isAdmitted ? styles.admissionBannerSuccess : styles.admissionBannerDanger,
              )}
            >
              <span>{isAdmitted ? '🟢' : '🔴'}</span>
              <span>
                {isAdmitted
                  ? `Допущено до іспиту (${semesterScore} / 60 б. — поріг допуску 30 б. досягнуто)`
                  : `Не допущено до іспиту (${semesterScore} / 60 б. — бракує ${
                      MIN_EXAM_ADMISSION - semesterScore
                    } б. для допуску)`}
              </span>
            </div>
          )}

          {/* Semester score adjustment */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                {isExam ? 'Семестровий бал (поточна робота)' : 'Накопичений семестровий бал'}
              </span>
              <span className={styles.sectionValue}>
                {semesterScore} / {maxSemester} б.
              </span>
            </div>
            <SimpleSlider
              aria-label="Семестровий бал"
              min={0}
              max={maxSemester}
              value={semesterScore}
              onChange={setSemesterScore}
            />
          </div>

          {/* Exam score adjustment for exam courses */}
          {isExam && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                  Екзаменаційний бал (підсумковий контроль)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={styles.sectionValue}>{examScore} / 40 б.</span>
                  <Tag tone={examScore >= 20 ? 'success' : 'danger'}>
                    {examScore >= 20 ? 'Складено (≥ 20 б.)' : 'Не складено (< 20 б.)'}
                  </Tag>
                </div>
              </div>
              <SimpleSlider
                aria-label="Екзаменаційний бал"
                min={0}
                max={MAX_EXAM}
                value={examScore}
                disabled={!isAdmitted}
                onChange={setExamScore}
              />
            </div>
          )}

          {/* Exam Targets Grid */}
          {isExam && (
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
                      <span className={styles.targetStatus}>
                        {!isAdmitted
                          ? 'Недопуск'
                          : !target.isAchievable
                            ? 'Недосяжно'
                            : `${target.requiredExamScore} б.`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remaining course assignments simulation if present */}
          {remainingAssignments.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                  Окремі завдання семестру ({remainingAssignments.length})
                </span>
                <span className={styles.hint}>Впливають на семестровий бал</span>
              </div>
              <div className={styles.list}>
                {remainingAssignments.map((assignment) => {
                  const val = assignmentScores[assignment.id] ?? 75;

                  return (
                    <label key={assignment.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <span className={styles.name} title={assignment.name}>
                          {assignment.name}
                        </span>
                        <span className={styles.score}>{val} %</span>
                      </div>
                      <SimpleSlider
                        aria-label={`Бал за завдання ${assignment.name}`}
                        min={0}
                        max={100}
                        value={val}
                        onChange={(score: number) => setAssignmentScore(assignment.id, score)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final forecast section */}
          <div className={styles.forecast}>
            <div className={styles.forecastLabel}>
              Прогноз підсумкового результату (100-бальна накопичувальна шкала & ECTS)
            </div>
            <div
              className={styles.forecastValue}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
              }}
            >
              <span>{animatedFinal} / 100</span>
              <Tag tone={tone}>ECTS: {accumulationResult.ectsGrade}</Tag>
              <Tag tone={accumulationResult.isCoursePassed ? 'neutral' : 'danger'}>
                {accumulationResult.traditionalGrade}
              </Tag>
            </div>
            <ProgressBar value={accumulationResult.totalScore} tone={tone} />
            <p className={styles.statusMessage}>{accumulationResult.statusMessage}</p>
          </div>
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
    Симулятор балів (Що, якщо?)
  </SimpleButton>
);
