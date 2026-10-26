import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as una from '@una';
import type { Assignment, Grade } from '@core/types/moodle';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { AssignmentsDonut } from './AssignmentsDonut';

describe('AssignmentsDonut', () => {
  const FIXED_NOW = 1700000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW * 1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(screen.getByRole('region', { name: 'Статус завдань' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Статус завдань' })).toBeInTheDocument();
    expect(screen.getByText('В процесі')).toBeInTheDocument();
  });

  it('should handle zero or empty assignment state gracefully', () => {
    render(<AssignmentsDonut assignments={[]} grades={[]} />);

    expect(screen.getByText('Завдання не знайдені')).toBeInTheDocument();
    expect(screen.queryByText('В процесі')).not.toBeInTheDocument();
  });

  it('should render correct counts for completed, pending, and overdue', () => {
    const chartSpy = vi.spyOn(una, 'Chart');
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

    expect(screen.getByText('Виконано')).toBeInTheDocument();
    expect(screen.getByText('Очікує перевірки')).toBeInTheDocument();
    expect(screen.getByText('Прострочено')).toBeInTheDocument();
    expect(screen.getByText('В процесі')).toBeInTheDocument();

    const passedProps = chartSpy.mock.lastCall?.[0];

    expect(passedProps?.data).toEqual([
      expect.objectContaining({ name: 'Виконано', value: 2 }),
      expect.objectContaining({ name: 'Очікує перевірки', value: 1 }),
      expect.objectContaining({ name: 'Прострочено', value: 1 }),
      expect.objectContaining({ name: 'В процесі', value: 2 }),
    ]);
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

    expect(screen.getByText('Виконано')).toBeInTheDocument();
    expect(screen.queryByText('В процесі')).not.toBeInTheDocument();
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

    expect(screen.queryByText('Виконано')).not.toBeInTheDocument();
    expect(screen.getByText('В процесі')).toBeInTheDocument();
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

    expect(screen.getByText('Виконано')).toBeInTheDocument();
    expect(screen.queryByText('Очікує перевірки')).not.toBeInTheDocument();
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

    expect(screen.getByText('В процесі')).toBeInTheDocument();
    expect(screen.queryByText('Прострочено')).not.toBeInTheDocument();
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

    expect(screen.getByText('В процесі')).toBeInTheDocument();
    expect(screen.queryByText('Прострочено')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.queryByText('В процесі')).not.toBeInTheDocument();
    expect(screen.getByText('Прострочено')).toBeInTheDocument();
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

    expect(screen.getByText('Прострочено')).toBeInTheDocument();
    expect(screen.queryByText('Виконано')).not.toBeInTheDocument();
    expect(screen.queryByText('Очікує перевірки')).not.toBeInTheDocument();
    expect(screen.queryByText('В процесі')).not.toBeInTheDocument();
  });

  it('should render localized titles and segment names in English when English locale is active', () => {
    window.localStorage.setItem('universe-lang', 'en');

    const assignments: Assignment[] = [
      {
        id: 1,
        courseName: 'English 101',
        name: 'Essay',
        duedate: FIXED_NOW + 1000,
        description: '',
      },
    ];

    render(withLanguage(<AssignmentsDonut assignments={assignments} grades={[]} />));

    expect(screen.getByRole('region', { name: 'Assignment Status' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Assignment Status' }),
    ).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});
