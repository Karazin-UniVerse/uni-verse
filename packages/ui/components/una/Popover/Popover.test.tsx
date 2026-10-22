import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover } from './Popover';
import { noop } from '@core/utils/fn';

describe('UNA Popover Component', () => {
  it('should return null when open is false', () => {
    render(
      <Popover open={false} onClose={noop}>
        <div>Content</div>
      </Popover>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with content and title when open is true', () => {
    render(
      <Popover open={true} onClose={noop} title="Test Title">
        <div>Popover Body Content</div>
      </Popover>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Test Title' });

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('Popover Body Content')).toBeInTheDocument();
  });

  it('should omit close button when closeButton is false', () => {
    render(
      <Popover open={true} onClose={noop} title="Test Title" closeButton={false}>
        <div>Body</div>
      </Popover>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should trigger onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Popover open={true} onClose={handleClose} closeLabel="Close Popover">
        <div>Body</div>
      </Popover>,
    );

    const closeBtn = screen.getByRole('button', { name: 'Close Popover' });

    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should apply custom placement and width style', () => {
    render(
      <Popover
        open={true}
        onClose={noop}
        placement="top-start"
        width={400}
        ariaLabel="Custom Dialog"
      >
        <div>Body</div>
      </Popover>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Custom Dialog' });

    expect(dialog.className).toContain('top-start');
    expect(dialog.style.getPropertyValue('--popover-width')).toBe('400px');
  });
});
