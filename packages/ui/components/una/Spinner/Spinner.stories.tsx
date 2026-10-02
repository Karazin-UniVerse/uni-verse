import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Spinner } from './Spinner';

const meta = {
  title: 'Una/Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Розмір спінера',
    },
    tip: {
      control: 'text',
      description: 'Текстовий підпис під спінером',
    },
    ariaLabel: {
      control: 'text',
      description: 'Доступна назва для зчитувачів екрана',
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const WithTip: Story = {
  args: {
    size: 'medium',
    tip: 'Завантаження даних розкладу...',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      <Spinner size="small" />
      <Spinner size="medium" />
      <Spinner size="large" />
    </div>
  ),
};
