import React from 'react';
import clsx from 'clsx';
import { ExternalLink } from 'lucide-react';
import type { ActionCardProps } from './ActionCard.types';
import styles from './ActionCard.module.scss';

const iconToneClassMap = {
  default: styles.iconDefault,
  moodle: styles.iconMoodle,
  assignments: styles.iconAssignments,
  schedule: styles.iconSchedule,
  dean: styles.iconDean,
  opportunities: styles.iconOpportunities,
};

const badgeToneClassMap = {
  default: styles.badgeDefault,
  info: styles.badgeInfo,
  alert: styles.badgeAlert,
};

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  badge,
  href,
  target,
  rel,
  isExternal,
  onClick,
  className,
  cardTitle,
  iconTone = 'default',
  badgeTone = 'default',
}) => {
  const iconClass = iconToneClassMap[iconTone] || styles.iconDefault;
  const badgeClass = badgeToneClassMap[badgeTone] || styles.badgeDefault;

  const content = (
    <>
      <div className={clsx(styles.iconWrapper, iconClass)}>{icon}</div>
      <div className={styles.actionBody}>
        <div className={styles.actionTitleRow}>
          <span className={styles.actionTitle}>{title}</span>
          {badge !== undefined && badge !== null && (
            <span className={clsx(styles.badge, badgeClass)}>{badge}</span>
          )}
        </div>
        <span className={styles.actionDescription}>{description}</span>
      </div>
      {isExternal && <ExternalLink size={16} className={styles.externalIcon} aria-hidden />}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={clsx(styles.actionCard, className)}
        title={cardTitle}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={clsx(styles.actionCard, className)}
      title={cardTitle}
      onClick={onClick}
    >
      {content}
    </button>
  );
};

export default ActionCard;
