import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Award, CalendarDays, BookOpen } from 'lucide-react';
import { ConnectMoodleView } from './ConnectMoodleView';

const meta = {
  title: 'Complex/ConnectMoodleView',
  component: ConnectMoodleView,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    connectCtaLabel: { control: 'text' },
    openMoodleLabel: { control: 'text' },
    moodleUrl: { control: 'text' },
  },
} satisfies Meta<typeof ConnectMoodleView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Підключення акаунту Moodle LMS',
    subtitle: 'Отримайте повну синхронізацію навчального процесу в один клік.',
    connectCtaLabel: 'Підключити Moodle зараз',
    openMoodleLabel: 'Відкрити Moodle LMS',
    onConnect: () => {},
    features: [
      {
        id: 'grades',
        icon: <Award size={20} />,
        title: 'Синхронізація оцінок',
        description: 'Ваша заліковка завжди під рукою з автоматичним розрахунком ECTS.',
      },
      {
        id: 'deadlines',
        icon: <CalendarDays size={20} />,
        title: 'Дедлайни та завдання',
        description: 'Слідкуйте за дедлайнами лабораторних та практичних робіт.',
      },
      {
        id: 'courses',
        icon: <BookOpen size={20} />,
        title: 'Матеріали та курси',
        description: 'Швидкий доступ до навчальних матеріалів кожного курсу.',
      },
    ],
  },
};
