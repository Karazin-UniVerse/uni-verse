'use client';

import React, { useMemo } from 'react';
import { GraduationCap, Award, BookOpen, FileEdit } from 'lucide-react';
import { Tag, Empty, Button as SimpleButton } from '@una';
import type { CurriculumItem } from '@core/types';
import { AssignmentsDonut } from '@uni-hub/components/assignments';
import { ContextualGreeting, LiveCountdown } from '@uni-hub/components/gamification';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { useNow } from '@uni-hub/hooks/useNow';
import type { OverviewTabProps } from '../types';
import { mockKarazinCurriculum } from '../constants';
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
  const coursesCount = useCountUp(statistics?.total || 0, 800, !loading);
  const assignmentsCount = useCountUp(assignments.length, 800, !loading);

  const nowMs = useNow(30_000);

  const nearestDeadline = useMemo(() => {
    const nowSec = Math.floor(nowMs / 1000);

    return assignments.filter((a) => a.duedate > nowSec).sort((a, b) => a.duedate - b.duedate)[0];
  }, [assignments, nowMs]);

  const overviewCourses = (courses.length > 0 ? courses : mockKarazinCurriculum).slice(0, 3);

  const renderUpcomingEvents = () => {
    if (events.length > 0) {
      return (
        <div className={styles.list}>
          {events.slice(0, 4).map((event, index) => (
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
              <div
                className={styles.muted}
                dangerouslySetInnerHTML={{ __html: event.formattedtime }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (assignments.length > 0) {
      return (
        <div className={styles.list}>
          {assignments.slice(0, 4).map((assign, index) => (
            <div
              key={assign.id}
              className={styles.listItem}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className={styles.listTitle}>{assign.name}</div>
              <div className={styles.muted}>
                {assign.courseName} • Дедлайн:{' '}
                {new Date(assign.duedate * 1000).toLocaleDateString('uk-UA')}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <Empty description="Подій та дедлайнів не знайдено" />;
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
            <Tag tone="warning">Демо-дані</Tag>
            <Tag tone="success">Денна форма</Tag>
            <Tag tone="info">Бюджет</Tag>
            <Tag tone="success">
              <Award size={12} style={{ marginRight: 4 }} />
              Відмінник (Академічна стипендія)
            </Tag>
          </div>
        </div>

        <p className={styles.muted} style={{ fontSize: 'var(--font-xs)', margin: 0 }}>
          Академічні реквізити (номер студентського, залікової книжки, факультет) відображаються як
          демонстраційні дані до підключення профільного API.
        </p>

        <div className={styles.studentGrid}>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Факультет / Інститут</span>
            <span className={styles.fieldValue}>{activeStudentProfile.faculty}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Кафедра</span>
            <span className={styles.fieldValue}>{activeStudentProfile.department}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Курс / Академічна група</span>
            <span className={styles.fieldValue}>
              {activeStudentProfile.course} курс, група {activeStudentProfile.group}
            </span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Студентський квиток</span>
            <span className={styles.fieldValue}>{activeStudentProfile.studentCardNumber}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Залікова книжка</span>
            <span className={styles.fieldValue}>{activeStudentProfile.recordBookNumber}</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Здобуто кредитів ECTS</span>
            <span className={styles.fieldValue}>
              {activeStudentProfile.totalCreditsEarned} ECTS
            </span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Рейтинговий бал (GPA)</span>
            <span className={styles.fieldValue}>{activeStudentProfile.gpa} / 100</span>
          </div>
          <div className={styles.studentField}>
            <span className={styles.fieldLabel}>Академічний статус</span>
            <span className={styles.fieldValue} style={{ color: '#22c55e' }}>
              ● Навчається (активний)
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
        <div className={styles.statCard} style={{ animationDelay: '0ms' }}>
          <div className={styles.statLabel}>Всього дисциплін</div>
          <div className={styles.statValue}>
            <BookOpen size={20} />
            {coursesCount}
          </div>
        </div>
        <div className={styles.statCard} style={{ animationDelay: '40ms' }}>
          <div className={styles.statLabel}>Завдань до виконання</div>
          <div className={styles.statValue}>
            <FileEdit size={20} />
            {assignmentsCount}
          </div>
        </div>
        <div className={styles.statCard} style={{ animationDelay: '80ms' }}>
          <div className={styles.statLabel}>Рейтинговий бал (GPA)</div>
          <div className={styles.statValue}>
            <GraduationCap size={20} />
            {activeStudentProfile.gpa}
          </div>
        </div>
      </div>

      <AssignmentsDonut assignments={assignments} grades={grades} />

      <div className={styles.split}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Поточні дисципліни</h3>
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => onNavigate('courses')}
            >
              Всі
            </SimpleButton>
          </div>
          {overviewCourses.length > 0 ? (
            <div className={styles.list}>
              {overviewCourses.map((course, index) => (
                <div
                  key={course.id}
                  className={styles.listItem}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className={styles.listTitle}>
                    {'fullname' in course ? course.fullname : (course as CurriculumItem).name}
                  </div>
                  <div className={styles.muted}>
                    {'shortname' in course ? course.shortname : (course as CurriculumItem).code}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="Дисципліни не знайдено" />
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Найближчі події та дедлайни</h3>
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => onNavigate('assignments')}
            >
              Всі
            </SimpleButton>
          </div>
          {renderUpcomingEvents()}
        </section>
      </div>
    </div>
  );
};
