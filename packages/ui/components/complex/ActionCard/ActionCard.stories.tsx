import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Globe, FileText, Calendar, Building2 } from 'lucide-react';

import { ActionCard } from './ActionCard';

const meta = {
  title: 'Complex/ActionCard',
  component: ActionCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    iconTone: {
      control: 'select',
      options: ['default', 'moodle', 'assignments', 'schedule', 'dean'],
      description: 'Колірний тон іконки',
    },
    badgeTone: {
      control: 'select',
      options: ['default', 'info', 'alert'],
      description: 'Колірний тон бейджа',
    },
    title: {
      control: 'text',
      description: 'Заголовок картки дії',
    },
    description: {
      control: 'text',
      description: 'Опис дії',
    },
    badge: {
      control: 'text',
      description: 'Текст або число у бейджі',
    },
    isExternal: {
      control: 'boolean',
      description: 'Чи є посилання зовнішнім',
    },
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Розклад занять',
    description: 'Перегляд пар та дедлайнів',
    icon: <Calendar size={22} />,
    iconTone: 'schedule',
  },
};

export const WithAlertBadge: Story = {
  args: {
    title: 'Мої завдання',
    description: '3 завдання очікують на здачу',
    icon: <FileText size={22} />,
    iconTone: 'assignments',
    badge: 3,
    badgeTone: 'alert',
  },
};

export const ExternalLinkCard: Story = {
  args: {
    title: 'Moodle LMS',
    description: 'Перехід до навчального порталу',
    icon: <Globe size={22} />,
    iconTone: 'moodle',
    badge: 'Moodle',
    badgeTone: 'info',
    href: 'https://moodle.karazin.ua',
    target: '_blank',
    isExternal: true,
  },
};

export const DeanContactCard: Story = {
  args: {
    title: 'Деканат онлайн',
    description: 'Звʼязок з адміністрацією та довідки',
    icon: <Building2 size={22} />,
    iconTone: 'dean',
  },
};
