import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CourseModule } from '@uni-hub/types';
import AssignmentModal, { getAssignmentStatusLabel } from './AssignmentModal';
import { moodleApi } from '@uni-hub/services/api';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

const mockGamification = {
  triggerCelebration: vi.fn(),
  unlockBadge: vi.fn().mockReturnValue(true),
};

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    Modal: ({
      open,
      title,
      children,
      onClose,
    }: {
      open: boolean;
      title?: string;
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      open ? (
        <dialog open aria-label={title}>
          {title ? <h2>{title}</h2> : null}
          <button type="button" aria-label="Close" onClick={onClose}>
            Close
          </button>
          {children}
        </dialog>
      ) : null,
    useToast: () => mockToast,
  };
});

vi.mock('@uni-hub/services/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@uni-hub/services/api');

  return {
    ...actual,
    moodleApi: {
      getAssignmentStatus: vi.fn(),
      submitAssignment: vi.fn(),
      uploadFile: vi.fn(),
    },
  };
});

vi.mock('@uni-hub/store/useGamificationStore', () => ({
  useGamificationStore: {
    getState: () => mockGamification,
  },
}));

describe('AssignmentModal component', () => {
  const mockModule: CourseModule = {
    id: 10,
    name: 'Лабораторна робота №1',
    modname: 'assign',
    instance: 101,
    description: '<p>Виконайте завдання у файлі <strong>main.py</strong></p>',
    url: 'https://moodle.example.com/mod/assign/view.php?id=202',
    contents: [
      {
        filename: 'instructions.pdf',
        fileurl: 'https://moodle.example.com/files/instructions.pdf',
      },
    ],
    duedate: 1893456000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    vi.mocked(moodleApi.getAssignmentStatus).mockResolvedValue({
      data: { status: 'new' },
    });
    vi.mocked(moodleApi.submitAssignment).mockResolvedValue({
      data: { success: true },
    });
    vi.mocked(moodleApi.uploadFile).mockResolvedValue({
      data: [{ itemid: 12345 }],
    });
  });

  it('should render modal when open is true with accessible dialog title and assignment details', async () => {
    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    expect(screen.getByRole('dialog', { name: 'Лабораторна робота №1' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Лабораторна робота №1' }),
    ).toBeInTheDocument();

    expect(await screen.findByText('Виконайте завдання у файлі main.py')).toBeInTheDocument();
  });

  it('should render default title when module name is missing', async () => {
    const unnamedModule: CourseModule = {
      ...mockModule,
      name: '',
    };

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={unnamedModule} />);

    expect(screen.getByRole('dialog', { name: 'Завдання' })).toBeInTheDocument();
    expect(await screen.findByText('Виконайте завдання у файлі main.py')).toBeInTheDocument();
  });

  it('should not render when open is false', async () => {
    await act(async () => {
      render(<AssignmentModal visible={false} onClose={vi.fn()} module={mockModule} />);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not fetch assignment status when open is false', async () => {
    await act(async () => {
      render(<AssignmentModal visible={false} onClose={vi.fn()} module={mockModule} />);
    });

    expect(moodleApi.getAssignmentStatus).not.toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<AssignmentModal visible={true} onClose={handleClose} module={mockModule} />);

    const closeBtn = screen.getByRole('button', { name: 'Close' });

    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<AssignmentModal visible={true} onClose={handleClose} module={mockModule} />);

    const cancelBtn = await screen.findByRole('button', { name: 'Скасувати' });

    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should render status badge and submission details when assignment is submitted and graded', async () => {
    vi.mocked(moodleApi.getAssignmentStatus).mockResolvedValueOnce({
      data: { status: 'submitted', grade: '95 / 100' },
    });

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    expect(await screen.findByText('Здано на перевірку')).toBeInTheDocument();
    expect(screen.getByText('95 / 100')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Введіть вашу відповідь тут...')).not.toBeInTheDocument();
  });

  it('should render status badge and submission form when assignment status is new or draft', async () => {
    vi.mocked(moodleApi.getAssignmentStatus).mockResolvedValueOnce({
      data: { status: 'draft' },
    });

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    expect(await screen.findByText('Чернетка')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введіть вашу відповідь тут...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Надіслати' })).toBeInTheDocument();
  });

  it('should render no status data message when status is absent', async () => {
    vi.mocked(moodleApi.getAssignmentStatus).mockResolvedValueOnce({
      data: null,
    });

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    expect(await screen.findByText('Немає даних про статус')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введіть вашу відповідь тут...')).toBeInTheDocument();
  });

  it('should render action link or button to open in Moodle when url is present on module', async () => {
    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    const moodleLink = await screen.findByRole('link', {
      name: /відкрити оригінальне завдання на moodle/i,
    });

    expect(moodleLink).toBeInTheDocument();
    expect(moodleLink).toHaveAttribute(
      'href',
      'https://moodle.example.com/mod/assign/view.php?id=202',
    );
    expect(moodleLink).toHaveAttribute('target', '_blank');
    expect(moodleLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render derived action link to open in Moodle when only instance is present', async () => {
    const moduleWithoutUrl: CourseModule = {
      ...mockModule,
      url: undefined,
      instance: 303,
    };

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={moduleWithoutUrl} />);

    const moodleLink = await screen.findByRole('link', {
      name: /відкрити оригінальне завдання на moodle/i,
    });

    expect(moodleLink).toHaveAttribute(
      'href',
      'https://moodle.universemvp.tech/mod/assign/view.php?a=303',
    );
  });

  it('should not render action link to open in Moodle when neither url nor instance is present', async () => {
    const moduleWithoutLink: CourseModule = {
      ...mockModule,
      url: undefined,
      instance: undefined,
    };

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={moduleWithoutLink} />);

    expect(await screen.findByText('Виконайте завдання у файлі main.py')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /відкрити оригінальне завдання на moodle/i }),
    ).not.toBeInTheDocument();
  });

  it('should render attached files with authenticated download links when present', async () => {
    localStorage.setItem('accessToken', 'mock-token-xyz');

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    expect(await screen.findByText('instructions.pdf')).toBeInTheDocument();

    const downloadLink = screen.getByRole('link', { name: /завантажити/i });

    expect(downloadLink).toHaveAttribute(
      'href',
      'https://moodle.example.com/files/instructions.pdf?token=mock-token-xyz',
    );
    expect(downloadLink).toHaveAttribute('target', '_blank');
    expect(downloadLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should show validation error when submitting empty form', async () => {
    const user = userEvent.setup();

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    const submitBtn = await screen.findByRole('button', { name: 'Надіслати' });

    await user.click(submitBtn);

    expect(
      screen.getByText('Будь ласка, введіть текст відповіді або прикріпіть файл'),
    ).toBeInTheDocument();
    expect(moodleApi.submitAssignment).not.toHaveBeenCalled();
  });

  it('should submit assignment text successfully and unlock badge when within deadline', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentModal
        visible={true}
        onClose={vi.fn()}
        module={mockModule}
        dueUnixSec={Math.floor(Date.now() / 1000) + 3600}
      />,
    );

    const textarea = await screen.findByPlaceholderText('Введіть вашу відповідь тут...');
    const submitBtn = screen.getByRole('button', { name: 'Надіслати' });

    await user.type(textarea, 'Готова робота у репозиторії');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(moodleApi.submitAssignment).toHaveBeenCalledWith(
        101,
        'Готова робота у репозиторії',
        undefined,
      );
    });

    expect(mockToast.success).toHaveBeenCalledWith('Відповідь успішно надіслано');
    expect(mockGamification.triggerCelebration).toHaveBeenCalled();
    expect(mockGamification.unlockBadge).toHaveBeenCalledWith('DEADLINE_SNIPER');
    expect(mockToast.success).toHaveBeenCalledWith(
      'Ачивка: Deadline Sniper — Сдали задание до дедлайна',
    );
  });

  it('should display error toast when status loading fails', async () => {
    vi.mocked(moodleApi.getAssignmentStatus).mockRejectedValueOnce(
      new Error('Failed to load status'),
    );

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Не вдалося завантажити статус завдання');
    });
  });

  it('should display error toast when submitting assignment fails', async () => {
    const user = userEvent.setup();

    vi.mocked(moodleApi.submitAssignment).mockRejectedValueOnce(new Error('Submission error'));

    render(<AssignmentModal visible={true} onClose={vi.fn()} module={mockModule} />);

    const textarea = await screen.findByPlaceholderText('Введіть вашу відповідь тут...');
    const submitBtn = screen.getByRole('button', { name: 'Надіслати' });

    await user.type(textarea, 'Моє рішення');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Помилка під час надсилання відповіді');
    });
  });
});

