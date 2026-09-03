import React, { useMemo } from 'react';
import type { Assignment } from '../../types';
import type { TimeOfDay } from '../../gamification/types';
import { useNow } from '../../hooks/useNow';
import styles from './ContextualGreeting.module.scss';

type ContextualGreetingProps = {
  assignments: Assignment[];
};

const GREETINGS: Record<TimeOfDay, string> = {
  morning: 'Доброе утро',
  day: 'Добрый день',
  evening: 'Добрый вечер',
  night: 'Доброй ночи',
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
  const nowMs = useNow(30000);
  const hour = new Date(nowMs).getHours();
  const nowSec = Math.floor(nowMs / 1000);

  const timeOfDay = getTimeOfDay(hour);

  const cta = useMemo(() => {
    const upcoming = assignments
      .filter((assignment) => assignment.duedate > nowSec)
      .sort((a, b) => a.duedate - b.duedate);

    if (upcoming.length === 0) {
      return 'Ближайших дедлайнов нет — можно выдохнуть или заглянуть в курсы.';
    }

    const nearest = upcoming[0];
    const hoursLeft = Math.max(1, Math.ceil((nearest.duedate - nowSec) / 3600));

    return `До «${nearest.name}» осталось ${hoursLeft} ч. Успеем?`;
  }, [assignments, nowSec]);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.hello}>{GREETINGS[timeOfDay]}, студент</h2>
      <p className={styles.cta}>{cta}</p>
    </div>
  );
};
