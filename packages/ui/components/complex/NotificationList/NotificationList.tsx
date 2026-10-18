import React, { useId } from 'react';
import clsx from 'clsx';
import { Empty, Tag } from '../../una';
import type { NotificationListProps } from './NotificationList.types';
import styles from './NotificationList.module.scss';

export const NotificationList: React.FC<NotificationListProps> = ({
  items,
  heading,
  emptyLabel,
  unreadItemLabel,
  unreadLabel,
  markAllReadLabel,
  className,
  isItemClickable,
  onItemClick,
  onMarkAllRead,
}) => {
  const headingId = useId();

  return (
    <section className={clsx(styles.notificationList, className)} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h2 id={headingId} className={styles.heading}>
            {heading}
          </h2>
          {unreadLabel && <Tag tone="info">{unreadLabel}</Tag>}
        </div>
        {markAllReadLabel && onMarkAllRead && (
          <button type="button" className={styles.markAllButton} onClick={onMarkAllRead}>
            {markAllReadLabel}
          </button>
        )}
      </header>

      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => {
            const content = (
              <>
                {!item.isRead && unreadItemLabel && (
                  <span className={styles.visuallyHidden}>{unreadItemLabel}</span>
                )}
                <span className={styles.title}>{item.title}</span>
                <span className={styles.message}>{item.message}</span>
                <time className={styles.time} dateTime={item.dateTime}>
                  {item.time}
                </time>
              </>
            );

            const isClickable = Boolean(
              onItemClick && (isItemClickable ? isItemClickable(item) : true),
            );

            return (
              <li key={item.id} className={clsx(styles.item, !item.isRead && styles.unread)}>
                {isClickable ? (
                  <button
                    type="button"
                    className={styles.itemButton}
                    onClick={() => {
                      onItemClick?.(item);
                    }}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={styles.itemContent}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty description={emptyLabel} />
      )}
    </section>
  );
};

export default NotificationList;
