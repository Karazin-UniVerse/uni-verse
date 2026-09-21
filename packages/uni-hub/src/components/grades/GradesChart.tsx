import React, { useMemo } from 'react';
import type { Grade } from '@uni-hub/types';
import {
  getValidGrades,
  getGradeBarColor,
  getGradeCourseName,
  getGradeRawValue,
} from '@uni-hub/utils/grades';
import { Chart } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

type GradesChartProps = {
  grades: Grade[];
};

export const GradesChart: React.FC<GradesChartProps> = ({ grades }) => {
  const { t } = useLanguage();
  const validGrades = useMemo(() => getValidGrades(grades), [grades]);

  const chartData = useMemo(
    () =>
      validGrades.map((grade) => {
        const gradeValue = getGradeRawValue(grade) ?? 0;

        return {
          name: getGradeCourseName(grade) || t('grades.defaultCourse'),
          value: gradeValue,
          color: getGradeBarColor(gradeValue),
        };
      }),
    [validGrades, t],
  );

  return (
    <Chart
      type="bar"
      layout="horizontal"
      data={chartData}
      domain={[0, 100]}
      valueLabel={t('grades.chartValue')}
      emptyDescription={t('grades.chartEmpty')}
    />
  );
};
