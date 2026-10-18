import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Notification } from '@core/types/moodle';
import { NotificationsDropdown } from './NotificationsDropdown';

const mockPush = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    isPending: false,
  }),
}));

const notifications: Notification[] = [
  {
    id: 'plat-1',
    subject: 'Opportunity Application',
    message: 'Someone applied',
    link: '/opportunities/opp-123',
    timecreated: 1_700_000_000,
    read: false,
  },
  {
    id: 1,
    subject: 'Нове завдання',
    fullmessage: '<p>Перевірте курс</p>',
    timecreated: 1_700_000_000,
    read: true,
  },
];

describe('NotificationsDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a collapsed trigger with an accessible name', () => {
    render(<NotificationsDropdown notifications={notifications} unreadCount={0} />);

    const trigger = screen.getByRole('button', { name: /сповіщення/i });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should show the unread count badge only when there are unread notifications', () => {
    const { rerender } = render(
      <NotificationsDropdown notifications={notifications} unreadCount={3} />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(<NotificationsDropdown notifications={notifications} unreadCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should keep the notification list hidden until the dropdown is opened', () => {
    render(<NotificationsDropdown notifications={notifications} unreadCount={1} />);

    expect(screen.queryByText('Opportunity Application')).not.toBeInTheDocument();
    expect(screen.queryByText('Немає сповіщень')).not.toBeInTheDocument();
  });

  it('should mark as read and navigate when an item with link is clicked', () => {
    render(<NotificationsDropdown notifications={notifications} unreadCount={1} />);

    const trigger = screen.getByRole('button', { name: /сповіщення/i });

    fireEvent.click(trigger);

    const itemButton = screen.getByRole('button', { name: /Opportunity Application/i });

    fireEvent.click(itemButton);

    expect(mockMarkAsRead).toHaveBeenCalledWith('plat-1');
    expect(mockPush).toHaveBeenCalledWith('/opportunities/opp-123');
    expect(
      screen.queryByRole('button', { name: /Opportunity Application/i }),
    ).not.toBeInTheDocument();
  });

  it('should call markAllAsRead when mark all button is clicked', () => {
    render(<NotificationsDropdown notifications={notifications} unreadCount={1} />);

    const trigger = screen.getByRole('button', { name: /сповіщення/i });

    fireEvent.click(trigger);

    const markAllButton = screen.getByRole('button', { name: /Позначити всі як прочитані/i });

    fireEvent.click(markAllButton);

    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });
});
