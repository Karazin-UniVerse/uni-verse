import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationRejectModal } from './ModerationRejectModal';
import type { ModerationRejectModalProps } from './ModerationRejectModal.types';

describe('ModerationRejectModal Component', () => {
  const baseProps: ModerationRejectModalProps = {
    open: true,
    onClose: vi.fn(),
    onRevise: vi.fn(),
    onReject: vi.fn(),
    onCommentChange: vi.fn(),
    title: 'Зауваження або повернення на доопрацювання',
    comment: '',
    commentLabel: 'Опишіть зауваження або причину:',
    placeholder: 'Вкажіть, що саме необхідно виправити...',
    cancelText: 'Скасувати',
    reviseText: 'На доопрацювання',
    rejectText: 'Відхилити',
    isSubmitting: false,
  };

  it('should disable both "На доопрацювання" and "Відхилити" when comment is empty', () => {
    render(<ModerationRejectModal {...baseProps} comment="" />);

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();
  });

  it('should disable both buttons when comment has only whitespace', () => {
    render(<ModerationRejectModal {...baseProps} comment="    " />);

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();
  });

  it('should enable both buttons and call handlers when comment is provided', async () => {
    const onRevise = vi.fn();
    const onReject = vi.fn();
    const user = userEvent.setup();

    render(
      <ModerationRejectModal
        {...baseProps}
        comment="Потрібно виправити опис"
        onRevise={onRevise}
        onReject={onReject}
      />,
    );

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseBtn).toBeEnabled();
    expect(rejectBtn).toBeEnabled();

    await user.click(reviseBtn);
    expect(onRevise).toHaveBeenCalledTimes(1);

    await user.click(rejectBtn);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('should disable all controls when isSubmitting is true', () => {
    render(<ModerationRejectModal {...baseProps} comment="Коментар" isSubmitting={true} />);

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });
    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });
    const textarea = screen.getByRole('textbox');

    expect(reviseBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(textarea).toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ModerationRejectModal {...baseProps} onClose={onClose} />);

    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onCommentChange when typing in comment textarea', async () => {
    const onCommentChange = vi.fn();
    const user = userEvent.setup();

    render(<ModerationRejectModal {...baseProps} comment="" onCommentChange={onCommentChange} />);

    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Тест');
    expect(onCommentChange).toHaveBeenCalled();
  });

  it('should not render anything when open is false', () => {
    render(<ModerationRejectModal {...baseProps} open={false} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Скасувати' })).not.toBeInTheDocument();
  });
});
