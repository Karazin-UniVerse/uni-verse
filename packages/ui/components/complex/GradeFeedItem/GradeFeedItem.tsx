import React from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { GradeFeedItemProps } from './GradeFeedItem.types';
import styles from './GradeFeedItem.module.scss';

const scoreToneClassMap = {
  success: styles.toneSuccess,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  default: styles.toneDefault,
};

export const GradeFeedItem: React.FC<GradeFeedItemProps> = ({
  title,
  courseName,
  dateText,
  score,
  scoreBadgeClassName,
  onClick,
  titleTooltip,
  animationDelayMs,
  className,
  scoreTone = 'default',
}) => {
  const resolvedToneClass =
    scoreBadgeClassName || scoreToneClassMap[scoreTone] || styles.toneDefault;

  return (
    <button
      type="button"
      className={clsx(styles.feedItem, className)}
      onClick={onClick}
      style={animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : undefined}
      title={titleTooltip}
    >
      <div className={styles.feedItemMain}>
        <div className={styles.feedItemTitle}>{title}</div>
        <div className={styles.feedItemMeta}>
          <span className={styles.courseName}>{courseName}</span>
          <span className={styles.dotSeparator}>•</span>
          <span>{dateText}</span>
        </div>
      </div>

      <div className={styles.feedItemScore}>
        <span className={clsx(styles.scoreBadge, resolvedToneClass)}>{score}</span>
        <ChevronRight size={16} className={styles.chevronIcon} aria-hidden />
      </div>
    </button>
  );
};

export default GradeFeedItem;
