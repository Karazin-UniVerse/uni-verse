export type NotificationListItem = {
  id: number | string;
  title: string;
  message: string;
  time: string;
  dateTime: string;
  isRead: boolean;
  link?: string;
};

export type NotificationListProps = {
  items: NotificationListItem[];
  heading: string;
  emptyLabel: string;
  unreadItemLabel?: string;
  unreadLabel?: string;
  markAllReadLabel?: string;
  className?: string;
  isItemClickable?: (item: NotificationListItem) => boolean;
  onItemClick?: (item: NotificationListItem) => void;
  onMarkAllRead?: () => void;
};
