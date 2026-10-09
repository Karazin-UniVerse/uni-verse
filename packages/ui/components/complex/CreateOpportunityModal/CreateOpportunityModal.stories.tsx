import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CreateOpportunityModal } from './CreateOpportunityModal';
import type {
  CreateOpportunityFormData,
  CreateOpportunityModalProps,
} from './CreateOpportunityModal.types';

const defaultFormData: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: 'UNPAID',
  paymentDetails: '',
};

const meta = {
  title: 'Complex/CreateOpportunityModal',
  component: CreateOpportunityModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    formData: defaultFormData,
    setFormData: () => {},
    submitting: false,
  },
} satisfies Meta<typeof CreateOpportunityModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: CreateOpportunityModalProps) => {
      const [formData, setFormData] = useState<CreateOpportunityFormData>(props.formData);

      return (
        <CreateOpportunityModal
          {...props}
          formData={formData}
          setFormData={setFormData}
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

export const PaidWithDetails: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: CreateOpportunityModalProps) => {
      const [formData, setFormData] = useState<CreateOpportunityFormData>({
        title: 'Full-stack Developer (Node.js + React)',
        description: 'Розробка університетського порталу відкритих можливостей для студентів.',
        ownerContactInfo: 'hr@karazin.ua',
        paymentType: 'PAID',
        paymentDetails: '20 000 грн/місяць',
      });

      return (
        <CreateOpportunityModal
          {...props}
          formData={formData}
          setFormData={setFormData}
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
