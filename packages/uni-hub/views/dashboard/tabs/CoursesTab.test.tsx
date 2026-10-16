import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CurriculumItem } from '@core/types';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Course } from '@uni-hub/types';
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('CoursesTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render courses grid with course titles, codes, and credits', () => {
    const mockCourses: (Course | CurriculumItem)[] = [
      {
        id: 101,
        code: 'CS101',
        name: 'Алгоритми та структури даних',
        shortName: 'АСД',
        credits: 5,
        semester: 1,
        academicYear: '2026/2027',
        controlType: 'exam',
        instructors: [],
        status: 'in_progress',
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
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('5 ECTS')).toBeInTheDocument();
    expect(screen.getByText('Іспит')).toBeInTheDocument();
    expect(screen.getByText('Навчальна дисципліна індивідуального плану')).toBeInTheDocument();

    expect(screen.getByText('Архітектура компʼютерів')).toBeInTheDocument();
    expect(screen.getByText('АК')).toBeInTheDocument();
    expect(screen.getByText('Огляд апаратної частини компʼютерних систем')).toBeInTheDocument();
  });

  it('should render fallback curriculum when courses array is empty', () => {
    renderWithProviders(<CoursesTab courses={[]} soundEnabled={false} />);

    expect(screen.getByText('Паралельні та розподілені обчислення')).toBeInTheDocument();
    expect(screen.getByText('ПРО')).toBeInTheDocument();
    expect(screen.getAllByText('5 ECTS').length).toBeGreaterThan(0);
  });

  it('should navigate to course contents when open course button is clicked', async () => {
    const user = userEvent.setup();
    const mockCourse: CurriculumItem = {
      id: 42,
      code: 'CS201',
      name: 'Компʼютерні мережі',
      shortName: 'КМ',
      credits: 4,
      semester: 3,
      academicYear: '2026/2027',
      controlType: 'exam',
      instructors: [],
      status: 'in_progress',
    };

    renderWithProviders(<CoursesTab courses={[mockCourse]} soundEnabled={true} />);

    const openButton = screen.getByRole('button', {
      name: /перегляд матеріалів курсу/i,
    });

    await user.click(openButton);

    expect(playClick).toHaveBeenCalledWith(true);
    expect(mockPush).toHaveBeenCalledWith('/courses/42/contents');
  });

  it('should display instructor and progress bar when present in curriculum item', () => {
    const mockCourseWithDetails: CurriculumItem = {
      id: 7,
      code: 'CS204',
      name: 'Операційні системи',
      shortName: 'ОС',
      credits: 4,
      semester: 3,
      academicYear: '2026/2027',
      controlType: 'exam',
      instructors: [{ name: 'Доц. Шевченко Т. Г.' }],
      progress: 85,
      status: 'in_progress',
    };

    renderWithProviders(<CoursesTab courses={[mockCourseWithDetails]} soundEnabled={false} />);

    expect(screen.getByText('Доц. Шевченко Т. Г.')).toBeInTheDocument();
    expect(screen.getByText(/Викладач:/)).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Прогрес освоєння')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '85');
  });
});
