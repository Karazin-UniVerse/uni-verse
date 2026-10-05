import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { GradeFeedItem } from './GradeFeedItem';

const meta = {
  title: 'Complex/GradeFeedItem',
  component: GradeFeedItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '420px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    scoreTone: {
      control: 'select',
      options: ['success', 'info', 'warning', 'danger', 'default'],
      description: 'Тон бейджа оцінки',
    },
    title: {
      control: 'text',
      description: 'Назва завдання',
    },
    courseName: {
      control: 'text',
      description: 'Назва дисципліни',
    },
    dateText: {
      control: 'text',
      description: 'Текст дати або дедлайну',
    },
    score: {
      control: 'text',
      description: 'Значення оцінки або статус',
    },
  },
} satisfies Meta<typeof GradeFeedItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExcellentScore: Story = {
  args: {
    title: 'Лабораторна робота №3: Нормалізація БД',
    courseName: 'Бази даних',
    dateText: '12 вер.',
    score: '98 / 100',
    scoreTone: 'success',
  },
};

export const GoodScore: Story = {
  args: {
    title: 'Практичне завдання: Архітектура мікросервісів',
    courseName: 'Розробка ПЗ',
    dateText: '10 вер.',
    score: '85 / 100',
    scoreTone: 'info',
  },
};

export const WarningScore: Story = {
  args: {
    title: 'Тест 1: Операційні системи',
    courseName: 'Системне програмування',
    dateText: '05 вер.',
    score: '68 / 100',
    scoreTone: 'warning',
  },
};

export const LowScore: Story = {
  args: {
    title: 'Контрольна робота: Математичний аналіз',
    courseName: 'Вища математика',
    dateText: '01 вер.',
    score: '52 / 100',
    scoreTone: 'danger',
  },
};

export const PassedStatus: Story = {
  args: {
    title: 'Залік: Фізичне виховання',
    courseName: 'Спорт',
    dateText: '28 серп.',
    score: 'Зараховано',
    scoreTone: 'success',
  },
};
