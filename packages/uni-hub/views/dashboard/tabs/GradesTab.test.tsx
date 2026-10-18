import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Grade } from '@core/types/moodle';
import { mockFallbackGrades } from '../constants';
import { GradesTab } from './GradesTab';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();

  return {
    ...original,
    ResponsiveContainer: ({
      children,
      width = 500,
      height = 300,
    }: {
      children: React.ReactNode;
      width?: number | string;
      height?: number | string;
    }) => {
      const resolvedWidth = typeof width === 'number' ? width : 500;
      const resolvedHeight = typeof height === 'number' ? height : 300;

      return (
        <div
          data-testid="responsive-container"
          style={{ width: resolvedWidth, height: resolvedHeight }}
        >
          {React.isValidElement(children)
            ? React.cloneElement(children, {
                width: resolvedWidth,
                height: resolvedHeight,
              } as Record<string, unknown>)
            : children}
        </div>
      );
    },
  };
});

describe('GradesTab component', () => {
  const mockGrades: Grade[] = [
    {
      courseName: 'Вища математика',
      credits: 5,
      currentScore: 54,
      examScore: 36,
      totalScore: 90,
      grade: '90',
      rawGrade: 90,
      controlType: 'exam',
    },
    {
      courseName: 'Алгоритми та структури даних',
      credits: 4,
      currentScore: 48,
      examScore: 34,
      totalScore: 82,
      grade: '82',
      rawGrade: 82,
      controlType: 'differentiated_credit',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
    window.dispatchEvent(new Event('language-change'));
  });

  afterEach(() => {
    localStorage.clear();
    window.dispatchEvent(new Event('language-change'));
  });

  it('should render grades header, subtitle, and table columns', () => {
    const handleOpenSimulator = vi.fn();

    render(
      <LanguageProvider>
        <GradesTab grades={mockGrades} onOpenSimulator={handleOpenSimulator} />
      </LanguageProvider>,
    );

    const subtitle = screen.getByText('Електронна залікова книжка та симулятор оцінок');
    const triggerBtn = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });
    const table = screen.getByRole('table');
    const columnHeaders = within(table).getAllByRole('columnheader');

    expect(subtitle).toBeInTheDocument();
    expect(triggerBtn).toBeInTheDocument();
    expect(columnHeaders).toHaveLength(8);

    const expectedHeaders = [
      'Дисципліна',
      'Кредити ECTS',
      'Форма контролю',
      'Поточний бал (0–60)',
      'Екзамен (0–40)',
      'Підсумковий 100-бальний бал',
      'Оцінка ECTS',
      'Традиційна (національна) оцінка',
    ];

    expectedHeaders.forEach((headerText) => {
      expect(within(table).getByRole('columnheader', { name: headerText })).toBeInTheDocument();
    });
  });

  it('should render grade rows for each valid grade item', () => {
    const mixedGrades: Grade[] = [
      ...mockGrades,
      {
        courseName: 'Неактивний курс',
        grade: '0',
        rawGrade: 0,
      },
    ];

    render(
      <LanguageProvider>
        <GradesTab grades={mixedGrades} onOpenSimulator={vi.fn()} />
      </LanguageProvider>,
    );

    const table = screen.getByRole('table');

    expect(within(table).getByText('Вища математика')).toBeInTheDocument();
    expect(within(table).getByText('Алгоритми та структури даних')).toBeInTheDocument();
    expect(within(table).queryByText('Неактивний курс')).not.toBeInTheDocument();

    expect(within(table).getByText('5 ECTS')).toBeInTheDocument();
    expect(within(table).getByText('4 ECTS')).toBeInTheDocument();

    expect(within(table).getByText('Іспит')).toBeInTheDocument();
    expect(within(table).getByText('Диф. залік')).toBeInTheDocument();

    expect(within(table).getByText('54')).toBeInTheDocument();
    expect(within(table).getByText('48')).toBeInTheDocument();
    expect(within(table).getByText('36')).toBeInTheDocument();
    expect(within(table).getByText('34')).toBeInTheDocument();
    expect(within(table).getByText('90')).toBeInTheDocument();
    expect(within(table).getByText('82')).toBeInTheDocument();

    expect(within(table).getByText('A')).toBeInTheDocument();
    expect(within(table).getByText('B')).toBeInTheDocument();

    expect(within(table).getByText('відмінно')).toBeInTheDocument();
    expect(within(table).getByText('добре')).toBeInTheDocument();

    const tableRows = within(table).getAllByRole('row');

    expect(tableRows).toHaveLength(3);
  });

  it('should fall back to mock fallback grades when grades array is empty', () => {
    const { rerender } = render(
      <LanguageProvider>
        <GradesTab grades={[]} onOpenSimulator={vi.fn()} />
      </LanguageProvider>,
    );
    const table = screen.getByRole('table');

    mockFallbackGrades.forEach((fallbackItem) => {
      expect(within(table).getByText(fallbackItem.courseName)).toBeInTheDocument();
    });

    const fallbackRows = within(table).getAllByRole('row');

    expect(fallbackRows).toHaveLength(mockFallbackGrades.length + 1);

    rerender(
      <LanguageProvider>
        <GradesTab
          grades={[
            {
              courseName: 'Недійсний курс 1',
              grade: '0',
              rawGrade: 0,
            },
            {
              courseName: 'Недійсний курс 2',
              grade: '-',
            },
          ]}
          onOpenSimulator={vi.fn()}
        />
      </LanguageProvider>,
    );

    const updatedTable = screen.getByRole('table');

    mockFallbackGrades.forEach((fallbackItem) => {
      expect(within(updatedTable).getByText(fallbackItem.courseName)).toBeInTheDocument();
    });
    expect(within(updatedTable).queryByText('Недійсний курс 1')).not.toBeInTheDocument();
    expect(within(updatedTable).queryByText('Недійсний курс 2')).not.toBeInTheDocument();
  });

  it('should call onOpenSimulator when simulator trigger button is clicked', async () => {
    const handleOpenSimulator = vi.fn();
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <GradesTab grades={mockGrades} onOpenSimulator={handleOpenSimulator} />
      </LanguageProvider>,
    );

    const triggerBtn = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });

    expect(handleOpenSimulator).not.toHaveBeenCalled();

    await user.click(triggerBtn);

    expect(handleOpenSimulator).toHaveBeenCalledTimes(1);
  });

  it('should fallback to indexed discipline label when courseName is missing', () => {
    const gradesWithoutName: Grade[] = [
      {
        courseName: '',
        credits: 3,
        currentScore: 40,
        examScore: 30,
        totalScore: 70,
        grade: '70',
        rawGrade: 70,
        controlType: 'credit',
      },
    ];

    render(
      <LanguageProvider>
        <GradesTab grades={gradesWithoutName} onOpenSimulator={vi.fn()} />
      </LanguageProvider>,
    );

    const table = screen.getByRole('table');

    expect(within(table).getByText('Дисципліна #1')).toBeInTheDocument();
  });

  it('should localize table headers and subtitle in English when language is set to English', () => {
    localStorage.setItem('universe-lang', 'en');
    window.dispatchEvent(new Event('language-change'));

    render(
      <LanguageProvider>
        <GradesTab grades={mockGrades} onOpenSimulator={vi.fn()} />
      </LanguageProvider>,
    );

    const table = screen.getByRole('table');

    expect(screen.getByText('Electronic gradebook and grade simulator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grade Simulator (What if?)' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'ECTS Credits' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Control Form' })).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Current Score (0–60)' }),
    ).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Exam (0–40)' })).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Final 100-Point Grade' }),
    ).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'ECTS Grade' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'National Grade' })).toBeInTheDocument();
  });
});
