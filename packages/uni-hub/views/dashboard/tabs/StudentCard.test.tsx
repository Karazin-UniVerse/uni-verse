import React from 'react';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { StudentProfile } from '@core/types';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { StudentCard, type StudentCardProps } from './StudentCard';

const mockStudentProfile: StudentProfile = {
  id: 'student-101',
  moodleId: 42,
  fullName: 'Олександр Шевченко',
  email: 'oleksandr.shevchenko@karazin.ua',
  studentCardNumber: 'KB12345678',
  recordBookNumber: 'RB-2024-99',
  faculty: 'Факультет комп’ютерних наук',
  department: 'Кафедра штучного інтелекту',
  specialty: '122 Комп’ютерні науки',
  educationalProgram: 'Інтелектуальні управляючі системи',
  degree: 'bachelor',
  course: 3,
  group: 'CS-31',
  studyForm: 'full-time',
  financing: 'budget',
  status: 'active',
  gpa: 94.5,
  totalCreditsEarned: 180,
  academicStanding: 'honors',
};

const renderStudentCard = (props: Partial<StudentCardProps> = {}) => {
  const mergedProps: StudentCardProps = {
    activeStudentProfile: mockStudentProfile,
    ...props,
  };

  return render(
    <LanguageProvider>
      <FeatureToggleProvider>
        <StudentCard {...mergedProps} />
      </FeatureToggleProvider>
    </LanguageProvider>,
  );
};

describe('StudentCard component', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    window.localStorage.clear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    window.localStorage.clear();
  });

  it('should render student name, email, and fallback avatar when avatarUrl is absent', () => {
    const profileWithoutAvatar: StudentProfile = {
      ...mockStudentProfile,
      avatarUrl: undefined,
    };

    renderStudentCard({ activeStudentProfile: profileWithoutAvatar });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Олександр Шевченко' }),
    ).toBeInTheDocument();
    expect(screen.getByText('oleksandr.shevchenko@karazin.ua')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should render custom avatar image when avatarUrl is provided', () => {
    const profileWithAvatar: StudentProfile = {
      ...mockStudentProfile,
      avatarUrl: 'https://cdn.karazin.ua/avatars/shevchenko.png',
    };

    renderStudentCard({ activeStudentProfile: profileWithAvatar });

    const avatar = screen.getByRole('img', { name: 'Олександр Шевченко' });

    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://cdn.karazin.ua/avatars/shevchenko.png');
    expect(avatar).toHaveAttribute('alt', 'Олександр Шевченко');
  });

  it('should render eDean specialty, program, tags, and academic info when isEDeanEnabled is true', () => {
    process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';

    renderStudentCard();

    expect(
      screen.getByText(/Спеціальність 122 Комп’ютерні науки • Інтелектуальні управляючі системи/),
    ).toBeInTheDocument();
    expect(screen.queryByText('oleksandr.shevchenko@karazin.ua')).not.toBeInTheDocument();

    expect(screen.getByText('Денна форма')).toBeInTheDocument();
    expect(screen.getByText('Бюджет')).toBeInTheDocument();
    expect(screen.getByText('Відмінник (Академічна стипендія)')).toBeInTheDocument();

    expect(screen.getByText('Факультет / Інститут')).toBeInTheDocument();
    expect(screen.getByText('Факультет комп’ютерних наук')).toBeInTheDocument();

    expect(screen.getByText('Кафедра')).toBeInTheDocument();
    expect(screen.getByText('Кафедра штучного інтелекту')).toBeInTheDocument();

    expect(screen.getByText('Курс / Академічна група')).toBeInTheDocument();
    expect(screen.getByText('3 курс, група CS-31')).toBeInTheDocument();

    expect(screen.getByText('Студентський квиток')).toBeInTheDocument();
    expect(screen.getByText('KB12345678')).toBeInTheDocument();

    expect(screen.getByText('Залікова книжка')).toBeInTheDocument();
    expect(screen.getByText('RB-2024-99')).toBeInTheDocument();

    expect(screen.getByText('Здобуто кредитів ECTS')).toBeInTheDocument();
    expect(screen.getByText('180 ECTS')).toBeInTheDocument();

    expect(screen.getByText('Академічний статус')).toBeInTheDocument();
    expect(screen.getByText('● Навчається (активний)')).toBeInTheDocument();
  });

  it('should render unlinked Moodle warning banner when isMoodleLinked is false and Moodle is enabled', () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

    renderStudentCard({ isMoodleLinked: false });

    expect(screen.getByText('Moodle: Не підключено')).toBeInTheDocument();
    expect(screen.getByText('Рейтинговий бал (GPA)')).toBeInTheDocument();
    expect(screen.getByText('94.5 / 100')).toBeInTheDocument();
  });

  it('should not render unlinked banner when isMoodleLinked is true', () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

    renderStudentCard({ isMoodleLinked: true });

    expect(screen.getByText('Moodle: Підключено')).toBeInTheDocument();
    expect(screen.queryByText('Moodle: Не підключено')).not.toBeInTheDocument();
  });
});
