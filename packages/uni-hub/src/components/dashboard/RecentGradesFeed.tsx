'use client';

import React, { useMemo } from 'react';
import { Award, ChevronRight } from 'lucide-react';
import { Empty, Button as SimpleButton } from '@una';
import type { Assignment } from '@uni-hub/types';
import type { NavKey } from '@uni-hub/views/dashboard/types';
import styles from './RecentGradesFeed.module.scss';

export interface RecentGradesFeedProps {
  assignments: Assignment[];
  onNavigate: (tab: NavKey) => void;
  maxItems?: number;
}

export function getScoreToneClass(gradeStr: string | null | undefined): string {
  if (!gradeStr) {
    return styles.toneInfo;
  }

  const numeric = Number.parseFloat(gradeStr.replace(/[^\d.-]/g, ''));

  if (Number.isNaN(numeric)) {
    return styles.toneInfo;
  }

  if (numeric >= 90) {
    return styles.toneSuccess;
  }

  if (numeric >= 75) {
    return styles.toneInfo;
  }

  if (numeric >= 60) {
    return styles.toneWarning;
  }

  return styles.toneDanger;
}

export const RecentGradesFeed: React.FC<RecentGradesFeedProps> = ({
  assignments,
  onNavigate,
  maxItems = 4,
}) => {
  const gradedAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => {
        const hasGrade =
          assignment.grade !== null && assignment.grade !== undefined && assignment.grade !== '';
        const isGraded = assignment.graded || assignment.submissionStatus === 'graded';

        return hasGrade || isGraded;
      })
      .sort((a, b) => {
        const timeA = a.submittedAt || a.duedate || 0;
        const timeB = b.submittedAt || b.duedate || 0;

        return timeB - timeA;
      })
      .slice(0, maxItems);
  }, [assignments, maxItems]);

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp || timestamp <= 0) {
      return 'Нещодавно';
    }

    return new Date(timestamp * 1000).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleItemKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate('assignments');
    }
  };

  return (
    <section className={styles.recentGradesPanel} aria-label="Останні оцінки">
      <div className={styles.panelHeader}>
        <h3>
          <Award size={18} className={styles.headerIcon} />
          <span>Останні оцінки</span>
        </h3>
        <SimpleButton
          type="button"
          variant="secondary"
          size="small"
          isTransparent
          onClick={() => onNavigate('grades')}
          title="Переглянути всі оцінки в заліковій книжці"
        >
          Всі оцінки
        </SimpleButton>
      </div>

      {gradedAssignments.length > 0 ? (
        <div className={styles.feedList}>
          {gradedAssignments.map((assignment, index) => {
            const toneClass = getScoreToneClass(assignment.grade);
            const dateStr = formatDate(assignment.submittedAt || assignment.duedate);

            return (
              <div
                key={assignment.id}
                role="button"
                tabIndex={0}
                className={styles.feedItem}
                onClick={() => onNavigate('assignments')}
                onKeyDown={handleItemKeyDown}
                style={{ animationDelay: `${index * 40}ms` }}
                title={`Перейти до завдання: ${assignment.name}`}
              >
                <div className={styles.feedItemMain}>
                  <div className={styles.feedItemTitle}>{assignment.name}</div>
                  <div className={styles.feedItemMeta}>
                    <span className={styles.courseName}>{assignment.courseName}</span>
                    <span className={styles.dotSeparator}>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className={styles.feedItemScore}>
                  <span className={`${styles.scoreBadge} ${toneClass}`}>
                    {assignment.grade || 'Зараховано'}
                  </span>
                  <ChevronRight
                    size={16}
                    style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty description="Ще немає перевірених робіт" />
      )}
    </section>
  );
};
