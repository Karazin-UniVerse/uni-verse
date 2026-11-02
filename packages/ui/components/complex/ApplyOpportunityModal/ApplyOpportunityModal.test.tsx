import type { SyntheticEvent } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplyOpportunityModal } from './ApplyOpportunityModal';
import type { ApplyOpportunityModalProps } from './ApplyOpportunityModal.types';

describe('ApplyOpportunityModal Component', () => {
  const defaultProps: ApplyOpportunityModalProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Apply for Internship',
    motivation: 'I am enthusiastic about this opportunity',
    onMotivationChange: vi.fn(),
    contactInfo: 'student@example.com',
    onContactInfoChange: vi.fn(),
    onSubmit: vi.fn((e: SyntheticEvent<HTMLFormElement>) => e.preventDefault()),
    motivationLabel: 'Motivation letter',
    motivationPlaceholder: 'Tell us why you are a great fit...',
    contactLabel: 'Contact Information',
    contactPlaceholder: 'Enter your email or phone number',
    contactHint: 'Your profile email will be shown automatically.',
    cancelText: 'Cancel',
    submitText: 'Submit Application',
    submittingText: 'Submitting...',
    submitting: false,
  };

  it('should render modal when open is true with accessible dialog title', () => {
    render(<ApplyOpportunityModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toBeInTheDocument();

    const motivationInput = screen.getByLabelText(defaultProps.motivationLabel);

    expect(motivationInput).toBeInTheDocument();
    expect(motivationInput).toHaveValue(defaultProps.motivation);
    expect(motivationInput).toHaveAttribute('placeholder', defaultProps.motivationPlaceholder);

    const contactInput = screen.getByLabelText(defaultProps.contactLabel);

    expect(contactInput).toBeInTheDocument();
    expect(contactInput).toHaveValue(defaultProps.contactInfo);
    expect(contactInput).toHaveAttribute('placeholder', defaultProps.contactPlaceholder);
    expect(contactInput).toHaveAccessibleDescription(defaultProps.contactHint);

    expect(screen.getByRole('button', { name: defaultProps.cancelText })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: defaultProps.submitText })).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<ApplyOpportunityModal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.motivationLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.contactLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: defaultProps.submitText })).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked or Escape key is pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<ApplyOpportunityModal {...defaultProps} onClose={handleClose} />);

    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });

    await user.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('should handle form inputs and submit application callback', async () => {
    const handleMotivationChange = vi.fn();
    const handleContactInfoChange = vi.fn();
    const handleSubmit = vi.fn((e: SyntheticEvent<HTMLFormElement>) => e.preventDefault());
    const user = userEvent.setup();

    render(
      <ApplyOpportunityModal
        {...defaultProps}
        onMotivationChange={handleMotivationChange}
        onContactInfoChange={handleContactInfoChange}
        onSubmit={handleSubmit}
      />,
    );

    const motivationInput = screen.getByLabelText(defaultProps.motivationLabel);
    const contactInput = screen.getByLabelText(defaultProps.contactLabel);

    await user.type(motivationInput, '!');
    expect(handleMotivationChange).toHaveBeenCalled();

    await user.type(contactInput, '!');
    expect(handleContactInfoChange).toHaveBeenCalled();

    const submitBtn = screen.getByRole('button', { name: defaultProps.submitText });

    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should disable submit button or show loading indicator when submitting', () => {
    render(<ApplyOpportunityModal {...defaultProps} submitting={true} />);

    const submitBtn = screen.getByRole('button', { name: defaultProps.submittingText });
    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });

    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(screen.queryByRole('button', { name: defaultProps.submitText })).not.toBeInTheDocument();
  });

  it.each(['', '   '])('should keep motivation required when it is %j', (motivation) => {
    render(<ApplyOpportunityModal {...defaultProps} motivation={motivation} />);

    expect(screen.getByRole('button', { name: defaultProps.submitText })).toBeDisabled();
  });

  it.each(['', '   '])(
    'should allow submitting without an alternative contact %j',
    async (contactInfo) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>): void =>
        event.preventDefault(),
      );

      render(
        <ApplyOpportunityModal {...defaultProps} contactInfo={contactInfo} onSubmit={onSubmit} />,
      );

      expect(screen.getByLabelText(defaultProps.contactLabel)).not.toBeRequired();
      await user.click(screen.getByRole('button', { name: defaultProps.submitText }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    },
  );

  it('should apply custom className when provided', () => {
    render(<ApplyOpportunityModal {...defaultProps} className="custom-modal-dialog" />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toHaveClass('custom-modal-dialog');
  });
});
