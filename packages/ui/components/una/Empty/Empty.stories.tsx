import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Inbox, SearchX } from 'lucide-react';

import { Empty } from './Empty';

const meta = {
  title: 'Una/Feedback/Empty',
  component: Empty,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    description: {
      control: 'text',
      description: 'Текстовий опис для порожнього стану',
    },
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomDescription: Story = {
  args: {
    description: 'Нічого не знайдено за вашим запитом',
  },
};

export const WithInboxIcon: Story = {
  args: {
    description: 'Вхідних повідомлень немає',
    icon: <Inbox size={48} aria-hidden />,
  },
};

export const SearchEmpty: Story = {
  args: {
    description: 'За вказаними фільтрами результатів не знайдено',
    icon: <SearchX size={48} aria-hidden />,
  },
};
