import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Notification } from '@uni-hub/types';
import { NotificationsDropdown } from './NotificationsDropdown';

const notifications: Notification[] = [
  {
    id: 1,
    subject: 'Нове завдання',
    message: '<p>Перевірте курс</p>',
    timecreated: 0,
    read: false,
  },
];

describe('NotificationsDropdown', () => {
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

    expect(screen.queryByText('Нове завдання')).not.toBeInTheDocument();
    expect(screen.queryByText('Немає сповіщень')).not.toBeInTheDocument();
  });
});
