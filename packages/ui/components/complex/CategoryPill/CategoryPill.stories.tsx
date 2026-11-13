import type { Meta, StoryObj } from '@storybook/react-vite';
import { Briefcase, Coins, Sparkles } from 'lucide-react';
import { CategoryPill } from './CategoryPill';

const meta = {
  title: 'Complex/CategoryPill',
  component: CategoryPill,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof CategoryPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PaidVacancy: Story = {
  args: {
    label: 'Вакансія',
    tone: 'success',
    icon: <Briefcase size={12} />,
  },
};

export const UnpaidPractice: Story = {
  args: {
    label: 'Практика',
    tone: 'info',
    icon: <Briefcase size={12} />,
  },
};

export const Compensation: Story = {
  args: {
    label: '10 000 грн / міс',
    tone: 'success',
    icon: <Coins size={12} />,
  },
};

export const ExperienceOnly: Story = {
  args: {
    label: 'Досвід',
    tone: 'neutral',
    icon: <Sparkles size={12} />,
  },
};
