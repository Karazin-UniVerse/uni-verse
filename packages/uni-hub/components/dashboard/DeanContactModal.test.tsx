import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeanContactModal } from './DeanContactModal';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
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
      closeLabel = 'Закрити',
    }: {
      open: boolean;
      title?: string;
      children?: React.ReactNode;
      onClose?: () => void;
      closeLabel?: string;
    }) =>
      open ? (
        <dialog open aria-label={title}>
          {title ? <h2>{title}</h2> : null}
          <button type="button" aria-label={closeLabel || 'Закрити'} onClick={onClose}>
            {closeLabel || 'Закрити'}
          </button>
          {children}
        </dialog>
      ) : null,
    useToast: () => mockToast,
  };
});

describe('DeanContactModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true with accessible dialog title and contact form', () => {
    render(<DeanContactModal open={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: "Зв'язок з деканатом" })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: "Зв'язок з деканатом" }),
    ).toBeInTheDocument();
    expect(screen.getByText('ННІ Компʼютерних наук та штучного інтелекту')).toBeInTheDocument();
    expect(
      screen.getByText('Деканат та служба академічної підтримки студентів'),
    ).toBeInTheDocument();

    expect(screen.getByText('dean.cs@karazin.ua')).toBeInTheDocument();
    expect(screen.getByText('+38 (057) 707-55-55')).toBeInTheDocument();
    expect(screen.getByText('Пн–Пт, 09:00 – 17:00')).toBeInTheDocument();
    expect(screen.getByText('@karazin_edean')).toBeInTheDocument();

    const subjectInput = screen.getByLabelText('Тема запиту');
    const messageInput = screen.getByLabelText('Текст повідомлення або коментар');

    expect(subjectInput).toBeInTheDocument();
    expect(subjectInput).toHaveValue('Довідка про навчання');
    expect(messageInput).toBeInTheDocument();
    expect(messageInput).toHaveValue('');

    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Надіслати звернення' })).toBeInTheDocument();
  });

  it('should render custom faculty name when provided', () => {
    const customFaculty = 'Факультет компʼютерних наук';

    render(<DeanContactModal open={true} onClose={vi.fn()} facultyName={customFaculty} />);

    expect(screen.getByText(customFaculty)).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<DeanContactModal open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<DeanContactModal open={true} onClose={handleClose} />);

    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when header close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<DeanContactModal open={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Закрити' });

    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should handle topic selection, message typing, and submit action', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<DeanContactModal open={true} onClose={handleClose} />);

    const transcriptChip = screen.getByRole('radio', {
      name: 'Академічна довідка / виписка оцінок',
    });

    await user.click(transcriptChip);

    const subjectInput = screen.getByLabelText('Тема запиту');

    expect(subjectInput).toHaveValue('Академічна довідка / виписка оцінок');

    const messageInput = screen.getByLabelText('Текст повідомлення або коментар');

    await user.type(messageInput, 'Потрібна виписка оцінок за третій семестр');

    expect(messageInput).toHaveValue('Потрібна виписка оцінок за третій семестр');

    const submitBtn = screen.getByRole('button', { name: 'Надіслати звернення' });

    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringMatching(/^Звернення №КВ-\d+ успішно надіслано до деканату!/),
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable submit button or show loading state when submitting', async () => {
    const user = userEvent.setup();

    render(<DeanContactModal open={true} onClose={vi.fn()} />);

    const messageInput = screen.getByLabelText('Текст повідомлення або коментар');

    await user.type(messageInput, 'Термінове питання');

    const submitBtn = screen.getByRole('button', { name: 'Надіслати звернення' });
    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    expect(submitBtn).toBeEnabled();
    expect(cancelBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(screen.getByRole('button', { name: 'Надсилання...' })).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
    });
  });
});
