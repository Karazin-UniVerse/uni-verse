import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail, Phone, Clock, Send } from 'lucide-react';
import { BREAKPOINTS } from '@universe/core/constants/breakpoints';

import { ContactInfoGrid } from './ContactInfoGrid';

const sampleItems = [
  {
    id: 'email',
    icon: <Mail size={16} />,
    label: 'Email:',
    value: 'dean.cs@karazin.ua',
  },
  {
    id: 'phone',
    icon: <Phone size={16} />,
    label: 'Phone:',
    value: '+38 (057) 707-55-55',
  },
  {
    id: 'schedule',
    icon: <Clock size={16} />,
    label: 'Office hours:',
    value: 'Mon-Fri: 09:00 - 17:00',
  },
  {
    id: 'telegram',
    icon: <Send size={16} />,
    label: 'Telegram:',
    value: '@karazin_edean',
  },
];

const meta = {
  title: 'Complex/ContactInfoGrid',
  component: ContactInfoGrid,
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
    items: {
      description: 'Array of contact information entries (icon, label, value)',
    },
  },
} satisfies Meta<typeof ContactInfoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: sampleItems,
  },
};
