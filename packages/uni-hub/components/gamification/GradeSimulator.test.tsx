import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { Assignment, Grade } from '@core/types/moodle';
import { GradeSimulator } from './GradeSimulator';

vi.mock('@uni-hub/hooks/useCountUp', () => ({
  useCountUp: (target: number) => target,
}));

const mockExamGrade: Grade = {
  courseName: 'Математичний аналіз',
  grade: '85',
  currentScore: 45,
  controlType: 'exam',
};

const mockCreditGrade: Grade = {
  courseName: 'Програмування',
  grade: '90',
  currentScore: 90,
  controlType: 'credit',
};

const renderSimulator = (props: Partial<React.ComponentProps<typeof GradeSimulator>> = {}) => {
  const defaultProps: React.ComponentProps<typeof GradeSimulator> = {
    assignments: [],
    grades: [],
    onClose: vi.fn(),
    open: true,
    ...props,
  };

  return render(
    withLanguage(<GradeSimulator {...defaultProps} />),
  );
};

describe('GradeSimulator component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
    window.dispatchEvent(new Event('language-change'));
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
    window.dispatchEvent(new Event('language-change'));
  });

  it('should render empty state modal when no grades are provided', () => {
    renderSimulator({ grades: [], open: true });

    expect(
      screen.getByRole('dialog', { name: 'Симулятор оцінок — «Що, якщо?»' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Немає оцінок для симуляції')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should render grade simulator modal with course select, semester slider, and forecast when open is true', () => {
    renderSimulator({ grades: [mockExamGrade], open: true });

    const dialog = screen.getByRole('dialog', { name: 'Симулятор оцінок — «Що, якщо?»' });
    const select = screen.getByRole('combobox', { name: 'Дисципліна' });
    const semesterSlider = screen.getByRole('slider', { name: 'Семестровий бал' });

    expect(dialog).toBeInTheDocument();
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('Математичний аналіз');
    expect(semesterSlider).toBeInTheDocument();
    expect(semesterSlider).toHaveValue('45');
    expect(
      screen.getByText('Прогноз підсумкового результату (100-бальна накопичувальна шкала & ECTS)'),
    ).toBeInTheDocument();
    expect(screen.getByText('75 / 100')).toBeInTheDocument();
    expect(screen.getByText('ECTS: C')).toBeInTheDocument();
  });

  it('should not render modal content when open is false', () => {
    renderSimulator({ grades: [mockExamGrade], open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should call onClose when modal close button is triggered', () => {
    const handleClose = vi.fn();

    const { container } = renderSimulator({
      grades: [mockExamGrade],
      open: true,
      onClose: handleClose,
    });

    const closeButton = container.querySelector('button[class*="closeBtn"]');

    fireEvent.click(closeButton!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should render exam controls and targets grid when course controlType is exam', () => {
    renderSimulator({ grades: [mockExamGrade], open: true });

    const examSlider = screen.getByRole('slider', { name: 'Екзаменаційний бал' });
    const targetsTitle = screen.getByText('Цільові бали на іспиті («Що потрібно для оцінки?»)');

    expect(screen.getByText('Іспит (60 семестр + 40 екзамен)')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Допущено до іспиту/);
    expect(examSlider).toBeInTheDocument();
    expect(targetsTitle).toBeInTheDocument();
    expect(screen.getByText('≥ 90 б.')).toBeInTheDocument();
  });

  it('should disable exam slider when student is not admitted to exam (semester score < 35)', () => {
    const failingGrade: Grade = {
      courseName: 'Теорія ймовірностей',
      grade: '24',
      currentScore: 24,
      controlType: 'exam',
    };

    renderSimulator({ grades: [failingGrade], open: true });

    const examSlider = screen.getByRole('slider', { name: 'Екзаменаційний бал' });
    const banner = screen.getByRole('status');

    expect(examSlider).toBeDisabled();
    expect(banner).toHaveTextContent(/Не допущено до іспиту/);
    expect(screen.getAllByText('Недопуск').length).toBeGreaterThan(0);
  });

  it('should allow adjusting semester slider and update total forecast score', () => {
    renderSimulator({ grades: [mockExamGrade], open: true });

    const semesterSlider = screen.getByRole('slider', { name: 'Семестровий бал' });

    expect(screen.getByText('75 / 100')).toBeInTheDocument();

    fireEvent.change(semesterSlider, { target: { value: '55' } });

    expect(semesterSlider).toHaveValue('55');
    expect(screen.getByText('85 / 100')).toBeInTheDocument();
    expect(screen.getByText('ECTS: B')).toBeInTheDocument();
  });

  it('should allow switching selected course from the select dropdown', () => {
    renderSimulator({ grades: [mockExamGrade, mockCreditGrade], open: true });

    const select = screen.getByRole('combobox', { name: 'Дисципліна' });

    expect(select).toHaveValue('Математичний аналіз');
    expect(screen.getByText('Іспит (60 семестр + 40 екзамен)')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Екзаменаційний бал' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'Програмування' } });

    expect(select).toHaveValue('Програмування');
    expect(screen.getByText('Залік (100 б. накопичувально)')).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Екзаменаційний бал' })).not.toBeInTheDocument();

    const semesterSlider = screen.getByRole('slider', { name: 'Семестровий бал' });

    expect(semesterSlider).toHaveAttribute('max', '100');
    expect(screen.getByText('90 / 100 б.')).toBeInTheDocument();
    expect(screen.getByText('90 / 100')).toBeInTheDocument();
  });

  it('should allow adjusting exam slider and update total forecast score', () => {
    renderSimulator({ grades: [mockExamGrade], open: true });

    const examSlider = screen.getByRole('slider', { name: 'Екзаменаційний бал' });

    expect(screen.getByText('75 / 100')).toBeInTheDocument();

    fireEvent.change(examSlider, { target: { value: '40' } });

    expect(examSlider).toHaveValue('40');
    expect(screen.getByText('85 / 100')).toBeInTheDocument();
  });

  it('should simulate semester score when remaining assignments are scored', () => {
    const mockAssignments: Assignment[] = [
      {
        id: 1,
        courseName: 'Математичний аналіз',
        name: 'Лабораторна робота 1',
        duedate: 0,
        description: '',
      },
    ];

    renderSimulator({
      assignments: mockAssignments,
      grades: [mockExamGrade],
      open: true,
    });

    const assignmentSlider = screen.getByRole('slider', {
      name: 'Бал за завдання Лабораторна робота 1',
    });

    expect(assignmentSlider).toBeInTheDocument();

    fireEvent.change(assignmentSlider, { target: { value: '100' } });

    expect(screen.getByText('90 / 100')).toBeInTheDocument();
    expect(screen.getByText('ECTS: A')).toBeInTheDocument();
  });

  it('should deduplicate courses with identical names in the select dropdown', () => {
    const duplicateGrades: Grade[] = [
      {
        courseName: 'Математика',
        grade: '80',
        currentScore: 40,
        controlType: 'exam',
      },
      {
        courseName: 'математика',
        grade: '85',
        currentScore: 45,
        controlType: 'exam',
      },
    ];

    renderSimulator({ grades: duplicateGrades, open: true });

    const select = screen.getByRole('combobox', { name: 'Дисципліна' });

    expect(select.querySelectorAll('option')).toHaveLength(1);
  });
});
