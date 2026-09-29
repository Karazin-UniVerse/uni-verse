'use client';

import React, { useMemo } from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  FileEdit,
  ChevronRight,
  Video,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tag, Empty, Button as SimpleButton } from '@una';
import type { CurriculumItem } from '@core/types';
import { AssignmentsDonut } from '@uni-hub/components/assignments';
import { QuickActions, RecentGradesFeed } from '@uni-hub/components/dashboard';
import { ContextualGreeting, LiveCountdown } from '@uni-hub/components/gamification';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { useNow } from '@uni-hub/hooks/useNow';
import type { MoodleEvent } from '@uni-hub/types';
import type { OverviewTabProps } from '../types';
import { mockKarazinCurriculum } from '../constants';
import { stripHtml } from '../utils';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '@uni-hub/views/DashboardPage.module.scss';

const MEETING_URL_REGEX =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|bbb\.[a-z0-9.-]+)[^\s"'<>()]*/i;

const extractMeetingUrl = (event: MoodleEvent): string | null => {
  if (event.url && MEETING_URL_REGEX.test(event.url)) {
    return event.url;
  }

  if (event.description) {
    const match = MEETING_URL_REGEX.exec(event.description);

    if (match) {
      return match[0].replace(/[),.;]+$/, '');
    }
  }

  return null;
};

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

  const renderUpcomingEvents = () => {
    if (events.length > 0) {
      return (
        <div className={styles.list}>
          {events.slice(0, 4).map((event, index) => {
            const meetingUrl = extractMeetingUrl(event);

            return (
              <div
                key={event.id}
                className={styles.listItem}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className={styles.listTitle}>
                  {event.url ? (
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                      {event.name}
                    </a>
                  ) : (
                    event.name
                  )}
                </div>
                <div className={styles.muted}>{stripHtml(event.formattedtime)}</div>
                {meetingUrl && (
                  <div>
                    <a
                      href={meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.joinMeetingBtn}
                    >
                      <Video size={14} />
                      <span>Приєднатися до заняття</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (assignments.length > 0) {
      return (
        <div className={styles.list}>
          {assignments.slice(0, 4).map((assignment, index) => (
            <button
              key={assignment.id}
              type="button"
              className={`${styles.listItem} ${styles.assignmentItemClickable}`}
              onClick={() => onNavigate('assignments')}
              style={{ animationDelay: `${index * 40}ms` }}
              title={`Перейти до завдання: ${assignment.name}`}
            >
              <div className={styles.listTitle}>{assignment.name}</div>
              <div className={styles.muted}>
                {assignment.courseName} •{' '}
                {assignment.duedate > 0
                  ? `Дедлайн: ${new Date(assignment.duedate * 1000).toLocaleDateString('uk-UA')}`
                  : 'Без терміну'}
              </div>
            </button>
          ))}
        </div>
      );
    }

    return <Empty description={formatMessage('overview.noEvents')} />;
  };

  return (
    <div className={styles.stack}>
      <section className={styles.studentCard}>
        <div className={styles.studentCardTop}>
          <div className={styles.studentIdentity}>
            <div className={styles.studentAvatarLarge}>
              <GraduationCap size={26} />
            </div>
            <div className={styles.studentMainInfo}>
              <h3>{activeStudentProfile.fullName}</h3>
              <div className={styles.muted}>
                Спеціальність {activeStudentProfile.specialty} •{' '}
                {activeStudentProfile.educationalProgram}
              </div>
            </div>
          </div>
          <div className={styles.studentTags}>
            <Tag tone="success">{formatMessage('student.fullTime')}</Tag>
            <Tag tone="info">{formatMessage('student.budget')}</Tag>
            <Tag tone="success">
              <Award size={12} style={{ marginRight: 4 }} />
              {formatMessage('student.scholarship')}
            </Tag>
          </div>
        </div>

        <div className={styles.studentGrid}>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.faculty')}</span>
            <span className={styles.fieldValue}>{activeStudentProfile.faculty}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.department')}</span>
            <span className={styles.fieldValue}>{activeStudentProfile.department}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.courseAndGroup')}</span>
            <span className={styles.fieldValue}>
              {activeStudentProfile.course} курс, група {activeStudentProfile.group}
            </span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.card')}</span>
            <span className={styles.fieldValue}>{activeStudentProfile.studentCardNumber}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.recordBook')}</span>
            <span className={styles.fieldValue}>{activeStudentProfile.recordBookNumber}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.credits')}</span>
            <span className={styles.fieldValue}>
              {activeStudentProfile.totalCreditsEarned} ECTS
            </span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.gpa')}</span>
            <span className={styles.fieldValue}>{activeStudentProfile.gpa} / 100</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>{formatMessage('student.status')}</span>
            <span className={styles.fieldValue} style={{ color: '#22c55e' }}>
              ● {formatMessage('student.statusActive')}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.overviewHero}>
        <ContextualGreeting assignments={assignments} />
        {nearestDeadline && (
          <div className={styles.nearestDeadline}>
            <span className={styles.muted}>Найближчий дедлайн: {nearestDeadline.name}</span>
            <LiveCountdown targetUnixSec={nearestDeadline.duedate} />
          </div>
        )}
      </div>

      <div className={styles.statGrid}>
        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardClickable}`}
          onClick={() => onNavigate('courses')}
          style={{ animationDelay: '0ms' }}
          title="Перейти до списку курсів"
        >
          <div className={styles.statLabel}>{formatMessage('overview.totalCourses')}</div>
          <div className={styles.statValue}>
            <BookOpen size={20} />
            {coursesCount}
          </div>
          <div className={styles.statHint}>Переглянути курси &rarr;</div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardClickable}`}
          onClick={() => onNavigate('assignments')}
          style={{ animationDelay: '40ms' }}
          title="Перейти до списку завдань"
        >
          <div className={styles.statLabel}>{formatMessage('overview.pendingAssignments')}</div>
          <div className={styles.statValue}>
            <FileEdit size={20} />
            {assignmentsCount}
          </div>
          <div className={styles.statHint}>Переглянути завдання &rarr;</div>
        </button>

        <button
          type="button"
          className={`${styles.statCard} ${styles.statCardClickable}`}
          onClick={() => onNavigate('grades')}
          style={{ animationDelay: '80ms' }}
          title="Перейти до залікової книжки та оцінок"
        >
          <div className={styles.statLabel}>{formatMessage('overview.gpa')}</div>
          <div className={styles.statValue}>
            <GraduationCap size={20} />
            {activeStudentProfile.gpa}
          </div>
          <div className={styles.statHint}>Залікова книжка &rarr;</div>
        </button>
      </div>

      <QuickActions assignments={assignments} onNavigate={onNavigate} />

      <div className={styles.gradesDonutGrid}>
        <RecentGradesFeed assignments={assignments} onNavigate={onNavigate} />
        <AssignmentsDonut assignments={assignments} grades={grades} />
      </div>

      <div className={styles.split}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>{formatMessage('overview.currentCourses')}</h3>
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => onNavigate('courses')}
            >
              {formatMessage('overview.all')}
            </SimpleButton>
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
                  title={`Переглянути матеріали курсу: ${'fullname' in course ? course.fullname : (course as CurriculumItem).name}`}
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
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => onNavigate('assignments')}
            >
              {formatMessage('overview.all')}
            </SimpleButton>
          </div>
          {renderUpcomingEvents()}
        </section>
      </div>
    </div>
  );
};
