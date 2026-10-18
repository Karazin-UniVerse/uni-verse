import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
    link: '/opportunities/opp-1',
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
  it('should render a labelled region with a heading and a list of items', () => {
    render(<NotificationList items={items} heading="Notifications" emptyLabel="Nothing here" />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Notifications' });

    expect(heading).toBeInTheDocument();

    const region = screen.getByRole('region', { name: 'Notifications' });

    expect(region).toBeInTheDocument();

    const listItems = screen.getAllByRole('listitem');

    expect(listItems).toHaveLength(2);
  });

  it('should render the timestamp in a machine-readable time element', () => {
    render(<NotificationList items={items} heading="Notifications" emptyLabel="Nothing here" />);

    const timeElement = screen.getByText('12 Sep 2026');

    expect(timeElement.tagName.toLowerCase()).toBe('time');
    expect(timeElement).toHaveAttribute('dateTime', '2026-09-12T10:30:00.000Z');
  });

  it('should announce only unread items to assistive technology', () => {
    render(
      <NotificationList
        items={items}
        heading="Notifications"
        emptyLabel="Nothing here"
        unreadItemLabel="Unread:"
      />,
    );

    const unreadAnnouncements = screen.getAllByText('Unread:');

    expect(unreadAnnouncements).toHaveLength(1);
  });

  it('should show the unread summary tag only when a label is provided', () => {
    const { rerender } = render(
      <NotificationList
        items={items}
        heading="Notifications"
        emptyLabel="Nothing here"
        unreadLabel="1 new"
      />,
    );

    expect(screen.getByText('1 new')).toBeInTheDocument();

    rerender(<NotificationList items={items} heading="Notifications" emptyLabel="Nothing here" />);
    expect(screen.queryByText('1 new')).not.toBeInTheDocument();
  });

  it('should render the empty state instead of a list when there are no items', () => {
    render(<NotificationList items={[]} heading="Notifications" emptyLabel="Nothing here" />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should call onItemClick when a notification item is clicked', () => {
    const onItemClick = vi.fn();

    render(
      <NotificationList
        items={items}
        heading="Notifications"
        emptyLabel="Nothing here"
        onItemClick={onItemClick}
      />,
    );

    const firstItemButton = screen.getByRole('button', { name: /New assignment/i });

    fireEvent.click(firstItemButton);

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(items[0]);
  });

  it('should render mark all read button and call onMarkAllRead on click', () => {
    const onMarkAllRead = vi.fn();

    render(
      <NotificationList
        items={items}
        heading="Notifications"
        emptyLabel="Nothing here"
        markAllReadLabel="Mark all as read"
        onMarkAllRead={onMarkAllRead}
      />,
    );

    const markAllButton = screen.getByRole('button', { name: 'Mark all as read' });

    expect(markAllButton).toBeInTheDocument();

    fireEvent.click(markAllButton);

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });
});
