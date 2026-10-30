import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('UNA Modal Component', () => {
  it('should render dialog when open is true with accessible title and children', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Modal Title">
        <p>Modal Body Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Modal Title' });

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Modal Body Content')).toBeInTheDocument();
  });

  it('should not render dialog when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Modal Title">
        <p>Modal Body Content</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal Body Content')).not.toBeInTheDocument();
  });

  it('should render dialog with aria-label when title is not provided', () => {
    render(
      <Modal open={true} onClose={() => {}} ariaLabel="Accessible Modal">
        <p>Modal Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Accessible Modal' });

    expect(dialog).toBeInTheDocument();
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('should call onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={handleClose} title="Modal Title" closeLabel="Close dialog">
        <p>Modal Content</p>
      </Modal>,
    );

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });

    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not render close button when closeButton is false', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Modal Title" closeButton={false}>
        <p>Modal Content</p>
      </Modal>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={handleClose} title="Modal Title">
        <p>Modal Content</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when Escape key is pressed and closeOnEscape is false', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={handleClose} title="Modal Title" closeOnEscape={false}>
        <p>Modal Content</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should call onClose when backdrop or overlay is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <Modal open={true} onClose={handleClose} title="Modal Title">
        <p>Modal Content</p>
      </Modal>,
    );

    const overlay = container.firstElementChild as HTMLElement;

    await user.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking inside the dialog', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={handleClose} title="Modal Title">
        <button type="button">Inside Button</button>
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Inside Button' }));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should not call onClose when clicking outside and closeOnClickOutside is false', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <Modal open={true} onClose={handleClose} title="Modal Title" closeOnClickOutside={false}>
        <p>Modal Content</p>
      </Modal>,
    );

    const overlay = container.firstElementChild as HTMLElement;

    await user.click(overlay);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should apply custom width and className to dialog', () => {
    render(
      <Modal
        open={true}
        onClose={() => {}}
        title="Custom Modal"
        className="my-custom-class"
        width={800}
      >
        <p>Modal Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Custom Modal' });

    expect(dialog).toHaveClass('my-custom-class');
    expect(dialog.style.getPropertyValue('--modal-dialog-width')).toBe('800px');
  });

  it('should apply string width style to dialog', () => {
    render(
      <Modal open={true} onClose={() => {}} title="String Width Modal" width="60vw">
        <p>Modal Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'String Width Modal' });

    expect(dialog.style.getPropertyValue('--modal-dialog-width')).toBe('60vw');
  });

  it('should lock body scroll when open and restore scroll on unmount', () => {
    const { unmount } = render(
      <Modal open={true} onClose={() => {}} title="Scroll Lock Modal" lockScroll={true}>
        <p>Modal Content</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
