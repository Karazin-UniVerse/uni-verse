import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Grade } from '@core/types/moodle';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { withLanguage } from '@uni-hub/utils/test-utils';
import * as una from '@una';
import { GradesChart } from './GradesChart';



const LanguageSetter: React.FC<{ language: 'uk' | 'en' }> = ({ language }) => {
  const { setLanguage } = useLanguage();

  useEffect(() => {
    setLanguage(language);
  }, [language, setLanguage]);

  return null;
};

describe('GradesChart', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render chart container with data when valid grades are provided', () => {
    const chartSpy = vi.spyOn(una, 'Chart');
    const grades: Grade[] = [
      {
        courseName: 'Вища математика',
        grade: '95',
        rawGrade: 95,
      },
      {
        courseName: 'Програмування',
        grade: '80',
        rawGrade: 80,
      },
    ];

    render(withLanguage(<GradesChart grades={grades} />));

    expect(document.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(chartSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        type: 'bar',
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Вища математика', value: 95 }),
          expect.objectContaining({ name: 'Програмування', value: 80 }),
        ]),
      }),
    );
    expect(screen.queryByText('Оцінки не знайдено')).not.toBeInTheDocument();
  });

  it('should render empty chart description when grades array is empty', () => {
    const { rerender } = render(withLanguage(<GradesChart grades={[]} />));

    expect(screen.getByText('Оцінки не знайдено')).toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument();

    const invalidGrades: Grade[] = [
      {
        courseName: 'Філософія',
        grade: '0',
        rawGrade: 0,
      },
      {
        courseName: 'Соціологія',
        grade: '-',
      },
      {
        courseName: 'Політологія',
        grade: '',
      },
    ];

    rerender(withLanguage(<GradesChart grades={invalidGrades} />));

    expect(screen.getByText('Оцінки не знайдено')).toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument();
  });

  it('should compute bar colors and map grade values correctly', () => {
    const chartSpy = vi.spyOn(una, 'Chart');

    const grades: Grade[] = [
      {
        courseName: 'Математичний аналіз',
        grade: '92',
        rawGrade: 92,
      },
      {
        courseName: 'Фізика',
        grade: '65',
        rawGrade: 65,
      },
      {
        courseName: 'Хімія',
        grade: '45',
        rawGrade: 45,
      },
      {
        courseName: '',
        grade: '75',
        rawGrade: 75,
      },
    ];

    render(withLanguage(<GradesChart grades={grades} />));

    const passedProps = chartSpy.mock.lastCall?.[0];

    expect(passedProps).toEqual(
      expect.objectContaining({
        type: 'bar',
        layout: 'horizontal',
        domain: [0, 100],
        valueLabel: 'Оцінка',
        emptyDescription: 'Оцінки не знайдено',
        data: [
          {
            name: 'Математичний аналіз',
            value: 92,
            color: 'var(--chart-success)',
          },
          {
            name: 'Фізика',
            value: 65,
            color: 'var(--chart-warning)',
          },
          {
            name: 'Хімія',
            value: 45,
            color: 'var(--chart-danger)',
          },
          {
            name: 'Курс',
            value: 75,
            color: 'var(--chart-success)',
          },
        ],
      }),
    );
  });

  it('should localize labels according to LanguageProvider', () => {
    localStorage.setItem('universe-lang', 'en');

    const chartSpy = vi.spyOn(una, 'Chart');

    const grades: Grade[] = [
      {
        courseName: '',
        grade: '88',
        rawGrade: 88,
      },
    ];

    const { rerender } = render(
      withLanguage(<><LanguageSetter language="en" /><GradesChart grades={grades} /></>),
    );

    const passedProps = chartSpy.mock.lastCall?.[0];

    expect(passedProps).toEqual(
      expect.objectContaining({
        valueLabel: 'Grade',
        emptyDescription: 'No grades found',
        data: [
          {
            name: 'Course',
            value: 88,
            color: 'var(--chart-success)',
          },
        ],
      }),
    );

    rerender(
      withLanguage(<><LanguageSetter language="en" /><GradesChart grades={[]} /></>),
    );

    expect(screen.getByText('No grades found')).toBeInTheDocument();
  });
});
