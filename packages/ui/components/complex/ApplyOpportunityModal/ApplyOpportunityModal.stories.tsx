import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ApplyOpportunityModal } from './ApplyOpportunityModal';
import type { ApplyOpportunityModalProps } from './ApplyOpportunityModal.types';

const meta = {
  title: 'Complex/ApplyOpportunityModal',
  component: ApplyOpportunityModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    title: 'Подати заявку: Front-end Intern (React)',
    motivation: '',
    onMotivationChange: () => {},
    contactInfo: '',
    onContactInfoChange: () => {},
    submitting: false,
    motivationLabel: 'Мотиваційний лист / коментар',
    motivationPlaceholder: 'Опишіть, чому вас зацікавила ця можливість та ваш досвід...',
    contactLabel: 'Контактні дані для зв’язку',
    contactPlaceholder: 'Telegram, телефон або додатковий email',
    cancelText: 'Скасувати',
    submitText: 'Подати заявку',
    submittingText: 'Надсилання...',
  },
} satisfies Meta<typeof ApplyOpportunityModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: ApplyOpportunityModalProps) => {
      const [motivation, setMotivation] = useState(props.motivation);
      const [contactInfo, setContactInfo] = useState(props.contactInfo);

      return (
        <ApplyOpportunityModal
          {...props}
          motivation={motivation}
          onMotivationChange={setMotivation}
          contactInfo={contactInfo}
          onContactInfoChange={setContactInfo}
          onSubmit={(e) => {
            e.preventDefault();
            props.onSubmit(e);
          }}
        />
      );
    };

    return <InteractiveWrapper {...args} />;
  },
};

export const Filled: Story = {
  args: {
    motivation: 'Маю досвід розробки на React та TypeScript, готовий долучитися до команди.',
    contactInfo: '@telegram_user | user@karazin.ua',
  },
};

export const Submitting: Story = {
  args: {
    motivation: 'Готовий до співбесіди та тестового завдання.',
    contactInfo: '+380501234567',
    submitting: true,
  },
};
