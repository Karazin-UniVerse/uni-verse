'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Assignment, Grade } from '@uni-hub/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getGradeCourseName, getValidGrades } from '@uni-hub/utils/grades';
import { Chart } from '@una';

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
  const { t } = useLanguage();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const segments = useMemo(() => {
    if (assignments.length === 0) {
      return [];
    }

    const gradedCourses = new Set(
      getValidGrades(grades)
        .map((grade) => getGradeCourseName(grade).toLowerCase())
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
      result.push({ name: t('donut.completed'), value: done, color: COLORS.done });
    }

    if (overdue > 0) {
      result.push({ name: t('donut.overdue'), value: overdue, color: COLORS.overdue });
    }

    if (inProgress > 0) {
      result.push({ name: t('donut.inProgress'), value: inProgress, color: COLORS.inProgress });
    }

    return result;
  }, [assignments, grades, nowSec, t]);

  return (
    <Chart
      type="donut"
      title={t('donut.title')}
      data={segments}
      height={DONUT_CHART_HEIGHT}
      emptyDescription={t('donut.empty')}
    />
  );
};
