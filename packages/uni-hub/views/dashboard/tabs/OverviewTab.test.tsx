import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CurriculumItem } from '@core/types';
import type { StudentProfile } from '@core/types/student';
import {
  createAppProvidersWrapper,
  setTestFeatureFlags,
  ALL_FEATURES_ENABLED,
} from '@uni-hub/utils/test-utils';
import type { Assignment, MoodleCourse as Course } from '@core/types/moodle';
import type { OverviewTabProps } from '../types';
import { OverviewTab } from './OverviewTab';

const mockPush = vi.fn();
const mockUseCountUp = vi.fn((target: number, _duration?: number, _enabled?: boolean) => target);

const { state } = vi.hoisted(() => ({
  state: {
    mockCurriculum: null as CurriculumItem[] | null,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('../constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../constants')>();

  return {
    ...actual,
    get mockKarazinCurriculum() {
      return state.mockCurriculum ?? actual.mockKarazinCurriculum;
    },
  };
});

vi.mock('@uni-hub/hooks/useCountUp', () => ({
  useCountUp: (target: number, duration?: number, enabled?: boolean) =>
    mockUseCountUp(target, duration, enabled),
}));

const mockStudentProfile: StudentProfile = {
  id: 'karazin-student-001',
  moodleId: 4021,
  fullName: 'Барсуков Родіон Сергійович',
  email: 'rodion.barsukov@karazin.ua',
  avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg',
  studentCardNumber: 'KB-10293847',
  recordBookNumber: 'ЗК-2024-042',
  faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
  department: 'Кафедра математичного моделювання та аналізу даних',
  specialty: '122 Компʼютерні науки',
  educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
  degree: 'bachelor',
  course: 3,
  group: 'КС12',
  studyForm: 'full-time',
  financing: 'budget',
  status: 'active',
  gpa: 92.4,
  totalCreditsEarned: 120,
  academicStanding: 'honors',
};

const createDefaultProps = (overrides?: Partial<OverviewTabProps>): OverviewTabProps => {
  return {
    courses: [],
    events: [],
    assignments: [],
    grades: [],
    statistics: { total: 5 },
    activeStudentProfile: mockStudentProfile,
    loading: false,
    onNavigate: vi.fn(),
    isMoodleLinked: true,
    ...overrides,
  };
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: createAppProvidersWrapper() });
};

describe('OverviewTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.mockCurriculum = null;
    setTestFeatureFlags(ALL_FEATURES_ENABLED);
  });

  it('should render student card, stat card grid, and quick actions', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const props = createDefaultProps({
      onNavigate,
      statistics: { total: 6 },
    });

    renderWithProviders(<OverviewTab {...props} />);

    expect(screen.getByText('Барсуков Родіон Сергійович')).toBeInTheDocument();
    expect(screen.getByText(/122 Компʼютерні науки/)).toBeInTheDocument();
    expect(screen.getByText('Всього дисциплін')).toBeInTheDocument();
    expect(screen.getByText('Завдань до виконання')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Швидкі дії' })).toBeInTheDocument();

    const coursesStatCard = screen.getByRole('button', { name: /Всього дисциплін/i });

    await user.click(coursesStatCard);

    expect(onNavigate).toHaveBeenCalledWith('study', 'subjects');
  });

  it('should hide the student identity until a profile loads', () => {
    const props = createDefaultProps({ activeStudentProfile: null });
    const { rerender } = renderWithProviders(<OverviewTab {...props} />);

    expect(
      screen.queryByRole('heading', { name: mockStudentProfile.fullName }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(mockStudentProfile.email)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Швидкі дії' })).toBeInTheDocument();

    rerender(<OverviewTab {...props} activeStudentProfile={mockStudentProfile} />);

    expect(screen.getByRole('heading', { name: mockStudentProfile.fullName })).toBeInTheDocument();
  });

  it('should display contextual greeting and nearest deadline countdown when Moodle integration is enabled', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockUpcomingAssignment: Assignment = {
      id: 201,
      courseName: 'Паралельні обчислення',
      name: 'Лабораторна робота №3',
      duedate: nowSec + 7200,
      description: 'Дослідження паралельних алгоритмів',
      submissionStatus: 'new',
      graded: false,
    };
    const props = createDefaultProps({
      assignments: [mockUpcomingAssignment],
    });

    renderWithProviders(<OverviewTab {...props} />);

    expect(screen.getByRole('heading', { level: 2, name: /студент/i })).toBeInTheDocument();
    expect(
      screen.getByText((content) => {
        return content.includes('Найближчий дедлайн:') && content.includes('Лабораторна робота №3');
      }),
    ).toBeInTheDocument();
    expect(screen.getByTitle('До дедлайна')).toBeInTheDocument();
  });

  it('should render courses section and navigate to course contents when clicking a course', async () => {
    const user = userEvent.setup();
    const mockCourse: Course = {
      id: 42,
      fullname: 'Паралельні та розподілені обчислення',
      shortname: 'ПРО',
      summary: 'Огляд сучасних паралельних технологій',
    };
    const props = createDefaultProps({
      courses: [mockCourse],
    });

    renderWithProviders(<OverviewTab {...props} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Поточні дисципліни' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Паралельні та розподілені обчислення')).toBeInTheDocument();
    expect(screen.getByText('ПРО')).toBeInTheDocument();

    const courseButton = screen.getByRole('button', {
      name: /Паралельні та розподілені обчислення/i,
    });

    await user.click(courseButton);

    expect(mockPush).toHaveBeenCalledWith('/study/courses/42');
  });

  it('should render empty state when no courses are available and fallback is empty', () => {
    state.mockCurriculum = [];
    const props = createDefaultProps({
      courses: [],
    });

    renderWithProviders(<OverviewTab {...props} />);

    expect(screen.getByText('Дисципліни не знайдено')).toBeInTheDocument();
  });

  it('should pass loading state to components', () => {
    const mockAssignment: Assignment = {
      id: 301,
      courseName: 'Бази даних',
      name: 'Лабораторна робота 1',
      description: '',
      duedate: 1893456000,
      submissionStatus: 'new',
    };

    mockUseCountUp.mockClear();

    const loadingProps = createDefaultProps({
      loading: true,
      statistics: { total: 7 },
      assignments: [mockAssignment],
    });

    const { rerender } = renderWithProviders(<OverviewTab {...loadingProps} />);

    expect(mockUseCountUp).toHaveBeenCalledWith(7, 800, false);
    expect(mockUseCountUp).toHaveBeenCalledWith(1, 800, false);

    mockUseCountUp.mockClear();

    const readyProps = createDefaultProps({
      loading: false,
      statistics: { total: 7 },
      assignments: [mockAssignment],
    });

    rerender(<OverviewTab {...readyProps} />);

    expect(mockUseCountUp).toHaveBeenCalledWith(7, 800, true);
    expect(mockUseCountUp).toHaveBeenCalledWith(1, 800, true);
  });
});
