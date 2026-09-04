import React, { useMemo } from 'react';
import type { Grade } from '../types';
import {
  getValidGrades,
  getGradeBarColor,
  getGradeCourseName,
  getGradeRawValue,
} from '@uni-hub/utils/grades';
import Chart from '../design-system/charts/Chart/Chart';

type GradesChartProps = {
  grades: Grade[];
};

export const GradesChart: React.FC<GradesChartProps> = ({ grades }) => {
  const validGrades = useMemo(() => getValidGrades(grades), [grades]);

  const chartData = useMemo(
    () =>
      validGrades.map((grade) => {
        const gradeValue = getGradeRawValue(grade) ?? 0;

        return {
          name: getGradeCourseName(grade) || 'Курс',
          value: gradeValue,
          color: getGradeBarColor(gradeValue),
        };
      }),
    [validGrades],
  );

  return (
    <Chart
      type="bar"
      layout="horizontal"
      data={chartData}
      domain={[0, 100]}
      valueLabel="Оценка"
      emptyDescription="Оценки не найдены"
    />
  );
};