describe('getAssignmentStatusLabel helper', () => {
  const mockFormatMessage = (key: string): string => {
    const translations: Record<string, string> = {
      'assignmentModal.statusSubmitted': 'Здано на перевірку',
      'assignmentModal.statusGraded': 'Оцінено',
      'assignmentModal.statusNew': 'Немає спроби',
      'assignmentModal.statusDraft': 'Чернетка',
    };

    return translations[key] ?? key;
  };

  it('should return translated label for submitted status', () => {
    expect(getAssignmentStatusLabel('submitted', mockFormatMessage as any)).toBe(
      'Здано на перевірку',
    );
  });

  it('should return translated label for graded status', () => {
    expect(getAssignmentStatusLabel('graded', mockFormatMessage as any)).toBe('Оцінено');
  });

  it('should return translated label for new status', () => {
    expect(getAssignmentStatusLabel('new', mockFormatMessage as any)).toBe('Немає спроби');
  });

  it('should return translated label for draft status', () => {
    expect(getAssignmentStatusLabel('draft', mockFormatMessage as any)).toBe('Чернетка');
  });

  it('should return raw status string for unknown status', () => {
    expect(getAssignmentStatusLabel('custom_status', mockFormatMessage as any)).toBe(
      'custom_status',
    );
  });
});
