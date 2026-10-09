'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Button, Dropdown } from '@una';
import { NotificationList } from '@ui';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { DashboardHeaderProps } from '../types';
import { toNotificationListItem } from '../utils';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export type NotificationsDropdownProps = Pick<
  DashboardHeaderProps,
  'notifications' | 'unreadCount'
>;

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  unreadCount,
}) => {
  const { localeTag, formatMessage } = useLanguage();

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
      <NotificationList
        items={notifications.map((notification) => toNotificationListItem(notification, localeTag))}
        heading={formatMessage('header.notifications')}
        emptyLabel={formatMessage('header.notifications.empty')}
        unreadItemLabel={formatMessage('header.notifications.unreadItem')}
        unreadLabel={
          unreadCount > 0 ? formatMessage('header.unreadCount', { count: unreadCount }) : undefined
        }
      />
    </Dropdown>
  );
};
