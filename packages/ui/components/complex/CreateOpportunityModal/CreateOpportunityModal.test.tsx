import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOpportunityModal } from './CreateOpportunityModal';
import type {
  CreateOpportunityFormData,
  CreateOpportunityModalProps,
} from './CreateOpportunityModal.types';

describe('CreateOpportunityModal Component', () => {
  const initialFormData: CreateOpportunityFormData = {
    title: 'Frontend Internship Opportunity',
    description: 'Looking for motivated interns to work with modern React and TypeScript.',
    ownerContactInfo: 'hr@universe.edu',
    paymentType: 'UNPAID',
    paymentDetails: '',
  };

  const defaultProps: CreateOpportunityModalProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Create Opportunity',
    formData: initialFormData,
    setFormData: vi.fn(),
    onSubmit: vi.fn((e: SyntheticEvent<HTMLFormElement>) => e.preventDefault()),
    titleLabel: 'Opportunity Title',
    titlePlaceholder: 'Enter title...',
    descLabel: 'Description',
    descPlaceholder: 'Enter description...',
    contactLabel: 'Contact Information',
    contactPlaceholder: 'Enter contact email or phone...',
    contactHint: 'Your profile email will be shown automatically.',
    paymentTypeLabel: 'Payment Type',
    paymentDetailsLabel: 'Payment Details',
    paymentDetailsPlaceholder: 'Enter salary or stipend info...',
    unpaidOptionLabel: 'Unpaid / Volunteer',
    paidOptionLabel: 'Paid Position',
    cancelText: 'Cancel',
    submitText: 'Create Opportunity',
    savingText: 'Creating...',
    submitting: false,
  };

  it('should render modal when open is true with accessible dialog title', () => {
    render(<CreateOpportunityModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toBeInTheDocument();

    const titleInput = screen.getByLabelText(defaultProps.titleLabel);

    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue(defaultProps.formData.title);
    expect(titleInput).toHaveAttribute('placeholder', defaultProps.titlePlaceholder);

    const descInput = screen.getByLabelText(defaultProps.descLabel);

    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveValue(defaultProps.formData.description);
    expect(descInput).toHaveAttribute('placeholder', defaultProps.descPlaceholder);

    const contactInput = screen.getByLabelText(defaultProps.contactLabel);

    expect(contactInput).toBeInTheDocument();
    expect(contactInput).toHaveValue(defaultProps.formData.ownerContactInfo);
    expect(contactInput).toHaveAttribute('placeholder', defaultProps.contactPlaceholder);
    expect(contactInput).toHaveAccessibleDescription(defaultProps.contactHint);

    const paymentTypeSelect = screen.getByLabelText(defaultProps.paymentTypeLabel);

    expect(paymentTypeSelect).toBeInTheDocument();
    expect(paymentTypeSelect).toHaveValue('UNPAID');

    expect(screen.queryByLabelText(defaultProps.paymentDetailsLabel)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: defaultProps.cancelText })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: defaultProps.submitText })).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<CreateOpportunityModal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.titleLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.descLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.contactLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(defaultProps.paymentTypeLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: defaultProps.submitText })).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked or Escape key is pressed', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateOpportunityModal {...defaultProps} onClose={handleClose} />);

    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });

    await user.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('should show payment details field when paymentType is PAID', () => {
    const paidFormData: CreateOpportunityFormData = {
      ...initialFormData,
      paymentType: 'PAID',
      paymentDetails: '500 USD / month',
    };

    render(<CreateOpportunityModal {...defaultProps} formData={paidFormData} />);

    const paymentDetailsInput = screen.getByLabelText(defaultProps.paymentDetailsLabel);

    expect(paymentDetailsInput).toBeInTheDocument();
    expect(paymentDetailsInput).toHaveValue('500 USD / month');
    expect(paymentDetailsInput).toHaveAttribute(
      'placeholder',
      defaultProps.paymentDetailsPlaceholder,
    );
  });

  it('should call setFormData with functional updater when inputs change', async () => {
    const handleSetFormData = vi.fn();
    const user = userEvent.setup();

    const Wrapper = () => {
      const [formData, setFormData] = useState<CreateOpportunityFormData>({
        ...initialFormData,
        paymentType: 'PAID',
        paymentDetails: '',
      });

      const wrappedSetFormData: typeof setFormData = (action) => {
        handleSetFormData(action);
        setFormData(action);
      };

      return (
        <CreateOpportunityModal
          {...defaultProps}
          formData={formData}
          setFormData={wrappedSetFormData}
        />
      );
    };

    render(<Wrapper />);

    const titleInput = screen.getByLabelText(defaultProps.titleLabel);

    await user.type(titleInput, '!');
    expect(handleSetFormData).toHaveBeenCalled();

    const titleUpdater = handleSetFormData.mock.calls.at(-1)?.[0];

    expect(typeof titleUpdater).toBe('function');
    expect(titleUpdater(initialFormData)).toEqual({
      ...initialFormData,
      title: `${initialFormData.title}!`,
    });

    const descInput = screen.getByLabelText(defaultProps.descLabel);

    await user.type(descInput, '!');
    expect(handleSetFormData).toHaveBeenCalled();

    const descUpdater = handleSetFormData.mock.calls.at(-1)?.[0];

    expect(typeof descUpdater).toBe('function');
    expect(descUpdater(initialFormData)).toEqual({
      ...initialFormData,
      description: `${initialFormData.description}!`,
    });

    const contactInput = screen.getByLabelText(defaultProps.contactLabel);

    await user.type(contactInput, '!');
    expect(handleSetFormData).toHaveBeenCalled();

    const contactUpdater = handleSetFormData.mock.calls.at(-1)?.[0];

    expect(typeof contactUpdater).toBe('function');
    expect(contactUpdater(initialFormData)).toEqual({
      ...initialFormData,
      ownerContactInfo: `${initialFormData.ownerContactInfo}!`,
    });

    const paymentDetailsInput = screen.getByLabelText(defaultProps.paymentDetailsLabel);

    await user.type(paymentDetailsInput, '!');
    expect(handleSetFormData).toHaveBeenCalled();

    const detailsUpdater = handleSetFormData.mock.calls.at(-1)?.[0];

    expect(typeof detailsUpdater).toBe('function');
    expect(detailsUpdater(initialFormData)).toEqual({
      ...initialFormData,
      paymentDetails: `${initialFormData.paymentDetails}!`,
    });

    const paymentTypeSelect = screen.getByLabelText(defaultProps.paymentTypeLabel);

    await user.selectOptions(paymentTypeSelect, 'UNPAID');
    expect(handleSetFormData).toHaveBeenCalled();

    const selectUpdater = handleSetFormData.mock.calls.at(-1)?.[0];

    expect(typeof selectUpdater).toBe('function');
    expect(selectUpdater(initialFormData)).toEqual({
      ...initialFormData,
      paymentType: 'UNPAID',
    });
  });

  it('should handle input changes and form submission with correct payload', async () => {
    const handleSubmit = vi.fn((e: SyntheticEvent<HTMLFormElement>) => e.preventDefault());
    const user = userEvent.setup();

    const FormContainer = () => {
      const [formData, setFormData] = useState<CreateOpportunityFormData>({
        title: '',
        description: '',
        ownerContactInfo: '',
        paymentType: 'UNPAID',
        paymentDetails: '',
      });

      return (
        <CreateOpportunityModal
          {...defaultProps}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
        />
      );
    };

    render(<FormContainer />);

    const titleInput = screen.getByLabelText(defaultProps.titleLabel);
    const descInput = screen.getByLabelText(defaultProps.descLabel);
    const contactInput = screen.getByLabelText(defaultProps.contactLabel);
    const paymentTypeSelect = screen.getByLabelText(defaultProps.paymentTypeLabel);

    await user.click(titleInput);
    await user.paste('Software Engineer Intern');
    await user.click(descInput);
    await user.paste('Join our engineering team to build scalable services.');
    await user.click(contactInput);
    await user.paste('lead@universe.edu');
    await user.selectOptions(paymentTypeSelect, 'PAID');

    const paymentDetailsInput = screen.getByLabelText(defaultProps.paymentDetailsLabel);

    await user.click(paymentDetailsInput);
    await user.paste('20 USD/hour');

    expect(titleInput).toHaveValue('Software Engineer Intern');
    expect(descInput).toHaveValue('Join our engineering team to build scalable services.');
    expect(contactInput).toHaveValue('lead@universe.edu');
    expect(paymentTypeSelect).toHaveValue('PAID');
    expect(paymentDetailsInput).toHaveValue('20 USD/hour');

    const submitBtn = screen.getByRole('button', { name: defaultProps.submitText });

    await user.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should disable submit button or show loading state when submitting', () => {
    render(<CreateOpportunityModal {...defaultProps} submitting={true} />);

    const submitBtn = screen.getByRole('button', { name: defaultProps.savingText });
    const cancelBtn = screen.getByRole('button', { name: defaultProps.cancelText });

    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(screen.queryByRole('button', { name: defaultProps.submitText })).not.toBeInTheDocument();
  });

  it('should validate required fields if applicable', () => {
    const paidFormData: CreateOpportunityFormData = {
      ...initialFormData,
      paymentType: 'PAID',
      paymentDetails: 'Stipend provided',
    };

    const { rerender } = render(<CreateOpportunityModal {...defaultProps} />);

    const titleInput = screen.getByLabelText(defaultProps.titleLabel);
    const descInput = screen.getByLabelText(defaultProps.descLabel);
    const contactInput = screen.getByLabelText(defaultProps.contactLabel);

    expect(titleInput).toBeRequired();
    expect(descInput).toBeRequired();
    expect(contactInput).not.toBeRequired();

    rerender(<CreateOpportunityModal {...defaultProps} formData={paidFormData} />);

    const paymentDetailsInput = screen.getByLabelText(defaultProps.paymentDetailsLabel);

    expect(paymentDetailsInput).not.toBeRequired();
  });

  it('should apply custom className when provided', () => {
    render(<CreateOpportunityModal {...defaultProps} className="custom-modal-class" />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toHaveClass('custom-modal-class');
  });
});
