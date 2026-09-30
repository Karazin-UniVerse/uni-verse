'use client';

import React from 'react';
import { Video, ExternalLink } from 'lucide-react';
import { Empty } from '@una';
import type { MoodleEvent, Assignment } from '@uni-hub/types';
import type { NavKey } from '../types';
import { extractMeetingUrl } from './helpers';
import { stripHtml } from '../utils';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export interface UpcomingEventsListProps {
  events: MoodleEvent[];
  assignments: Assignment[];
  onNavigate: (tab: NavKey) => void;
}

export const UpcomingEventsList: React.FC<UpcomingEventsListProps> = ({
  events,
  assignments,
  onNavigate,
}) => {
  const { formatMessage, localeTag } = useLanguage();

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
                    <span>{formatMessage('overview.joinMeeting')}</span>
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
            title={formatMessage('recentGrades.viewAssignment', {
              name: assignment.name,
            })}
          >
            <div className={styles.listTitle}>{assignment.name}</div>
            <div className={styles.muted}>
              {assignment.courseName} •{' '}
              {assignment.duedate > 0
                ? `${formatMessage('assignments.deadline')}: ${new Date(assignment.duedate * 1000).toLocaleDateString(localeTag)}`
                : formatMessage('overview.noDeadline')}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return <Empty description={formatMessage('overview.noEvents')} />;
};
