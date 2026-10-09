import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BREAKPOINTS } from '@universe/core/constants/breakpoints';

import { NotificationList } from './NotificationList';
import type { NotificationListItem } from './NotificationList.types';

const items: NotificationListItem[] = [
  {
    id: 1,
    title: 'New assignment: Lab 4',
    message: 'The assignment "Database Normalization" is now available in the course Databases.',
    time: '12 Sep 2026, 10:30',
    dateTime: '2026-09-12T10:30:00.000Z',
    isRead: false,
  },
  {
    id: 2,
    title: 'Grade posted',
    message: 'Your grade for "Quiz 1" has been published.',
    time: '10 Sep 2026, 16:05',
    dateTime: '2026-09-10T16:05:00.000Z',
    isRead: false,
  },
  {
    id: 3,
    title: 'Deadline extended',
    message: 'The deadline for "Practical 2" was moved to the end of the week.',
    time: '08 Sep 2026, 09:12',
    dateTime: '2026-09-08T09:12:00.000Z',
    isRead: true,
  },
];

const meta = {
  title: 'Complex/NotificationList',
  component: NotificationList,
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
    heading: {
      control: 'text',
      description: 'Visible heading that also names the list region',
    },
    emptyLabel: {
      control: 'text',
      description: 'Text shown when there are no notifications',
    },
    unreadLabel: {
      control: 'text',
      description: 'Summary tag in the header, for example "2 new". Hidden when omitted',
    },
    unreadItemLabel: {
      control: 'text',
      description: 'Screen-reader-only text announced before each unread item',
    },
  },
} satisfies Meta<typeof NotificationList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items,
    heading: 'Notifications',
    emptyLabel: 'No notifications',
    unreadLabel: '2 new',
    unreadItemLabel: 'Unread:',
  },
};

export const AllRead: Story = {
  args: {
    items: items.map((item) => ({ ...item, isRead: true })),
    heading: 'Notifications',
    emptyLabel: 'No notifications',
  },
};

export const Empty: Story = {
  args: {
    items: [],
    heading: 'Notifications',
    emptyLabel: 'No notifications',
  },
};

export const ScrollableList: Story = {
  args: {
    items: Array.from({ length: 12 }, (_, index) => ({
      ...items[index % items.length]!,
      id: index + 1,
    })),
    heading: 'Notifications',
    emptyLabel: 'No notifications',
    unreadLabel: '8 new',
    unreadItemLabel: 'Unread:',
  },
};
