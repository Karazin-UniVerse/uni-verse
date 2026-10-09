import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Globe, FileText, Calendar, Building2 } from 'lucide-react';
import { BREAKPOINTS } from '@universe/core/constants/breakpoints';

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
      <div style={{ width: `${BREAKPOINTS.xs}px`, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    iconTone: {
      control: 'select',
      options: ['default', 'moodle', 'assignments', 'schedule', 'dean', 'opportunities'],
      description: 'Color tone of the icon wrapper',
    },
    badgeTone: {
      control: 'select',
      options: ['default', 'info', 'alert'],
      description: 'Color tone of the optional badge',
    },
    title: {
      control: 'text',
      description: 'Title of the action card',
    },
    description: {
      control: 'text',
      description: 'Short description of the action',
    },
    badge: {
      control: 'text',
      description: 'Badge label or counter value',
    },
    isExternal: {
      control: 'boolean',
      description: 'Whether the action links to an external resource',
    },
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Class Schedule',
    description: 'View upcoming classes and deadlines',
    icon: <Calendar size={22} />,
    iconTone: 'schedule',
  },
};

export const WithAlertBadge: Story = {
  args: {
    title: 'My Assignments',
    description: '3 assignments pending submission',
    icon: <FileText size={22} />,
    iconTone: 'assignments',
    badge: 3,
    badgeTone: 'alert',
  },
};

export const ExternalLinkCard: Story = {
  args: {
    title: 'Moodle LMS',
    description: 'Access university learning portal',
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
    title: "Dean's Office Online",
    description: 'Contact administration and request certificates',
    icon: <Building2 size={22} />,
    iconTone: 'dean',
  },
};
