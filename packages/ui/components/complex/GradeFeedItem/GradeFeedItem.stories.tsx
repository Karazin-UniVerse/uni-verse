import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BREAKPOINTS } from '@universe/core/constants/breakpoints';

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
      <div style={{ width: `${BREAKPOINTS.xs}px`, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    scoreTone: {
      control: 'select',
      options: ['success', 'info', 'warning', 'danger', 'default'],
      description: 'Visual tone for the score badge',
    },
    title: {
      control: 'text',
      description: 'Assignment or task title',
    },
    courseName: {
      control: 'text',
      description: 'Course or subject name',
    },
    dateText: {
      control: 'text',
      description: 'Formatted date or deadline text',
    },
    score: {
      control: 'text',
      description: 'Score value or status text',
    },
  },
} satisfies Meta<typeof GradeFeedItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExcellentScore: Story = {
  args: {
    title: 'Lab 3: Database Normalization',
    courseName: 'Databases',
    dateText: 'Sep 12',
    score: '98 / 100',
    scoreTone: 'success',
  },
};

export const GoodScore: Story = {
  args: {
    title: 'Practical: Microservices Architecture',
    courseName: 'Software Engineering',
    dateText: 'Sep 10',
    score: '85 / 100',
    scoreTone: 'info',
  },
};

export const WarningScore: Story = {
  args: {
    title: 'Quiz 1: Operating Systems',
    courseName: 'Systems Programming',
    dateText: 'Sep 05',
    score: '68 / 100',
    scoreTone: 'warning',
  },
};

export const LowScore: Story = {
  args: {
    title: 'Midterm: Mathematical Analysis',
    courseName: 'Calculus',
    dateText: 'Sep 01',
    score: '52 / 100',
    scoreTone: 'danger',
  },
};

export const PassedStatus: Story = {
  args: {
    title: 'Credit: Physical Education',
    courseName: 'Sports',
    dateText: 'Aug 28',
    score: 'Passed',
    scoreTone: 'success',
  },
};
