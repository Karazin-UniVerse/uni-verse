import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { Assignment } from '@core/types/moodle';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ContextualGreeting } from './ContextualGreeting';

function createAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const defaultAssignment: Assignment = {
    id: 1,
    courseName: 'Вища математика',
    name: 'Лабораторна робота №1',
    duedate: 1776337200,
    description: 'Опис завдання',
  };

  return {
    ...defaultAssignment,
    ...overrides,
  };
}

describe('ContextualGreeting component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Time of day greetings', () => {
    it.each([5, 8, 11])(
      'should render morning greeting during morning hour %i (05:00 - 11:59)',
      (hour) => {
        vi.setSystemTime(new Date(2026, 9, 16, hour, 30, 0));

        render(<ContextualGreeting assignments={[]} />);

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
          'Доброго ранку, студент',
        );
      },
    );

    it.each([12, 14, 17])(
      'should render day greeting during day hour %i (12:00 - 17:59)',
      (hour) => {
        vi.setSystemTime(new Date(2026, 9, 16, hour, 30, 0));

        render(<ContextualGreeting assignments={[]} />);

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Доброго дня, студент');
      },
    );

    it.each([18, 20, 21])(
      'should render evening greeting during evening hour %i (18:00 - 21:59)',
      (hour) => {
        vi.setSystemTime(new Date(2026, 9, 16, hour, 30, 0));

        render(<ContextualGreeting assignments={[]} />);

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
          'Доброго вечора, студент',
        );
      },
    );

    it.each([22, 23, 0, 2, 4])(
      'should render night greeting during night hour %i (22:00 - 04:59)',
      (hour) => {
        vi.setSystemTime(new Date(2026, 9, 16, hour, 30, 0));

        render(<ContextualGreeting assignments={[]} />);

        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Доброї ночі, студент');
      },
    );

    it('should render greeting in English when language is set to English', () => {
      vi.setSystemTime(new Date(2026, 9, 16, 9, 0, 0));
      window.localStorage.setItem('universe-lang', 'en');

      render(
        <LanguageProvider>
          <ContextualGreeting assignments={[]} />
        </LanguageProvider>,
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Good morning, student');
    });
  });

  describe('No deadlines CTA message', () => {
    it('should render no deadlines message when no upcoming assignments exist', () => {
      vi.setSystemTime(new Date(2026, 9, 16, 12, 0, 0));

      render(<ContextualGreeting assignments={[]} />);

      expect(
        screen.getByText('Найближчих дедлайнів немає — можна перепочити або заглянути у курси.'),
      ).toBeInTheDocument();
    });

    it('should render no deadlines message when all assignments have passed duedates', () => {
      const fixedDate = new Date(2026, 9, 16, 12, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const pastAssignments: Assignment[] = [
        createAssignment({ id: 1, duedate: nowSec - 3600 }),
        createAssignment({ id: 2, duedate: nowSec }),
      ];

      render(<ContextualGreeting assignments={pastAssignments} />);

      expect(
        screen.getByText('Найближчих дедлайнів немає — можна перепочити або заглянути у курси.'),
      ).toBeInTheDocument();
    });

    it('should render no deadlines message when all upcoming assignments are already completed', () => {
      const fixedDate = new Date(2026, 9, 16, 12, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const completedAssignments: Assignment[] = [
        createAssignment({ id: 1, duedate: nowSec + 3600, submissionStatus: 'submitted' }),
        createAssignment({ id: 2, duedate: nowSec + 7200, submissionStatus: 'graded' }),
        createAssignment({ id: 3, duedate: nowSec + 10800, graded: true }),
        createAssignment({ id: 4, duedate: nowSec + 14400, grade: '95' }),
        createAssignment({ id: 5, duedate: nowSec + 18000, submittedAt: nowSec - 500 }),
      ];

      render(<ContextualGreeting assignments={completedAssignments} />);

      expect(
        screen.getByText('Найближчих дедлайнів немає — можна перепочити або заглянути у курси.'),
      ).toBeInTheDocument();
    });

    it('should render no deadlines message in English when English locale is active', () => {
      vi.setSystemTime(new Date(2026, 9, 16, 12, 0, 0));
      window.localStorage.setItem('universe-lang', 'en');

      render(
        <LanguageProvider>
          <ContextualGreeting assignments={[]} />
        </LanguageProvider>,
      );

      expect(
        screen.getByText('No upcoming deadlines — time to relax or review courses.'),
      ).toBeInTheDocument();
    });
  });

  describe('Nearest upcoming deadline CTA', () => {
    it('should render nearest upcoming deadline cta when assignments exist', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Лабораторна робота №1',
          duedate: nowSec + 3600 * 5,
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Лабораторна робота №1» залишилося 5 год. Встигнемо?'),
      ).toBeInTheDocument();
    });

    it('should render nearest upcoming deadline when assignments are provided in unsorted order', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Дипломний проєкт',
          duedate: nowSec + 3600 * 24,
        }),
        createAssignment({
          id: 2,
          name: 'Експрес-тест',
          duedate: nowSec + 3600 * 2,
        }),
        createAssignment({
          id: 3,
          name: 'Практикум з програмування',
          duedate: nowSec + 3600 * 8,
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Експрес-тест» залишилося 2 год. Встигнемо?'),
      ).toBeInTheDocument();
    });

    it('should ignore past and completed assignments when selecting nearest deadline', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Минуле завдання',
          duedate: nowSec - 1800,
        }),
        createAssignment({
          id: 2,
          name: 'Вже здане завдання',
          duedate: nowSec + 3600,
          submissionStatus: 'submitted',
        }),
        createAssignment({
          id: 3,
          name: 'Оцінене завдання',
          duedate: nowSec + 7200,
          graded: true,
        }),
        createAssignment({
          id: 4,
          name: 'Актуальне завдання',
          duedate: nowSec + 3600 * 4,
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Актуальне завдання» залишилося 4 год. Встигнемо?'),
      ).toBeInTheDocument();
    });

    it('should clamp remaining hours to 1 when deadline is less than one hour away', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Терміновий квіз',
          duedate: nowSec + 1200, // 20 minutes remaining
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Терміновий квіз» залишилося 1 год. Встигнемо?'),
      ).toBeInTheDocument();
    });

    it('should round up remaining hours when partial hour remains', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Аналітичний звіт',
          duedate: nowSec + 3600 + 1, // 1 hour and 1 second -> rounds up to 2
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Аналітичний звіт» залишилося 2 год. Встигнемо?'),
      ).toBeInTheDocument();
    });

    it('should render nearest deadline cta in English when language is set to en', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);
      window.localStorage.setItem('universe-lang', 'en');

      const nowSec = Math.floor(fixedDate.getTime() / 1000);

      render(
        <LanguageProvider>
          <ContextualGreeting
            assignments={[
              createAssignment({
                id: 1,
                name: 'Physics Homework',
                duedate: nowSec + 3600 * 3,
              }),
            ]}
          />
        </LanguageProvider>,
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Good morning, student');
      expect(screen.getByText(/«Physics Homework».*3/)).toBeInTheDocument();
    });
  });

  describe('Updating deadline remaining hours', () => {
    it('should update deadline remaining hours correctly', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Модульна контрольна',
          duedate: nowSec + 3600 * 3, // 3 hours remaining
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Модульна контрольна» залишилося 3 год. Встигнемо?'),
      ).toBeInTheDocument();

      // Advance time by 1 hour (3600 seconds)
      act(() => {
        vi.advanceTimersByTime(3600 * 1000);
      });

      expect(
        screen.getByText('До «Модульна контрольна» залишилося 2 год. Встигнемо?'),
      ).toBeInTheDocument();

      // Advance time by another 1 hour
      act(() => {
        vi.advanceTimersByTime(3600 * 1000);
      });

      expect(
        screen.getByText('До «Модульна контрольна» залишилося 1 год. Встигнемо?'),
      ).toBeInTheDocument();
    });

    it('should update to no deadlines message when deadline expires after time advances', () => {
      const fixedDate = new Date(2026, 9, 16, 10, 0, 0);

      vi.setSystemTime(fixedDate);

      const nowSec = Math.floor(fixedDate.getTime() / 1000);
      const assignments: Assignment[] = [
        createAssignment({
          id: 1,
          name: 'Короткий тест',
          duedate: nowSec + 1800, // 30 minutes remaining
        }),
      ];

      render(<ContextualGreeting assignments={assignments} />);

      expect(
        screen.getByText('До «Короткий тест» залишилося 1 год. Встигнемо?'),
      ).toBeInTheDocument();

      // Advance time past the deadline (40 minutes = 2400 seconds)
      act(() => {
        vi.advanceTimersByTime(2400 * 1000);
      });

      expect(
        screen.getByText('Найближчих дедлайнів немає — можна перепочити або заглянути у курси.'),
      ).toBeInTheDocument();
    });

    it('should update greeting text when time of day transitions after timer advances', () => {
      // 11:59:30 is morning (< 12)
      const fixedDate = new Date(2026, 9, 16, 11, 59, 30);

      vi.setSystemTime(fixedDate);

      render(<ContextualGreeting assignments={[]} />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Доброго ранку, студент');

      // Advance time by 60 seconds to reach 12:00:30 (day)
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Доброго дня, студент');
    });
  });
});
