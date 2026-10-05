import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { StatusBanner } from './StatusBanner';

const meta = {
  title: 'Complex/StatusBanner',
  component: StatusBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '480px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    tone: {
      control: 'select',
      options: ['success', 'danger', 'warning', 'info'],
      description: 'Колірний тон банера',
    },
    children: {
      control: 'text',
      description: 'Текст або вміст повідомлення',
    },
  },
} satisfies Meta<typeof StatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    tone: 'success',
    icon: '🟢',
    children: 'Допущено до іспиту (45 / 60 б. — поріг допуску 30 б. досягнуто)',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    icon: '🔴',
    children: 'Не допущено до іспиту (22 / 60 б. — бракує 8 б. для допуску)',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    icon: '⚠️',
    children: 'Увага: кінцевий термін подання індивідуального плану спливає через 2 дні',
  },
};

export const Info: Story = {
  args: {
    tone: 'info',
    icon: 'ℹ️',
    children: 'Розпочато реєстрацію на вибіркові дисципліни весняного семестру',
  },
};
