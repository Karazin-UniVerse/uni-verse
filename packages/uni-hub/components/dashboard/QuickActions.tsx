'use client';

import React, { useMemo, useState } from 'react';
import { Globe, FileText, Calendar, Building2, ExternalLink } from 'lucide-react';
import type { Assignment } from '@uni-hub/types';
import type { NavKey } from '@uni-hub/views/dashboard/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { DeanContactModal } from './DeanContactModal';
import { calculatePendingAssignmentsCount } from './helpers';
import styles from './QuickActions.module.scss';

export interface QuickActionsProps {
  assignments: Assignment[];
  onNavigate: (tab: NavKey) => void;
}

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://moodle.universemvp.tech';

export const QuickActions: React.FC<QuickActionsProps> = ({ assignments, onNavigate }) => {
  const { formatMessage } = useLanguage();
  const [isDeanModalOpen, setIsDeanModalOpen] = useState(false);
  const pendingCount = useMemo(() => calculatePendingAssignmentsCount(assignments), [assignments]);

  return (
    <>
      <section
        className={styles.quickActionsContainer}
        aria-label={formatMessage('quickActions.ariaLabel')}
      >
        <div className={styles.quickActionsHeader}>
          <h3>{formatMessage('quickActions.title')}</h3>
        </div>

        <div className={styles.actionsGrid}>
          <a
            href={MOODLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionCard}
            title={formatMessage('quickActions.moodleTitle')}
          >
            <div className={`${styles.iconWrapper} ${styles.iconMoodle}`}>
              <Globe size={22} />
            </div>
            <div className={styles.actionBody}>
              <div className={styles.actionTitleRow}>
                <span className={styles.actionTitle}>Moodle LMS</span>
                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                  {formatMessage('quickActions.moodleBadge')}
                </span>
              </div>
              <span className={styles.actionDescription}>
                {formatMessage('quickActions.moodleDescription')}
              </span>
            </div>
            <ExternalLink size={16} className={styles.externalIcon} />
          </a>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => onNavigate('assignments')}
            title={formatMessage('quickActions.assignmentsTitle')}
          >
            <div className={`${styles.iconWrapper} ${styles.iconAssignments}`}>
              <FileText size={22} />
            </div>
            <div className={styles.actionBody}>
              <div className={styles.actionTitleRow}>
                <span className={styles.actionTitle}>
                  {formatMessage('quickActions.myAssignments')}
                </span>
                {pendingCount > 0 && (
                  <span className={`${styles.badge} ${styles.badgeAlert}`}>{pendingCount}</span>
                )}
              </div>
              <span className={styles.actionDescription}>
                {pendingCount > 0
                  ? formatMessage('quickActions.pendingCount', { count: pendingCount })
                  : formatMessage('quickActions.allDone')}
              </span>
            </div>
          </button>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => onNavigate('schedule')}
            title={formatMessage('quickActions.scheduleTitle')}
          >
            <div className={`${styles.iconWrapper} ${styles.iconSchedule}`}>
              <Calendar size={22} />
            </div>
            <div className={styles.actionBody}>
              <div className={styles.actionTitleRow}>
                <span className={styles.actionTitle}>{formatMessage('quickActions.schedule')}</span>
              </div>
              <span className={styles.actionDescription}>
                {formatMessage('quickActions.scheduleDescription')}
              </span>
            </div>
          </button>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => setIsDeanModalOpen(true)}
            title={formatMessage('quickActions.deanTitle')}
          >
            <div className={`${styles.iconWrapper} ${styles.iconDean}`}>
              <Building2 size={22} />
            </div>
            <div className={styles.actionBody}>
              <div className={styles.actionTitleRow}>
                <span className={styles.actionTitle}>{formatMessage('quickActions.dean')}</span>
              </div>
              <span className={styles.actionDescription}>
                {formatMessage('quickActions.deanDescription')}
              </span>
            </div>
          </button>
        </div>
      </section>

      <DeanContactModal open={isDeanModalOpen} onClose={() => setIsDeanModalOpen(false)} />
    </>
  );
};
