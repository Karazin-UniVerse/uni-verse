'use client';

import React, { useMemo } from 'react';
import type { Assignment } from '@uni-hub/types';
import type { TimeOfDay } from '@uni-hub/constants/gamification';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { useNow } from '@uni-hub/hooks/useNow';
import styles from './ContextualGreeting.module.scss';

type ContextualGreetingProps = {
  assignments: Assignment[];
};

const GREETING_KEYS: Record<TimeOfDay, TranslationKey> = {
  morning: 'greeting.morning',
  day: 'greeting.day',
  evening: 'greeting.evening',
  night: 'greeting.night',
};

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'day';
  }

  if (hour >= 18 && hour < 22) {
    return 'evening';
  }

  return 'night';
}

export const ContextualGreeting: React.FC<ContextualGreetingProps> = ({ assignments }) => {
  const { formatMessage } = useLanguage();
  const nowMs = useNow(30000);
  const hour = new Date(nowMs).getHours();
  const nowSec = Math.floor(nowMs / 1000);

  const timeOfDay = getTimeOfDay(hour);

  const cta = useMemo(() => {
    const upcoming = assignments
      .filter((assignment) => assignment.duedate > nowSec)
      .sort((a, b) => a.duedate - b.duedate);

    if (upcoming.length === 0) {
      return formatMessage('greeting.noDeadlines');
    }

    const nearest = upcoming[0];
    const hoursLeft = Math.max(1, Math.ceil((nearest.duedate - nowSec) / 3600));
    const prefix = formatMessage('greeting.deadlinePrefix');
    const prefixStr = prefix ? `${prefix} ` : '';

    return `${prefixStr}«${nearest.name}» ${formatMessage('greeting.deadlineRemaining')} ${hoursLeft} ${formatMessage('greeting.hours')} ${formatMessage('greeting.willMakeIt')}`;
  }, [assignments, nowSec, formatMessage]);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.hello}>
        {formatMessage(GREETING_KEYS[timeOfDay])}, {formatMessage('greeting.student')}
      </h2>
      <p className={styles.cta}>{cta}</p>
    </div>
  );
};
