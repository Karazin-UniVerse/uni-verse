'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button, Dropdown } from '@una';
import { NotificationList, type NotificationListItem } from '@ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardHeaderProps } from '../types';
import { toNotificationListItem } from '../utils';
import { useNotificationActions } from '../hooks/useNotificationActions';
import styles from '@uni-hub/views/dashboard/layout/DashboardShell.module.scss';

export type NotificationsDropdownProps = Pick<
  DashboardHeaderProps,
  'notifications' | 'unreadCount'
>;

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  unreadCount,
}) => {
  const router = useRouter();
  const { localeTag, formatMessage } = useLanguage();
  const { markAsRead, markAllAsRead } = useNotificationActions();

  const handleItemClick = (item: NotificationListItem, close: () => void): void => {
    if (!item.isRead && typeof item.id === 'string') {
      void markAsRead(item.id);
    }

    if (item.link) {
      close();
      router.push(item.link);
    }
  };

  const handleMarkAllRead = (): void => {
    void markAllAsRead();
  };

  return (
    <Dropdown
      width={360}
      renderTrigger={(triggerProps) => (
        <Button
          {...triggerProps}
          type="button"
          variant="secondary"
          size="medium"
          isTransparent
          aria-label={formatMessage('header.notifications')}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </Button>
      )}
    >
      {(close) => (
        <NotificationList
          items={notifications.map((notification) =>
            toNotificationListItem(notification, localeTag, formatMessage),
          )}
          heading={formatMessage('header.notifications')}
          emptyLabel={formatMessage('header.notifications.empty')}
          unreadItemLabel={formatMessage('header.notifications.unreadItem')}
          markAllReadLabel={
            unreadCount > 0 ? formatMessage('header.notifications.markAllRead') : undefined
          }
          unreadLabel={
            unreadCount > 0
              ? formatMessage('header.unreadCount', { count: unreadCount })
              : undefined
          }
          onItemClick={(item) => {
            handleItemClick(item, close);
          }}
          onMarkAllRead={unreadCount > 0 ? handleMarkAllRead : undefined}
        />
      )}
    </Dropdown>
  );
};
