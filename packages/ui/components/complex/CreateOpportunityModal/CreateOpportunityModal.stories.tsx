import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateOpportunityModal } from './CreateOpportunityModal';
import type {
  CreateOpportunityFormData,
  CreateOpportunityModalProps,
} from './CreateOpportunityModal.types';
import { noop } from '@core/utils/fn';

const defaultFormData: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: 'UNPAID',
  paymentDetails: '',
};

function InteractiveCreateModal(props: CreateOpportunityModalProps): React.ReactElement {
  const [formData, setFormData] = useState<CreateOpportunityFormData>(props.formData);

  return (
    <CreateOpportunityModal
      {...props}
      formData={formData}
      setFormData={setFormData}
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit(event);
      }}
    />
  );
}

const meta = {
  title: 'Complex/CreateOpportunityModal',
  component: CreateOpportunityModal,
  tags: ['autodocs'],
  render: (args) => <InteractiveCreateModal {...args} />,
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onClose: noop,
    onSubmit: noop,
    formData: defaultFormData,
    setFormData: noop,
    submitting: false,
    title: 'Створити можливість',
    titleLabel: 'Назва можливості',
    titlePlaceholder: 'Наприклад: Стажування у лабораторії біоінформатики',
    descLabel: 'Детальний опис',
    descPlaceholder: 'Вимоги, задачі, очікувані результати та графік роботи...',
    contactLabel: 'Альтернативний контакт',
    contactPlaceholder: 'Email, телефон або Telegram для зв’язку зі студентами',
    contactHint: 'Пошту з вашого профілю буде показано автоматично.',
    paymentTypeLabel: 'Тип винагороди',
    paymentDetailsLabel: 'Розмір або деталі оплати',
    paymentDetailsPlaceholder: 'Наприклад: 15 000 грн/міс або стипендіальна програма',
    unpaidOptionLabel: 'Без оплати / волонтерство',
    paidOptionLabel: 'Оплачувана',
    phaseLabel: 'Фаза',
    lifecycleOptions: [
      { value: 'START', label: 'Старт' },
      { value: 'ACTIVE', label: 'Активна фаза' },
      { value: 'COMPLETED', label: 'Завершено' },
    ],
    acceptsApplicationsLabel: 'Приймати нові відгуки',
    cancelText: 'Скасувати',
    submitText: 'Створити чернетку',
    savingText: 'Збереження...',
  },
} satisfies Meta<typeof CreateOpportunityModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PaidWithDetails: Story = {
  args: {
    formData: {
      title: 'Full-stack Developer (Node.js + React)',
      description: 'Розробка університетського порталу відкритих можливостей для студентів.',
      ownerContactInfo: 'hr@karazin.ua',
      paymentType: 'PAID',
      paymentDetails: '20 000 грн/місяць',
    },
  },
};

export const Submitting: Story = {
  args: {
    formData: {
      title: 'UI/UX Дизайнер',
      description: 'Створення дизайн-системи та прототипів.',
      ownerContactInfo: 'design@karazin.ua',
      paymentType: 'UNPAID',
      paymentDetails: '',
    },
    submitting: true,
  },
};

export const WithoutAlternativeContact: Story = {
  args: {
    formData: {
      ...defaultFormData,
      title: 'Дослідницький проєкт',
      description: 'Запрошуємо студентів долучитися до досліджень.',
    },
  },
};
