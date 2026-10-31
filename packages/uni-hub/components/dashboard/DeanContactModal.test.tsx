import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withToast } from '@uni-hub/utils/test-utils';
import { DeanContactModal, type DeanContactModalProps } from './DeanContactModal';

const renderDeanContactModal = (props: Partial<DeanContactModalProps> = {}) => {
  return render(withToast(<DeanContactModal open={true} onClose={vi.fn()} {...props} />));
};

describe('DeanContactModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true with accessible dialog title and contact form', () => {
    renderDeanContactModal();

    expect(screen.getByRole('dialog', { name: "Зв'язок з деканатом" })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: "Зв'язок з деканатом" }),
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

    renderDeanContactModal({ facultyName: customFaculty });

    expect(screen.getByText(customFaculty)).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    renderDeanContactModal({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderDeanContactModal({ onClose: handleClose });

    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when header close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderDeanContactModal({ onClose: handleClose });

    const closeBtn = screen.getByRole('button', { name: 'Закрити' });

    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should handle topic selection, message typing, and submit action', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderDeanContactModal({ onClose: handleClose });

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

    expect(
      await screen.findByText(/^Звернення №КВ-\d+ успішно надіслано до деканату!/, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should disable submit button or show loading state when submitting', async () => {
    const user = userEvent.setup();

    renderDeanContactModal();

    const messageInput = screen.getByLabelText('Текст повідомлення або коментар');

    await user.type(messageInput, 'Термінове питання');

    const submitBtn = screen.getByRole('button', { name: 'Надіслати звернення' });
    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    expect(submitBtn).toBeEnabled();
    expect(cancelBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(screen.getByRole('button', { name: 'Надсилання...' })).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    await waitFor(
      () => {
        expect(
          screen.getByText(/^Звернення №КВ-\d+ успішно надіслано до деканату!/),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
