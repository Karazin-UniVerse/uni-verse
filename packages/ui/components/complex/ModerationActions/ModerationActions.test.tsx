import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModerationActions } from './ModerationActions';

describe('ModerationActions', () => {
  it('should render the supplied labels in decision order', () => {
    const props = {
      approveText: 'Approve',
      reviseText: 'Request changes',
      rejectText: 'Reject',
      onApprove: vi.fn(),
      onOpenRejectModal: vi.fn(),
    };

    render(<ModerationActions {...props} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Approve',
      'Request changes',
      'Reject',
    ]);
  });

  it.each([
    { label: 'Approve', callback: 'onApprove' },
    { label: 'Request changes', callback: 'onOpenRejectModal' },
    { label: 'Reject', callback: 'onOpenRejectModal' },
  ] as const)('should invoke $callback for $label only', async ({ label, callback }) => {
    const user = userEvent.setup();
    const props = {
      approveText: 'Approve',
      reviseText: 'Request changes',
      rejectText: 'Reject',
      onApprove: vi.fn(),
      onOpenRejectModal: vi.fn(),
    };

    render(<ModerationActions {...props} />);
    await user.click(screen.getByRole('button', { name: label }));

    expect(props[callback]).toHaveBeenCalledTimes(1);
    expect(
      props[callback === 'onApprove' ? 'onOpenRejectModal' : 'onApprove'],
    ).not.toHaveBeenCalled();
  });

  it.each(['Approve', 'Request changes', 'Reject'])(
    'should prevent %s while disabled',
    async (label) => {
      const user = userEvent.setup();
      const props = {
        approveText: 'Approve',
        reviseText: 'Request changes',
        rejectText: 'Reject',
        onApprove: vi.fn(),
        onOpenRejectModal: vi.fn(),
        disabled: true,
      };

      render(<ModerationActions {...props} />);
      await user.click(screen.getByRole('button', { name: label }));

      expect(screen.getByRole('button', { name: label })).toBeDisabled();
      expect(props.onApprove).not.toHaveBeenCalled();
      expect(props.onOpenRejectModal).not.toHaveBeenCalled();
    },
  );

  it('should support keyboard approval without submitting an enclosing form', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onSubmit = vi.fn();
    const props = {
      approveText: 'Approve',
      reviseText: 'Request changes',
      rejectText: 'Reject',
      onApprove,
      onOpenRejectModal: vi.fn(),
    };

    render(
      <form onSubmit={onSubmit}>
        <ModerationActions {...props} />
      </form>,
    );
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
