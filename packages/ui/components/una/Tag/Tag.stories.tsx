import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Tag } from './Tag';

const meta = {
  title: 'Una/DataDisplay/Tag',
  component: Tag,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['default', 'neutral', 'success', 'warning', 'info', 'danger'],
      description: 'Колірний тон тегу',
    },
    children: {
      control: 'text',
      description: 'Вміст тегу',
    },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'За замовчуванням',
    tone: 'default',
  },
};

export const Neutral: Story = {
  args: {
    children: 'Нейтральний',
    tone: 'neutral',
  },
};

export const Success: Story = {
  args: {
    children: 'Успішно',
    tone: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Попередження',
    tone: 'warning',
  },
};

export const Info: Story = {
  args: {
    children: 'Інформація',
    tone: 'info',
  },
};

export const Danger: Story = {
  args: {
    children: 'Помилка',
    tone: 'danger',
  },
};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Tag tone="default">Default</Tag>
      <Tag tone="neutral">Neutral</Tag>
      <Tag tone="info">Info</Tag>
      <Tag tone="success">Success</Tag>
      <Tag tone="warning">Warning</Tag>
      <Tag tone="danger">Danger</Tag>
    </div>
  ),
};
