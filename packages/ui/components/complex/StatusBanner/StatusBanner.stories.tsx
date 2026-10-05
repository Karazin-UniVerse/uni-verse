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
      description: 'Visual tone for the status banner',
    },
    children: {
      control: 'text',
      description: 'Banner content or message text',
    },
  },
} satisfies Meta<typeof StatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    tone: 'success',
    icon: '🟢',
    children: 'Admitted to the exam (45 / 60 pts — threshold of 30 pts reached)',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    icon: '🔴',
    children: 'Not admitted to the exam (22 / 60 pts — 8 pts needed to qualify)',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    icon: '⚠️',
    children: 'Notice: Submission deadline for the individual study plan ends in 2 days',
  },
};

export const Info: Story = {
  args: {
    tone: 'info',
    icon: 'ℹ️',
    children: 'Registration for elective courses in the spring semester is now open',
  },
};
