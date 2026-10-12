import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
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

function renderNotifications(unreadCount: number): string {
  return renderToString(React.createElement(NotificationsDropdown, { notifications, unreadCount }));
}

describe('NotificationsDropdown', () => {
  it('renders a collapsed trigger with an accessible name', () => {
    const html = renderNotifications(0);

    expect(html).toContain('aria-label="Сповіщення"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('shows the unread count badge only when there are unread notifications', () => {
    expect(renderNotifications(3)).toContain('>3</span>');
    expect(renderNotifications(0)).not.toContain('>0</span>');
  });

  it('keeps the notification list hidden until the dropdown is opened', () => {
    const html = renderNotifications(1);

    expect(html).not.toContain('Нове завдання');
    expect(html).not.toContain('Немає сповіщень');
  });
});
