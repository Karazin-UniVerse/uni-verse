'use client';

import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import { Empty, Button } from '@una';
import { GradeFeedItem } from '@universe/ui';
import type { Assignment } from '@uni-hub/types';
import type { NavKey } from '@uni-hub/views/dashboard/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getScoreToneClass, formatRecentGradeDate } from './helpers';
import styles from './RecentGradesFeed.module.scss';

export interface RecentGradesFeedProps {
  assignments: Assignment[];
  onNavigate: (tab: NavKey) => void;
  maxItems?: number;
}

export const RecentGradesFeed: React.FC<RecentGradesFeedProps> = ({
  assignments,
  onNavigate,
  maxItems = 4,
}) => {
  const { formatMessage, localeTag } = useLanguage();

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

  return (
    <section
      className={styles.recentGradesPanel}
      aria-label={formatMessage('recentGrades.ariaLabel')}
    >
      <div className={styles.panelHeader}>
        <h3>
          <Award size={18} className={styles.headerIcon} />
          <span>{formatMessage('recentGrades.title')}</span>
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="small"
          isTransparent
          onClick={() => onNavigate('grades')}
          title={formatMessage('recentGrades.allGradesTitle')}
        >
          {formatMessage('recentGrades.allGrades')}
        </Button>
      </div>

      {gradedAssignments.length > 0 ? (
        <div className={styles.feedList}>
          {gradedAssignments.map((assignment, index) => {
            const toneClass = getScoreToneClass(assignment.grade);
            const dateStr = formatRecentGradeDate(
              assignment.submittedAt || assignment.duedate,
              localeTag,
              formatMessage('recentGrades.recently'),
            );

            return (
              <GradeFeedItem
                key={assignment.id}
                title={assignment.name}
                courseName={assignment.courseName}
                dateText={dateStr}
                score={assignment.grade || formatMessage('recentGrades.passed')}
                scoreBadgeClassName={toneClass}
                animationDelayMs={index * 40}
                titleTooltip={formatMessage('recentGrades.viewAssignment', {
                  name: assignment.name,
                })}
                onClick={() => onNavigate('assignments')}
              />
            );
          })}
        </div>
      ) : (
        <Empty description={formatMessage('recentGrades.empty')} />
      )}
    </section>
  );
};
