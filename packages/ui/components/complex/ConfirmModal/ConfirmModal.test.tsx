import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from './ConfirmModal';
import styles from './ConfirmModal.module.scss';

describe('ConfirmModal Component', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete confirmation',
    message: 'Are you sure you want to delete this item?',
    cancelLabel: 'Cancel',
    confirmLabel: 'Delete',
  };

  it('should render confirmation dialog when open is true with accessible title and message', () => {
    render(<ConfirmModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { name: 'Delete confirmation' });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Delete confirmation')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<ConfirmModal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete confirmation')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Are you sure you want to delete this item?'),
    ).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel/onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when header close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmModal {...defaultProps} onClose={onClose} closeLabel="Close dialog" />);

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should reflect danger/destructive variant styling', () => {
    const { container } = render(<ConfirmModal {...defaultProps} variant="danger" />);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });

    expect(confirmBtn).toHaveClass(styles.dangerBtn);

    const icon = container.querySelector(`.${styles.icon}`);

    expect(icon).toHaveClass(styles.dangerIcon);
  });

  it('should reflect warning variant styling', () => {
    const { container } = render(<ConfirmModal {...defaultProps} variant="warning" />);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });

    expect(confirmBtn).not.toHaveClass(styles.dangerBtn);

    const icon = container.querySelector(`.${styles.icon}`);

    expect(icon).toHaveClass(styles.warningIcon);
  });

  it('should disable actions when loading/isPending', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmModal
        {...defaultProps}
        onConfirm={onConfirm}
        onClose={onClose}
        loading={true}
        loadingLabel="Deleting..."
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const confirmBtn = screen.getByRole('button', { name: 'Deleting...' });

    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();

    await user.click(cancelBtn);
    await user.click(confirmBtn);

    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should disable actions and retain confirmLabel when loading without loadingLabel', () => {
    render(<ConfirmModal {...defaultProps} loading={true} />);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });

    expect(confirmBtn).toBeDisabled();
  });

  it('should render custom icon when provided', () => {
    render(
      <ConfirmModal {...defaultProps} icon={<span data-testid="custom-icon">Warning</span>} />,
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should apply custom className to modal content', () => {
    const { container } = render(
      <ConfirmModal {...defaultProps} className="custom-confirm-class" />,
    );

    const modalContent = container.querySelector(`.${styles.modalContent}`);

    expect(modalContent).toHaveClass('custom-confirm-class');
  });
});
