import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationRejectModal } from './ModerationRejectModal';
import type { ModerationRejectModalProps } from './ModerationRejectModal.types';
import styles from './ModerationRejectModal.module.scss';

vi.mock('../../una/Modal', () => ({
  Modal: ({
    open,
    onClose,
    title,
    children,
    className,
  }: {
    open: boolean;
    onClose?: () => void;
    title?: string;
    children?: ReactNode;
    className?: string;
  }) =>
    open ? (
      <dialog open aria-label={title} className={className}>
        {title ? <h2>{title}</h2> : null}
        <button type="button" onClick={onClose} aria-label="Close dialog">
          Close
        </button>
        {children}
      </dialog>
    ) : null,
}));

describe('ModerationRejectModal Component', () => {
  const defaultProps: ModerationRejectModalProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Reject Opportunity',
    comment: 'Does not follow university guidelines',
    onCommentChange: vi.fn(),
    commentLabel: 'Rejection reason',
    placeholder: 'Please describe the reason for rejection...',
    cancelText: 'Cancel',
    reviseText: 'Request Revision',
    rejectText: 'Reject',
    onRevise: vi.fn(),
    onReject: vi.fn(),
    isSubmitting: false,
  };

  it('should render modal when open is true with accessible dialog title', () => {
    render(<ModerationRejectModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });
    const heading = screen.getByRole('heading', { name: defaultProps.title });
    const textarea = screen.getByLabelText(defaultProps.commentLabel);
    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });
    const reviseBtn = screen.getByRole('button', { name: defaultProps.reviseText });
    const rejectBtn = screen.getByRole('button', { name: defaultProps.rejectText });

    expect(dialog).toBeInTheDocument();
    expect(heading).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(defaultProps.comment);
    expect(textarea).toHaveAttribute('placeholder', defaultProps.placeholder);
    expect(cancelBtn).toBeInTheDocument();
    expect(reviseBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();
    expect(reviseBtn).toHaveClass(styles.reviseBtn);
    expect(rejectBtn).toHaveClass(styles.rejectBtn);
  });

  it('should not render when open is false', () => {
    render(<ModerationRejectModal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.commentLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: defaultProps.cancelText })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: defaultProps.reviseText })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: defaultProps.rejectText })).not.toBeInTheDocument();
  });

  it('should call onClose when cancel/close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<ModerationRejectModal {...defaultProps} onClose={handleClose} />);

    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });

    await user.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeDialogBtn = screen.getByRole('button', { name: 'Close dialog' });

    await user.click(closeDialogBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('should require reject reason and call onReject with selected or typed reason', async () => {
    const handleReject = vi.fn();
    const handleCommentChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <ModerationRejectModal
        {...defaultProps}
        comment=""
        onCommentChange={handleCommentChange}
        onReject={handleReject}
      />,
    );

    const textarea = screen.getByLabelText(defaultProps.commentLabel);
    const rejectBtn = screen.getByRole('button', { name: defaultProps.rejectText });

    expect(rejectBtn).toBeDisabled();

    rerender(
      <ModerationRejectModal
        {...defaultProps}
        comment="   "
        onCommentChange={handleCommentChange}
        onReject={handleReject}
      />,
    );

    expect(rejectBtn).toBeDisabled();

    await user.type(textarea, 'Plagiarism detected');
    expect(handleCommentChange).toHaveBeenCalled();

    rerender(
      <ModerationRejectModal
        {...defaultProps}
        comment="Plagiarism detected"
        onCommentChange={handleCommentChange}
        onReject={handleReject}
      />,
    );

    expect(rejectBtn).toBeEnabled();

    await user.click(rejectBtn);
    expect(handleReject).toHaveBeenCalledTimes(1);
  });

  it('should call onRevise when revise button is clicked with reason', async () => {
    const handleRevise = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <ModerationRejectModal {...defaultProps} comment="" onRevise={handleRevise} />,
    );

    const reviseBtn = screen.getByRole('button', { name: defaultProps.reviseText });

    expect(reviseBtn).toBeDisabled();

    rerender(
      <ModerationRejectModal
        {...defaultProps}
        comment="Needs more contact info"
        onRevise={handleRevise}
      />,
    );

    expect(reviseBtn).toBeEnabled();

    await user.click(reviseBtn);
    expect(handleRevise).toHaveBeenCalledTimes(1);
  });

  it('should disable submit button or show loading state when submitting', async () => {
    const handleClose = vi.fn();
    const handleReject = vi.fn();
    const handleRevise = vi.fn();
    const user = userEvent.setup();

    render(
      <ModerationRejectModal
        {...defaultProps}
        isSubmitting={true}
        onClose={handleClose}
        onReject={handleReject}
        onRevise={handleRevise}
      />,
    );

    const textarea = screen.getByLabelText(defaultProps.commentLabel);
    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });
    const reviseBtn = screen.getByRole('button', { name: defaultProps.reviseText });
    const rejectBtn = screen.getByRole('button', { name: defaultProps.rejectText });

    expect(textarea).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(reviseBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();

    await user.click(rejectBtn);
    await user.click(reviseBtn);
    await user.click(cancelBtn);

    expect(handleReject).not.toHaveBeenCalled();
    expect(handleRevise).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should apply custom className to modal when provided', () => {
    render(<ModerationRejectModal {...defaultProps} className="custom-reject-dialog" />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toHaveClass('custom-reject-dialog');
  });
});
