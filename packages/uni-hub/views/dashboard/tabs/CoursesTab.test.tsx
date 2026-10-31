import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { MoodleCourse as Course } from '@core/types/moodle';
import { playClick } from '@uni-hub/utils/soundEffects';
import { CoursesTab } from './CoursesTab';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@uni-hub/utils/soundEffects', () => ({
  playClick: vi.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) => render(withLanguage(ui));

describe('CoursesTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render courses grid with course titles, shortnames, and summaries', () => {
    const mockCourses: Course[] = [
      {
        id: 101,
        fullname: 'Алгоритми та структури даних',
        shortname: 'АСД',
        summary: '',
      },
      {
        id: 102,
        fullname: 'Архітектура компʼютерів',
        shortname: 'АК',
        summary: 'Огляд апаратної частини компʼютерних систем',
      },
    ];

    renderWithProviders(<CoursesTab courses={mockCourses} soundEnabled={false} />);

    expect(screen.getByText('Алгоритми та структури даних')).toBeInTheDocument();
    expect(screen.getByText('АСД')).toBeInTheDocument();
    expect(screen.getByText('Навчальна дисципліна індивідуального плану')).toBeInTheDocument();

    expect(screen.getByText('Архітектура компʼютерів')).toBeInTheDocument();
    expect(screen.getByText('АК')).toBeInTheDocument();
    expect(screen.getByText('Огляд апаратної частини компʼютерних систем')).toBeInTheDocument();
  });

  it('should render fallback curriculum with credits, control type, instructor, and progress when courses array is empty', () => {
    renderWithProviders(<CoursesTab courses={[]} soundEnabled={false} />);

    expect(screen.getByText('Паралельні та розподілені обчислення')).toBeInTheDocument();
    expect(screen.getByText('ПРО')).toBeInTheDocument();
    expect(screen.getAllByText('5 ECTS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Іспит').length).toBeGreaterThan(0);
    expect(screen.getByText('Проф. Коваленко О. І.')).toBeInTheDocument();
    expect(screen.getAllByText(/Викладач:/).length).toBeGreaterThan(0);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('Прогрес освоєння').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuenow', '75');
  });

  it('should navigate to course contents when open course button is clicked', async () => {
    const user = userEvent.setup();
    const mockCourse: Course = {
      id: 42,
      fullname: 'Компʼютерні мережі',
      shortname: 'КМ',
      summary: 'Мережеві протоколи та архітектура',
    };

    renderWithProviders(<CoursesTab courses={[mockCourse]} soundEnabled={true} />);

    const openButton = screen.getByRole('button', {
      name: /перегляд матеріалів курсу/i,
    });

    await user.click(openButton);

    expect(playClick).toHaveBeenCalledWith(true);
    expect(mockPush).toHaveBeenCalledWith('/study/courses/42');
  });
});
