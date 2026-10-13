import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NotificationList } from './NotificationList';
import type { NotificationListItem } from './NotificationList.types';

const items: NotificationListItem[] = [
  {
    id: 1,
    title: 'New assignment',
    message: 'Lab 4 is available',
    time: '12 Sep 2026',
    dateTime: '2026-09-12T10:30:00.000Z',
    isRead: false,
  },
  {
    id: 2,
    title: 'Grade posted',
    message: 'Quiz 1 was graded',
    time: '10 Sep 2026',
    dateTime: '2026-09-10T16:05:00.000Z',
    isRead: true,
  },
];

describe('NotificationList Component', () => {
  it('renders a labelled region with a heading and a list of items', () => {
    const html = renderToString(
      <NotificationList items={items} heading="Notifications" emptyLabel="Nothing here" />,
    );

    expect(html).toContain('<section');
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
    expect(html).toContain('<h2');
    expect(html).toContain('Notifications');
    expect(html.match(/<li/g)).toHaveLength(2);
  });

  it('renders the timestamp in a machine-readable time element', () => {
    const html = renderToString(
      <NotificationList items={items} heading="Notifications" emptyLabel="Nothing here" />,
    );

    expect(html).toContain('<time');
    expect(html).toContain('dateTime="2026-09-12T10:30:00.000Z"');
    expect(html).toContain('12 Sep 2026');
  });

  it('announces only unread items to assistive technology', () => {
    const html = renderToString(
      <NotificationList
        items={items}
        heading="Notifications"
        emptyLabel="Nothing here"
        unreadItemLabel="Unread:"
      />,
    );

    expect(html.match(/Unread:/g)).toHaveLength(1);
  });

  it('shows the unread summary tag only when a label is provided', () => {
    const withLabel = renderToString(
      <NotificationList
        items={items}
        heading="Notifications"
        emptyLabel="Nothing here"
        unreadLabel="1 new"
      />,
    );
    const withoutLabel = renderToString(
      <NotificationList items={items} heading="Notifications" emptyLabel="Nothing here" />,
    );

    expect(withLabel).toContain('1 new');
    expect(withoutLabel).not.toContain('1 new');
  });

  it('renders the empty state instead of a list when there are no items', () => {
    const html = renderToString(
      <NotificationList items={[]} heading="Notifications" emptyLabel="Nothing here" />,
    );

    expect(html).toContain('Nothing here');
    expect(html).not.toContain('<ul');
  });
});
