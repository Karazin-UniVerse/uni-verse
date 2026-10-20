import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationRejectModal } from './ModerationRejectModal';

describe('ModerationRejectModal Component', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    onRevise: vi.fn(),
    onReject: vi.fn(),
    onCommentChange: vi.fn(),
    title: 'Зауваження або повернення на доопрацювання',
    commentLabel: 'Опишіть зауваження або причину:',
    placeholder: 'Вкажіть, що саме необхідно виправити...',
    cancelText: 'Скасувати',
    reviseText: 'На доопрацювання',
    rejectText: 'Відхилити',
  };

  it('disables "На доопрацювання" and enables "Відхилити" when comment is empty', async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();

    render(<ModerationRejectModal {...baseProps} comment="" onReject={onReject} />);

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseBtn).toBeDisabled();
    expect(rejectBtn).toBeEnabled();

    await user.click(rejectBtn);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('disables "На доопрацювання" when comment has only whitespace', () => {
    render(<ModerationRejectModal {...baseProps} comment="    " />);

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseBtn).toBeDisabled();
    expect(rejectBtn).toBeEnabled();
  });

  it('enables both "На доопрацювання" and "Відхилити" when comment is provided', async () => {
    const onRevise = vi.fn();
    const user = userEvent.setup();

    render(
      <ModerationRejectModal
        {...baseProps}
        comment="Потрібно виправити опис"
        onRevise={onRevise}
      />,
    );

    const reviseBtn = screen.getByRole('button', { name: 'На доопрацювання' });
    const rejectBtn = screen.getByRole('button', { name: 'Відхилити' });

    expect(reviseBtn).toBeEnabled();
    expect(rejectBtn).toBeEnabled();

    await user.click(reviseBtn);
    expect(onRevise).toHaveBeenCalledTimes(1);
  });

  it('disables all controls when isSubmitting is true', () => {
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
});
