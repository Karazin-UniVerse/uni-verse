import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { Assignment, Grade } from '@uni-hub/types';
import { LanguageProvider, useLanguage } from '@uni-hub/i18n/LanguageContext';
import { AssignmentsDonut } from './AssignmentsDonut';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();

  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Tooltip: () => null,
    Pie: ({ data }: { data?: Array<{ name: string; value: number; color?: string }> }) => (
      <div data-testid="pie-series">
        {data?.map((entry) => (
          <div
            key={entry.name}
            data-testid={`pie-segment-${entry.name}`}
            data-name={entry.name}
            data-value={entry.value}
          >
            <span>{entry.name}</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    ),
  };
});

const LanguageSetter: React.FC<{ language: 'uk' | 'en' }> = ({ language }) => {
  const { setLanguage } = useLanguage();

  useEffect(() => {
    setLanguage(language);
  }, [language, setLanguage]);

  return null;
};

describe('AssignmentsDonut', () => {
  const FIXED_NOW = 1700000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render donut chart with accessible title and chart metrics', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Математика',
        name: 'Практична 1',
        duedate: FIXED_NOW + 3600,
        description: '',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={[]} />);

    const panel = screen.getByRole('region', { name: 'Статус завдань' });

    expect(panel).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Статус завдань' })).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-В процесі')).toBeInTheDocument();
    expect(screen.getAllByText('В процесі').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle zero or empty assignment state gracefully', () => {
    render(<AssignmentsDonut assignments={[]} grades={[]} />);

    expect(screen.getByText('Завдання не знайдені')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pie-series')).not.toBeInTheDocument();
  });

  it('should render correct counts for completed, pending, and overdue', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Алгебра',
        name: 'Модуль 1',
        duedate: FIXED_NOW - 1000,
        description: '',
        grade: '95',
      },
      {
        id: 2,
        courseName: 'Геометрія',
        name: 'Контрольна 1',
        duedate: FIXED_NOW - 1000,
        description: '',
        submissionStatus: 'graded',
      },
      {
        id: 3,
        courseName: 'Фізика',
        name: 'Лабораторна 1',
        duedate: FIXED_NOW + 1000,
        description: '',
        submissionStatus: 'submitted',
      },
      {
        id: 4,
        courseName: 'Хімія',
        name: 'Тест 1',
        duedate: FIXED_NOW - 500,
        description: '',
        submissionStatus: 'new',
      },
      {
        id: 5,
        courseName: 'Історія',
        name: 'Есе 1',
        duedate: FIXED_NOW + 5000,
        description: '',
        submissionStatus: 'new',
      },
      {
        id: 6,
        courseName: 'Філософія',
        name: 'Реферат',
        duedate: 0,
        description: '',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={[]} />);

    const completedSegment = screen.getByTestId('pie-segment-Виконано');
    const awaitingSegment = screen.getByTestId('pie-segment-Очікує перевірки');
    const overdueSegment = screen.getByTestId('pie-segment-Прострочено');
    const inProgressSegment = screen.getByTestId('pie-segment-В процесі');

    const total = assignments.length;
    const completedCount = Number(completedSegment.getAttribute('data-value'));
    const awaitingCount = Number(awaitingSegment.getAttribute('data-value'));
    const overdueCount = Number(overdueSegment.getAttribute('data-value'));
    const inProgressCount = Number(inProgressSegment.getAttribute('data-value'));

    expect(completedCount).toBe(2);
    expect(awaitingCount).toBe(1);
    expect(overdueCount).toBe(1);
    expect(inProgressCount).toBe(2);

    expect(Math.round((completedCount / total) * 100)).toBe(33);
    expect(Math.round((awaitingCount / total) * 100)).toBe(17);
    expect(Math.round((overdueCount / total) * 100)).toBe(17);
    expect(Math.round((inProgressCount / total) * 100)).toBe(33);
  });

  it('should classify assignment as completed when matching valid course grade exists in grades', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: '  Дискретна Математика  ',
        name: 'ДЗ 1',
        duedate: FIXED_NOW + 2000,
        description: '',
      },
    ];

    const grades: Grade[] = [
      {
        courseName: 'дискретна математика',
        grade: '88',
        rawGrade: 88,
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={grades} />);

    const completedSegment = screen.getByTestId('pie-segment-Виконано');

    expect(completedSegment).toHaveAttribute('data-value', '1');
    expect(screen.queryByTestId('pie-segment-В процесі')).not.toBeInTheDocument();
  });

  it('should ignore zero or empty course grades and keep assignment in progress', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Інформатика',
        name: 'Практична 1',
        duedate: FIXED_NOW + 2000,
        description: '',
      },
    ];

    const grades: Grade[] = [
      {
        courseName: 'Інформатика',
        grade: '0',
        rawGrade: 0,
      },
      {
        courseName: 'Інформатика',
        grade: '-',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={grades} />);

    expect(screen.queryByTestId('pie-segment-Виконано')).not.toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-В процесі')).toHaveAttribute('data-value', '1');
  });

  it('should prioritize graded status over submitted status', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Екологія',
        name: 'Презентація',
        duedate: FIXED_NOW - 100,
        description: '',
        submissionStatus: 'submitted',
        grade: '100',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={[]} />);

    expect(screen.getByTestId('pie-segment-Виконано')).toHaveAttribute('data-value', '1');
    expect(screen.queryByTestId('pie-segment-Очікує перевірки')).not.toBeInTheDocument();
  });

  it('should treat assignments with duedate 0 as in progress rather than overdue', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Право',
        name: 'Аналіз кейсу',
        duedate: 0,
        description: '',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={[]} />);

    expect(screen.getByTestId('pie-segment-В процесі')).toHaveAttribute('data-value', '1');
    expect(screen.queryByTestId('pie-segment-Прострочено')).not.toBeInTheDocument();
  });

  it('should dynamically update overdue and in-progress counts when periodic timer triggers', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Програмування',
        name: 'Лабораторна 2',
        duedate: FIXED_NOW + 15,
        description: '',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={[]} />);

    expect(screen.getByTestId('pie-segment-В процесі')).toHaveAttribute('data-value', '1');
    expect(screen.queryByTestId('pie-segment-Прострочено')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.queryByTestId('pie-segment-В процесі')).not.toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-Прострочено')).toHaveAttribute('data-value', '1');
  });

  it('should omit categories with zero assignments from donut segments', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Економіка',
        name: 'Курсова',
        duedate: FIXED_NOW - 500,
        description: '',
      },
    ];

    render(<AssignmentsDonut assignments={assignments} grades={[]} />);

    expect(screen.getByTestId('pie-segment-Прострочено')).toHaveAttribute('data-value', '1');
    expect(screen.queryByTestId('pie-segment-Виконано')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pie-segment-Очікує перевірки')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pie-segment-В процесі')).not.toBeInTheDocument();
  });

  it('should render localized titles and segment names in English when English locale is active', () => {
    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'English 101',
        name: 'Essay',
        duedate: FIXED_NOW + 1000,
        description: '',
      },
    ];

    render(
      <LanguageProvider>
        <LanguageSetter language="en" />
        <AssignmentsDonut assignments={assignments} grades={[]} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('region', { name: 'Assignment Status' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Assignment Status' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-In progress')).toHaveAttribute('data-value', '1');
  });
});
