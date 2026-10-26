import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApplyOpportunityModal } from './ApplyOpportunityModal';
import type { ApplyOpportunityModalProps } from './ApplyOpportunityModal.types';
import { noop } from '@core/utils/fn';

function InteractiveApplyModal(props: ApplyOpportunityModalProps): React.ReactElement {
  const [motivation, setMotivation] = useState(props.motivation);
  const [contactInfo, setContactInfo] = useState(props.contactInfo);

  return (
    <ApplyOpportunityModal
      {...props}
      motivation={motivation}
      onMotivationChange={setMotivation}
      contactInfo={contactInfo}
      onContactInfoChange={setContactInfo}
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit(event);
      }}
    />
  );
}

const meta = {
  title: 'Complex/ApplyOpportunityModal',
  component: ApplyOpportunityModal,
  tags: ['autodocs'],
  render: (args) => <InteractiveApplyModal {...args} />,
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onClose: noop,
    onSubmit: noop,
    title: 'Подати заявку: Front-end Intern (React)',
    motivation: '',
    onMotivationChange: noop,
    contactInfo: '',
    onContactInfoChange: noop,
    submitting: false,
    motivationLabel: 'Мотиваційний лист / коментар',
    motivationPlaceholder: 'Опишіть, чому вас зацікавила ця можливість та ваш досвід...',
    contactLabel: 'Альтернативний контакт',
    contactPlaceholder: '@username або +380...',
    contactHint: 'Пошту з вашого профілю буде показано автоматично.',
    cancelText: 'Скасувати',
    submitText: 'Подати заявку',
    submittingText: 'Надсилання...',
  },
} satisfies Meta<typeof ApplyOpportunityModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    motivation: 'Маю досвід розробки на React та TypeScript, готовий долучитися до команди.',
    contactInfo: '@telegram_user',
  },
};

export const Submitting: Story = {
  args: {
    motivation: 'Готовий до співбесіди та тестового завдання.',
    contactInfo: '+380501234567',
    submitting: true,
  },
};

export const WithoutAlternativeContact: Story = {
  args: {
    motivation: 'Хочу долучитися до проєкту, маю досвід із React.',
    contactInfo: '',
  },
};
