import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { ApplyOpportunityModal, type ApplyOpportunityModalProps } from './ApplyOpportunityModal';

describe('ApplyOpportunityModal component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const defaultProps: ApplyOpportunityModalProps = {
    open: true,
    onClose: vi.fn(),
    opportunityTitle: 'Frontend Developer Internship',
    motivation: 'I am motivated to learn and contribute to this project.',
    onMotivationChange: vi.fn(),
    contactInfo: '@student_dev',
    onContactInfoChange: vi.fn(),
    onSubmit: vi.fn((e: React.SyntheticEvent<HTMLFormElement>) => e.preventDefault()),
    submitting: false,
  };

  const renderModal = (props: Partial<ApplyOpportunityModalProps> = {}) => {
    return render(
      withLanguage(<ApplyOpportunityModal {...defaultProps} {...props} />),
    );
  };

  it('should render modal with formatted title containing opportunity name when open', () => {
    renderModal();

    const expectedTitle = 'Відгук: Frontend Developer Internship';

    expect(screen.getByRole('dialog', { name: expectedTitle })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: expectedTitle })).toBeInTheDocument();

    const motivationInput = screen.getByLabelText(
      'Супровідне повідомлення (чому вам цікавий цей проект) *',
    );
    const contactInput = screen.getByLabelText('Ваш Telegram або номер телефону для звʼязку');

    expect(motivationInput).toBeInTheDocument();
    expect(motivationInput).toHaveValue(defaultProps.motivation);
    expect(motivationInput).toHaveAttribute(
      'placeholder',
      'Коротко опишіть ваш досвід, стек та чому ви хочете взяти участь...',
    );

    expect(contactInput).toBeInTheDocument();
    expect(contactInput).toHaveValue(defaultProps.contactInfo);
    expect(contactInput).toHaveAttribute('placeholder', '@username або +380...');

    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Надіслати відгук' })).toBeInTheDocument();
  });

  it('should render modal with fallback title when opportunityTitle is not provided', () => {
    renderModal({ opportunityTitle: undefined });

    expect(screen.getByRole('dialog', { name: 'Відгук:' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Відгук:' })).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    renderModal({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onMotivationChange when typing in motivation textarea', async () => {
    const handleMotivationChange = vi.fn();
    const user = userEvent.setup();

    renderModal({ onMotivationChange: handleMotivationChange });

    const motivationInput = screen.getByLabelText(
      'Супровідне повідомлення (чому вам цікавий цей проект) *',
    );

    await user.type(motivationInput, 'Extra notes');

    expect(handleMotivationChange).toHaveBeenCalled();
  });

  it('should call onContactInfoChange when typing in contact info input', async () => {
    const handleContactInfoChange = vi.fn();
    const user = userEvent.setup();

    renderModal({ onContactInfoChange: handleContactInfoChange });

    const contactInput = screen.getByLabelText('Ваш Telegram або номер телефону для звʼязку');

    await user.type(contactInput, '123');

    expect(handleContactInfoChange).toHaveBeenCalled();
  });

  it('should trigger onSubmit when submitting form', async () => {
    const handleSubmit = vi.fn((e: React.SyntheticEvent<HTMLFormElement>) => e.preventDefault());
    const user = userEvent.setup();

    renderModal({ onSubmit: handleSubmit });

    const submitBtn = screen.getByRole('button', { name: 'Надіслати відгук' });

    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderModal({ onClose: handleClose });

    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should show submitting text and disable submit button when submitting is true', () => {
    renderModal({ submitting: true });

    const submitBtn = screen.getByRole('button', { name: 'Відправка...' });
    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Надіслати відгук' })).not.toBeInTheDocument();
  });
});
