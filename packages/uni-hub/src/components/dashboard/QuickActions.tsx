'use client';

import React, { useMemo } from 'react';
import { Globe, FileText, Calendar, GraduationCap, ExternalLink } from 'lucide-react';
import type { Assignment } from '@uni-hub/types';
import type { NavKey } from '@uni-hub/views/dashboard/types';
import styles from './QuickActions.module.scss';

export interface QuickActionsProps {
  assignments: Assignment[];
  onNavigate: (tab: NavKey) => void;
}

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://moodle.universemvp.tech';

export function calculatePendingAssignmentsCount(assignments: Assignment[]): number {
  return assignments.filter((assignment) => {
    const isGraded = assignment.graded || Boolean(assignment.grade);
    const isSubmitted = assignment.submissionStatus === 'submitted';

    return !isGraded && !isSubmitted;
  }).length;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ assignments, onNavigate }) => {
  const pendingCount = useMemo(() => calculatePendingAssignmentsCount(assignments), [assignments]);

  const handleCardKeyDown = (key: NavKey) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(key);
    }
  };

  return (
    <section className={styles.quickActionsContainer} aria-label="Швидкі дії">
      <div className={styles.quickActionsHeader}>
        <h3>Швидкі дії</h3>
      </div>

      <div className={styles.actionsGrid}>
        <a
          href={MOODLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionCard}
          title="Відкрити платформу Moodle LMS у новій вкладці"
        >
          <div className={`${styles.iconWrapper} ${styles.iconMoodle}`}>
            <Globe size={22} />
          </div>
          <div className={styles.actionBody}>
            <div className={styles.actionTitleRow}>
              <span className={styles.actionTitle}>Moodle LMS</span>
              <span className={`${styles.badge} ${styles.badgeInfo}`}>Каразінський</span>
            </div>
            <span className={styles.actionDescription}>Платформа курсів</span>
          </div>
          <ExternalLink size={16} className={styles.externalIcon} />
        </a>

        <div
          role="button"
          tabIndex={0}
          className={styles.actionCard}
          onClick={() => onNavigate('assignments')}
          onKeyDown={handleCardKeyDown('assignments')}
          title="Перейти до списку завдань та дедлайнів"
        >
          <div className={`${styles.iconWrapper} ${styles.iconAssignments}`}>
            <FileText size={22} />
          </div>
          <div className={styles.actionBody}>
            <div className={styles.actionTitleRow}>
              <span className={styles.actionTitle}>Мої завдання</span>
              {pendingCount > 0 && (
                <span className={`${styles.badge} ${styles.badgeAlert}`}>{pendingCount}</span>
              )}
            </div>
            <span className={styles.actionDescription}>
              {pendingCount > 0 ? `${pendingCount} до виконання` : 'Всі завдання здано'}
            </span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={styles.actionCard}
          onClick={() => onNavigate('schedule')}
          onKeyDown={handleCardKeyDown('schedule')}
          title="Перейти до розкладу занять"
        >
          <div className={`${styles.iconWrapper} ${styles.iconSchedule}`}>
            <Calendar size={22} />
          </div>
          <div className={styles.actionBody}>
            <div className={styles.actionTitleRow}>
              <span className={styles.actionTitle}>Розклад занять</span>
            </div>
            <span className={styles.actionDescription}>Пари та консультації</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={styles.actionCard}
          onClick={() => onNavigate('grades')}
          onKeyDown={handleCardKeyDown('grades')}
          title="Перейти до залікової книжки та симулятора оцінок"
        >
          <div className={`${styles.iconWrapper} ${styles.iconSimulator}`}>
            <GraduationCap size={22} />
          </div>
          <div className={styles.actionBody}>
            <div className={styles.actionTitleRow}>
              <span className={styles.actionTitle}>Симулятор оцінок</span>
            </div>
            <span className={styles.actionDescription}>Заліковка та розрахунок</span>
          </div>
        </div>
      </div>
    </section>
  );
};
