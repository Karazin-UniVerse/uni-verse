'use client';

import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Empty, Button } from '@una';
import type { CurriculumItem } from '@core/types';
import { AssignmentsDonut } from '@uni-hub/components/assignments';
import { QuickActions, RecentGradesFeed } from '@uni-hub/components/dashboard';
import { ContextualGreeting, LiveCountdown } from '@uni-hub/components/gamification';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { useNow } from '@uni-hub/hooks/useNow';
import type { OverviewTabProps } from '../types';
import { mockKarazinCurriculum } from '../constants';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { StudentCard } from './StudentCard';
import { StatCardGrid } from './StatCardGrid';
import { UpcomingEventsList } from './UpcomingEventsList';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export const OverviewTab: React.FC<OverviewTabProps> = ({
  courses,
  events,
  assignments,
  grades,
  statistics,
  activeStudentProfile,
  loading,
  onNavigate,
}) => {
  const router = useRouter();
  const { formatMessage } = useLanguage();
  const coursesCount = useCountUp(statistics?.total || 0, 800, !loading);
  const assignmentsCount = useCountUp(assignments.length, 800, !loading);

  const nowMs = useNow(30_000);

  const nearestDeadline = useMemo(() => {
    const nowSec = Math.floor(nowMs / 1000);

    return assignments
      .filter((assignment) => assignment.duedate > nowSec)
      .sort(
        (firstAssignment, secondAssignment) => firstAssignment.duedate - secondAssignment.duedate,
      )[0];
  }, [assignments, nowMs]);

  const overviewCourses = (courses.length > 0 ? courses : mockKarazinCurriculum).slice(0, 3);

  return (
    <div className={styles.stack}>
      <StudentCard activeStudentProfile={activeStudentProfile} />

      <div className={styles.overviewHero}>
        <ContextualGreeting assignments={assignments} />
        {nearestDeadline && (
          <div className={styles.nearestDeadline}>
            <span className={styles.muted}>
              {formatMessage('overview.nearestDeadline')} {nearestDeadline.name}
            </span>
            <LiveCountdown targetUnixSec={nearestDeadline.duedate} />
          </div>
        )}
      </div>

      <StatCardGrid
        coursesCount={coursesCount}
        assignmentsCount={assignmentsCount}
        gpa={activeStudentProfile.gpa}
        onNavigate={onNavigate}
      />

      <QuickActions assignments={assignments} onNavigate={onNavigate} />

      <div className={styles.gradesDonutGrid}>
        <RecentGradesFeed assignments={assignments} onNavigate={onNavigate} />
        <AssignmentsDonut assignments={assignments} grades={grades} />
      </div>

      <div className={styles.split}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>{formatMessage('overview.currentCourses')}</h3>
            <Button
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => onNavigate('courses')}
            >
              {formatMessage('overview.all')}
            </Button>
          </div>
          {overviewCourses.length > 0 ? (
            <div className={styles.list}>
              {overviewCourses.map((course, index) => (
                <button
                  key={course.id}
                  type="button"
                  className={`${styles.listItem} ${styles.courseItemClickable}`}
                  onClick={() => router.push(`/courses/${course.id}/contents`)}
                  style={{ animationDelay: `${index * 40}ms` }}
                  title={formatMessage('overview.viewCourseMaterials', {
                    name:
                      ('fullname' in course ? course.fullname : (course as CurriculumItem).name) ??
                      '',
                  })}
                >
                  <div className={styles.courseItemMain}>
                    <div className={styles.listTitle}>
                      {'fullname' in course ? course.fullname : (course as CurriculumItem).name}
                    </div>
                    <div className={styles.muted}>
                      {'shortname' in course ? course.shortname : (course as CurriculumItem).code}
                    </div>
                  </div>
                  <div className={styles.courseItemAction}>
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty description={formatMessage('overview.noCourses')} />
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>{formatMessage('overview.upcomingDeadlines')}</h3>
            <Button
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => onNavigate('assignments')}
            >
              {formatMessage('overview.all')}
            </Button>
          </div>
          <UpcomingEventsList events={events} assignments={assignments} onNavigate={onNavigate} />
        </section>
      </div>
    </div>
  );
};
