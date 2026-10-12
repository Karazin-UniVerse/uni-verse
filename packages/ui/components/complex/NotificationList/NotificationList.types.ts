export type NotificationListItem = {
  id: number | string;
  title: string;
  message: string;
  time: string;
  dateTime: string;
  isRead: boolean;
};

export type NotificationListProps = {
  items: NotificationListItem[];
  heading: string;
  emptyLabel: string;
  unreadItemLabel?: string;
  unreadLabel?: string;
  className?: string;
};
