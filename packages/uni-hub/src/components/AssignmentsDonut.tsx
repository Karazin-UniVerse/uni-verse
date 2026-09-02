import React, { useMemo, useState } from 'react';
import type { Assignment, Grade } from '../types';
import { getValidGrades } from '../utils/grades';
import Chart from '../design-system/charts/Chart/Chart';

type AssignmentsDonutProps = {
  assignments: Assignment[];
  grades: Grade[];
};

const DONUT_CHART_HEIGHT = 260;

const COLORS = {
  done: 'var(--chart-success)',
  overdue: 'var(--chart-danger)',
  inProgress: 'var(--chart-info)',
} as const;

export const AssignmentsDonut: React.FC<AssignmentsDonutProps> = ({ assignments, grades }) => {
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  const segments = useMemo(() => {
    if (assignments.length === 0) {
      return [];
    }

    const gradedCourses = new Set(
      getValidGrades(grades)
        .map((grade) => (grade.courseName || grade.course_name || '').trim().toLowerCase())
        .filter(Boolean),
    );

    let done = 0;
    let overdue = 0;
    let inProgress = 0;

    for (const assignment of assignments) {
      const courseKey = (assignment.courseName || '').trim().toLowerCase();
      const isDone = gradedCourses.has(courseKey);

      if (isDone) {
        done += 1;
      } else if (assignment.duedate > 0 && assignment.duedate < nowSec) {
        overdue += 1;
      } else {
        inProgress += 1;
      }
    }

    const result: { name: string; value: number; color: string }[] = [];

    if (done > 0) {
      result.push({ name: 'Выполнено', value: done, color: COLORS.done });
    }

    if (overdue > 0) {
      result.push({ name: 'Просрочено', value: overdue, color: COLORS.overdue });
    }

    if (inProgress > 0) {
      result.push({ name: 'В процессе', value: inProgress, color: COLORS.inProgress });
    }

    return result;
  }, [assignments, grades, nowSec]);

  return (
    <Chart
      type="donut"
      title="Статус заданий"
      data={segments}
      height={DONUT_CHART_HEIGHT}
      emptyDescription="Задания не найдены"
    />
  );
};
