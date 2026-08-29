import React, { useMemo } from 'react';
import type { Grade } from '../types';
import {
  getValidGrades,
  getGradeBarColor,
  getGradeCourseName,
  getGradeRawValue,
} from '../utils/grades';
import Chart from '../design-system/charts/Chart/Chart';

type GradesChartProps = {
  grades: Grade[];
};

export const GradesChart: React.FC<GradesChartProps> = ({ grades }) => {
  const validGrades = useMemo(() => getValidGrades(grades), [grades]);

  const chartData = useMemo(
    () =>
      validGrades.map((g) => {
        const val = getGradeRawValue(g) ?? 0;
        return {
          name: getGradeCourseName(g) || 'Курс',
          value: val,
          color: getGradeBarColor(val),
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
