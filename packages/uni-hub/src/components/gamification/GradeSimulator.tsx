import React, { useMemo, useState } from 'react';
import type { Assignment, Grade } from '@uni-hub/types';
import {
  getGradeCourseName,
  getGradeRawValue,
  getGradeTone,
  getValidGrades,
} from '@uni-hub/utils/grades';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { Modal, Select, Empty, ProgressBar, Button, SimpleSlider, Tag } from '@una';
import { clampScore } from '@uni-hub/utils/gradeMath';
import {
  MAX_EXAM,
  MAX_SEMESTER_CREDIT,
  MAX_SEMESTER_EXAM,
  MIN_EXAM_ADMISSION,
} from '@core/constants';
import { calculateAccumulatedGrade, calculateExamTargets } from '@core/utils';
import type { ControlType } from '@core/types';
import { AdmissionBanner } from './AdmissionBanner';
import { ExamTargetsGrid } from './ExamTargetsGrid';
import { RemainingAssignmentsSection } from './RemainingAssignmentsSection';
import styles from './GradeSimulator.module.scss';

function getUniqueGrades(validGrades: Grade[]): Grade[] {
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
}

function getBaseSemester(
  currentGrade?: Grade,
  isExam = true,
  maxSemester = MAX_SEMESTER_EXAM,
): number {
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
}

function getBaseExam(currentGrade?: Grade, isExam = true): number {
  if (!currentGrade || !isExam) {
    return 30;
  }

  if (currentGrade.examScore !== undefined && currentGrade.examScore !== null) {
    return clampScore(Number(currentGrade.examScore), 0, MAX_EXAM);
  }

  return 30;
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
  const uniqueGrades = useMemo(() => getUniqueGrades(validGrades), [validGrades]);

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

  const baseSemester = useMemo(
    () => getBaseSemester(currentGrade, isExam, maxSemester),
    [currentGrade, isExam, maxSemester],
  );

  const baseExam = useMemo(() => getBaseExam(currentGrade, isExam), [currentGrade, isExam]);

  const [semesterOverrides, setSemesterOverrides] = useState<Record<string, number>>({});
  const [examOverrides, setExamOverrides] = useState<Record<string, number>>({});

  const semesterScore = semesterOverrides[selectedCourse] ?? baseSemester;
  const examScore = examOverrides[selectedCourse] ?? baseExam;

  const setSemesterScore = (score: number) => {
    setSemesterOverrides((prev) => ({
      ...prev,
      [selectedCourse]: clampScore(score, 0, maxSemester),
    }));
  };

  const setExamScore = (score: number) => {
    setExamOverrides((prev) => ({
      ...prev,
      [selectedCourse]: clampScore(score, 0, MAX_EXAM),
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

  const setAssignmentScore = (id: number, score: number) => {
    const updatedScores = {
      ...assignmentScores,
      [id]: clampScore(score, 0, 100),
    };

    setAssignmentScores(updatedScores);

    if (remainingAssignments.length > 0) {
      const averagePercent =
        remainingAssignments.reduce(
          (sum, assignment) => sum + (updatedScores[assignment.id] ?? 75),
          0,
        ) / remainingAssignments.length;
      const simulatedSemester = Math.round(
        baseSemester + (averagePercent * (maxSemester - baseSemester)) / 100,
      );

      setSemesterScore(simulatedSemester);
    }
  };

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

  if (uniqueGrades.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Симулятор оцінок — «Що, якщо?»" width={580}>
        <Empty description="Немає оцінок для симуляції" />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Симулятор оцінок — «Що, якщо?»" width={580}>
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

        {isExam && <AdmissionBanner isAdmitted={isAdmitted} semesterScore={semesterScore} />}

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
              <span className={styles.sectionTitle}>Екзаменаційний бал (підсумковий контроль)</span>
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
          <ExamTargetsGrid
            examTargets={examTargets}
            isAdmitted={isAdmitted}
            accumulationResult={accumulationResult}
          />
        )}

        {/* Remaining course assignments simulation if present */}
        <RemainingAssignmentsSection
          remainingAssignments={remainingAssignments}
          assignmentScores={assignmentScores}
          onScoreChange={setAssignmentScore}
        />

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
    </Modal>
  );
};

type GradeSimulatorTriggerProps = {
  onOpen: () => void;
};

export const GradeSimulatorTrigger: React.FC<GradeSimulatorTriggerProps> = ({ onOpen }) => (
  <Button type="button" variant="secondary" size="small" onClick={onOpen}>
    Симулятор балів (Що, якщо?)
  </Button>
);
