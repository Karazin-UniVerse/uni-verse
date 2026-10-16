import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@una';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { moodleApi } from '@uni-hub/services/api';
import { COURSE_MODULE_NAMES, type CourseSection } from '@uni-hub/types';
import CourseContents from './CourseContents';

const mockPush = vi.fn();
let mockParams: Record<string, string> = { courseId: '123' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@uni-hub/theme/ThemeSwitcher', () => ({
  ThemeSwitcher: () => null,
}));

vi.mock('@uni-hub/components/common/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

vi.mock('@uni-hub/components/assignments', () => ({
  AssignmentModal: ({
    visible,
    module,
    onClose,
  }: {
    visible: boolean;
    module: { name?: string } | null;
    onClose?: () => void;
  }) =>
    visible ? (
      <dialog open aria-label={module?.name ?? 'Assignment Modal'}>
        <h2>{module?.name}</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          Close
        </button>
      </dialog>
    ) : null,
}));

vi.mock('@uni-hub/services/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@uni-hub/services/api');

  return {
    ...actual,
    moodleApi: {
      getCourseContents: vi.fn(),
    },
  };
});

const mockSections: CourseSection[] = [
  {
    id: 1,
    name: 'Тема 1: Вступ до компʼютерних наук',
    summary: 'Вступний розділ курсу',
    modules: [
      {
        id: 101,
        name: 'Силабус курсу',
        modname: COURSE_MODULE_NAMES.RESOURCE,
        url: 'https://moodle.example.com/mod/resource/view.php?id=101',
      },
      {
        id: 102,
        name: 'Практичне завдання №1',
        modname: COURSE_MODULE_NAMES.ASSIGN,
        instance: 501,
        dueUnixSec: 1750000000,
      },
      {
        id: 103,
        name: 'Тест на знання термінології',
        modname: COURSE_MODULE_NAMES.QUIZ,
        url: 'https://moodle.example.com/mod/quiz/view.php?id=103',
      },
      {
        id: 104,
        name: 'Форум для запитань',
        modname: COURSE_MODULE_NAMES.FORUM,
        url: 'https://moodle.example.com/mod/forum/view.php?id=104',
      },
      {
        id: 105,
        name: 'Додаткові матеріали',
        modname: COURSE_MODULE_NAMES.FOLDER,
        url: 'https://moodle.example.com/mod/folder/view.php?id=105',
      },
    ],
  },
  {
    id: 2,
    name: 'Тема 2: Алгоритми та структури даних',
    summary: 'Розширений розділ курсу',
    modules: [
      {
        id: 201,
        name: 'Практичне завдання №2',
        modname: COURSE_MODULE_NAMES.ASSIGN,
        instance: 502,
        dueUnixSec: 1751000000,
      },
      {
        id: 202,
        name: 'Конспект лекцій',
        modname: COURSE_MODULE_NAMES.RESOURCE,
        url: 'https://moodle.example.com/mod/resource/view.php?id=202',
      },
    ],
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LanguageProvider>
      <ToastProvider>{ui}</ToastProvider>
    </LanguageProvider>,
  );
};

