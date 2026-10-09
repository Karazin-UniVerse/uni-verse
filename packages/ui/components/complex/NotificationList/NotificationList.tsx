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
  className,
}) => {
  const headingId = useId();

  return (
    <section className={clsx(styles.notificationList, className)} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
        {unreadLabel && <Tag tone="info">{unreadLabel}</Tag>}
      </header>

      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={clsx(styles.item, !item.isRead && styles.unread)}>
              {!item.isRead && unreadItemLabel && (
                <span className={styles.visuallyHidden}>{unreadItemLabel}</span>
              )}
              <p className={styles.title}>{item.title}</p>
              <p className={styles.message}>{item.message}</p>
              <time className={styles.time} dateTime={item.dateTime}>
                {item.time}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <Empty description={emptyLabel} />
      )}
    </section>
  );
};

export default NotificationList;
