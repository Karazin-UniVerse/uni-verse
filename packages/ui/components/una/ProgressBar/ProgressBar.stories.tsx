import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Una/Feedback/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Поточне значення прогресу',
    },
    max: {
      control: { type: 'number' },
      description: 'Максимальне можливе значення шкали (за замовчуванням 100)',
    },
    tone: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'danger'],
      description: 'Колірний тон індикатора',
    },
    ariaLabel: {
      control: 'text',
      description: 'Доступна назва для зчитувачів екрана',
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    value: 45,
    tone: 'info',
  },
};

export const Success: Story = {
  args: {
    value: 100,
    tone: 'success',
  },
};

export const Warning: Story = {
  args: {
    value: 65,
    tone: 'warning',
  },
};

export const Danger: Story = {
  args: {
    value: 20,
    tone: 'danger',
  },
};

export const ZeroProgress: Story = {
  args: {
    value: 0,
    tone: 'info',
  },
};

export const CustomMax: Story = {
  args: {
    value: 15,
    max: 20,
    tone: 'success',
    ariaLabel: '15 з 20 завдань виконано',
  },
};