describe('CourseContents view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { courseId: '123' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading spinner initially while fetching sections', () => {
    vi.mocked(moodleApi.getCourseContents).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<CourseContents />);

    expect(screen.getByRole('status', { name: 'Завантаження вмісту...' })).toBeInTheDocument();
    expect(moodleApi.getCourseContents).toHaveBeenCalledWith(123);
  });

  it('should render course sections and modules when fetched successfully', async () => {
    vi.mocked(moodleApi.getCourseContents).mockResolvedValueOnce({
      data: mockSections,
    });

    renderWithProviders(<CourseContents />);

    expect(await screen.findByText('Тема 1: Вступ до компʼютерних наук')).toBeInTheDocument();
    expect(screen.getByText('Тема 2: Алгоритми та структури даних')).toBeInTheDocument();

    expect(screen.getByText('Силабус курсу')).toBeInTheDocument();
    expect(screen.getByText('Практичне завдання №1')).toBeInTheDocument();
    expect(screen.getByText('Тест на знання термінології')).toBeInTheDocument();
    expect(screen.getByText('Форум для запитань')).toBeInTheDocument();
    expect(screen.getByText('Додаткові матеріали')).toBeInTheDocument();

    expect(screen.getByText('Тип: resource')).toBeInTheDocument();
    expect(screen.getByText('Тип: assign')).toBeInTheDocument();
    expect(screen.getByText('Тип: quiz')).toBeInTheDocument();
    expect(screen.getByText('Тип: forum')).toBeInTheDocument();
    expect(screen.getByText('Тип: folder')).toBeInTheDocument();

    expect(screen.queryByText('Практичне завдання №2')).not.toBeInTheDocument();
  });

  it('should render empty state when course has no sections', async () => {
    vi.mocked(moodleApi.getCourseContents).mockResolvedValueOnce({
      data: [],
    });

    renderWithProviders(<CourseContents />);

    expect(
      await screen.findByText('У цьому курсі поки що немає доступних матеріалів.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should toggle section expand/collapse when section header is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(moodleApi.getCourseContents).mockResolvedValueOnce({
      data: mockSections,
    });

    renderWithProviders(<CourseContents />);

    const section1Button = await screen.findByRole('button', {
      name: /Тема 1: Вступ до компʼютерних наук/i,
    });
    const section2Button = screen.getByRole('button', {
      name: /Тема 2: Алгоритми та структури даних/i,
    });

    expect(section1Button).toHaveAttribute('aria-expanded', 'true');
    expect(section2Button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Силабус курсу')).toBeInTheDocument();
    expect(screen.queryByText('Практичне завдання №2')).not.toBeInTheDocument();

    await user.click(section1Button);

    expect(section1Button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Силабус курсу')).not.toBeInTheDocument();

    await user.click(section2Button);

    expect(section2Button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Практичне завдання №2')).toBeInTheDocument();

    await user.click(section1Button);

    expect(section1Button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Силабус курсу')).toBeInTheDocument();
  });

  it('should open assignment modal when an assignment module is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(moodleApi.getCourseContents).mockResolvedValueOnce({
      data: mockSections,
    });

    renderWithProviders(<CourseContents />);

    const assignmentModuleButton = await screen.findByRole('button', {
      name: /Практичне завдання №1/i,
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(assignmentModuleButton);

    const dialog = screen.getByRole('dialog', { name: 'Практичне завдання №1' });

    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { level: 2, name: 'Практичне завдання №1' }),
    ).toBeInTheDocument();

    const closeButton = within(dialog).getByRole('button', { name: 'Close' });

    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should handle fetch error and display error toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(moodleApi.getCourseContents).mockRejectedValueOnce(
      new Error('Moodle API server error'),
    );

    renderWithProviders(<CourseContents />);

    expect(await screen.findByText('Не вдалося завантажити вміст курсу')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByText('У цьому курсі поки що немає доступних матеріалів.'),
    ).toBeInTheDocument();
  });

  it('should navigate back to courses tab when back button is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(moodleApi.getCourseContents).mockResolvedValueOnce({
      data: mockSections,
    });

    renderWithProviders(<CourseContents />);

    const backButton = await screen.findByRole('button', { name: /Назад до курсів/i });

    await user.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/?tab=courses');
  });

  it('should open module url in a new tab when non-assignment module with url is clicked', async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    vi.mocked(moodleApi.getCourseContents).mockResolvedValueOnce({
      data: mockSections,
    });

    renderWithProviders(<CourseContents />);

    const resourceModuleButton = await screen.findByRole('button', {
      name: /Силабус курсу/i,
    });

    await user.click(resourceModuleButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://moodle.example.com/mod/resource/view.php?id=101',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('should not fetch course contents when courseId is missing', () => {
    mockParams = { courseId: '' };

    renderWithProviders(<CourseContents />);

    expect(moodleApi.getCourseContents).not.toHaveBeenCalled();
  });
});
