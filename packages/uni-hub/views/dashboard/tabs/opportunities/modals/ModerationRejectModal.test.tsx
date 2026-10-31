import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { ModerationRejectModal, type ModerationRejectModalProps } from './ModerationRejectModal';

describe('ModerationRejectModal component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const defaultProps: ModerationRejectModalProps = {
    rejectModal: {
      open: true,
      id: 'opp-101',
      comment: 'Потрібно детальніше описати вимоги',
    },
    onClose: vi.fn(),
    onCommentChange: vi.fn(),
    onConfirm: vi.fn(),
    isSubmitting: false,
  };

  const renderModal = (props: Partial<ModerationRejectModalProps> = {}) => {
    return render(
      withLanguage(<ModerationRejectModal {...defaultProps} {...props} />),
    );
  };

  it('should render modal with title and comment textarea when open is true', () => {
    renderModal();

    const expectedTitle = 'Зауваження або повернення на доопрацювання';

    expect(screen.getByRole('dialog', { name: expectedTitle })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: expectedTitle })).toBeInTheDocument();

    const commentInput = screen.getByLabelText(
      'Опишіть зауваження або причину (буде надіслано автору):',
    );

    expect(commentInput).toBeInTheDocument();
    expect(commentInput).toHaveValue(defaultProps.rejectModal.comment);
    expect(commentInput).toHaveAttribute(
      'placeholder',
      'Вкажіть, що саме необхідно виправити перед повторною подачею...',
    );

    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'На доопрацювання' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Відхилити' })).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    renderModal({
      rejectModal: {
        open: false,
        id: 'opp-101',
        comment: '',
      },
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should call onCommentChange when typing in comment textarea', async () => {
    const handleCommentChange = vi.fn();
    const user = userEvent.setup();

    renderModal({ onCommentChange: handleCommentChange });

    const commentInput = screen.getByLabelText(
      'Опишіть зауваження або причину (буде надіслано автору):',
    );

    await user.type(commentInput, 'Додатковий коментар');

    expect(handleCommentChange).toHaveBeenCalled();
  });

  it("should call onConfirm with 'REQUIRE_CHANGES' when clicking Revise button", async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    renderModal({
      rejectModal: {
        open: true,
        id: 'opp-123',
        comment: 'Необхідно оновити контактні дані',
      },
      onConfirm: handleConfirm,
    });

    const reviseButton = screen.getByRole('button', { name: 'На доопрацювання' });

    await user.click(reviseButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith(
      'opp-123',
      'REQUIRE_CHANGES',
      'Необхідно оновити контактні дані',
    );
  });

  it("should call onConfirm with 'REJECT' when clicking Reject button", async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    renderModal({
      rejectModal: {
        open: true,
        id: 'opp-123',
        comment: 'Невідповідність правилам платформи',
      },
      onConfirm: handleConfirm,
    });

    const rejectButton = screen.getByRole('button', { name: 'Відхилити' });

    await user.click(rejectButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith(
      'opp-123',
      'REJECT',
      'Невідповідність правилам платформи',
    );
  });

  it('should call onClose when clicking cancel button', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderModal({ onClose: handleClose });

    const cancelButton = screen.getByRole('button', { name: 'Скасувати' });

    await user.click(cancelButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should disable action buttons when isSubmitting is true', () => {
    renderModal({ isSubmitting: true });

    const commentInput = screen.getByLabelText(
      'Опишіть зауваження або причину (буде надіслано автору):',
    );
    const cancelButton = screen.getByRole('button', { name: 'Скасувати' });
    const reviseButton = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectButton = screen.getByRole('button', { name: 'Відхилити' });

    expect(commentInput).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(reviseButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it('should not call onConfirm when clicking action buttons if rejectModal id is null', async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    renderModal({
      rejectModal: {
        open: true,
        id: null,
        comment: 'Якийсь коментар для перевірки',
      },
      onConfirm: handleConfirm,
    });

    const reviseButton = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectButton = screen.getByRole('button', { name: 'Відхилити' });

    await user.click(reviseButton);
    await user.click(rejectButton);

    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('should disable revise and reject buttons when comment is empty', () => {
    renderModal({
      rejectModal: {
        open: true,
        id: 'opp-101',
        comment: '   ',
      },
    });

    const reviseButton = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectButton = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });
});
