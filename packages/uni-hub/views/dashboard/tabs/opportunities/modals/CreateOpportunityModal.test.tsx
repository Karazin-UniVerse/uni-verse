import type { SyntheticEvent } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { CreateOpportunityModal } from './CreateOpportunityModal';
import type { CreateOpportunityFormData } from '../types';

describe('CreateOpportunityModal', () => {
  const initialFormData: CreateOpportunityFormData = {
    title: 'Стажування для фронтенд-розробника',
    description: 'Потрібен студент для розробки інтерфейсу на React та TypeScript.',
    ownerContactInfo: 'hr@karazin.ua',
    paymentType: 'UNPAID',
    paymentDetails: '',
  };

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    formData: initialFormData,
    setFormData: vi.fn(),
    onSubmit: vi.fn((e: SyntheticEvent<HTMLFormElement>) => e.preventDefault()),
    submitting: false,
    isEdit: false,
  };

  const renderComponent = (props = {}) => {
    return render(
      withLanguage(<CreateOpportunityModal {...defaultProps} {...props} />),
    );
  };

  it('should render modal in create mode with create title and inputs', () => {
    renderComponent({ isEdit: false });

    expect(screen.getByRole('dialog', { name: 'Створити нову можливість' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Створити нову можливість' }),
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText('Назва можливості *');

    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue(initialFormData.title);
    expect(titleInput).toHaveAttribute(
      'placeholder',
      'Наприклад: React-розробник у студентський стартап',
    );

    const descInput = screen.getByLabelText('Опис, завдання та вимоги до кандидата *');

    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveValue(initialFormData.description);
    expect(descInput).toHaveAttribute(
      'placeholder',
      'Детально розкажіть про проект, задачі, очікувану зайнятість та необхідні навички...',
    );

    const contactInput = screen.getByLabelText('Контактні дані організатора *');

    expect(contactInput).toBeInTheDocument();
    expect(contactInput).toHaveValue(initialFormData.ownerContactInfo);
    expect(contactInput).toHaveAttribute('placeholder', 'Telegram (@username), Email або номер телефону');

    const paymentTypeSelect = screen.getByLabelText('Тип винагороди');

    expect(paymentTypeSelect).toBeInTheDocument();
    expect(paymentTypeSelect).toHaveValue('UNPAID');
    expect(screen.queryByLabelText('Деталі та розмір оплати')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Створити чернетку' })).toBeInTheDocument();
  });

  it('should render modal in edit mode with edit title and save button', () => {
    const editFormData: CreateOpportunityFormData = {
      title: 'Оновлена назва можливості',
      description: 'Оновлений опис та вимоги',
      ownerContactInfo: 'lead@karazin.ua',
      paymentType: 'PAID',
      paymentDetails: '500$/міс',
    };

    renderComponent({
      isEdit: true,
      formData: editFormData,
    });

    expect(screen.getByRole('dialog', { name: 'Редагувати можливість' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Редагувати можливість' }),
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText('Назва можливості *');

    expect(titleInput).toHaveValue(editFormData.title);

    const paymentDetailsInput = screen.getByLabelText('Деталі та розмір оплати');

    expect(paymentDetailsInput).toBeInTheDocument();
    expect(paymentDetailsInput).toHaveValue(editFormData.paymentDetails);
    expect(paymentDetailsInput).toHaveAttribute(
      'placeholder',
      'Наприклад: $400/місяць або 5000 грн за етап',
    );

    expect(screen.getByRole('button', { name: 'Зберегти зміни' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Створити чернетку' })).not.toBeInTheDocument();
  });

  it('should trigger onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn((e: SyntheticEvent<HTMLFormElement>) => e.preventDefault());

    renderComponent({ onSubmit: handleSubmit });

    const submitBtn = screen.getByRole('button', { name: 'Створити чернетку' });

    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    renderComponent({ onClose: handleClose });

    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should show submitting state when submitting is true', () => {
    renderComponent({ submitting: true });

    const submitBtn = screen.getByRole('button', { name: 'Збереження...' });
    const cancelBtn = screen.getByRole('button', { name: 'Скасувати' });

    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
  });

  it('should not render modal when open is false', () => {
    renderComponent({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should call setFormData when input fields change', async () => {
    const user = userEvent.setup();
    const handleSetFormData = vi.fn();

    renderComponent({ setFormData: handleSetFormData });

    const titleInput = screen.getByLabelText('Назва можливості *');

    await user.type(titleInput, '!');

    expect(handleSetFormData).toHaveBeenCalled();
    handleSetFormData.mockClear();

    const descInput = screen.getByLabelText('Опис, завдання та вимоги до кандидата *');

    await user.type(descInput, '!');

    expect(handleSetFormData).toHaveBeenCalled();
    handleSetFormData.mockClear();

    const contactInput = screen.getByLabelText('Контактні дані організатора *');

    await user.type(contactInput, '!');

    expect(handleSetFormData).toHaveBeenCalled();
    handleSetFormData.mockClear();

    const paymentTypeSelect = screen.getByLabelText('Тип винагороди');

    await user.selectOptions(paymentTypeSelect, 'PAID');

    expect(handleSetFormData).toHaveBeenCalled();
  });
});
