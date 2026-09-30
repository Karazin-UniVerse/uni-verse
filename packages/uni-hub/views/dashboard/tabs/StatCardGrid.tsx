'use client';

import React from 'react';
import { BookOpen, FileEdit, GraduationCap } from 'lucide-react';
import type { NavKey } from '../types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export interface StatCardGridProps {
  coursesCount: number;
  assignmentsCount: number;
  gpa: number | string;
  onNavigate: (tab: NavKey) => void;
}

export const StatCardGrid: React.FC<StatCardGridProps> = ({
  coursesCount,
  assignmentsCount,
  gpa,
  onNavigate,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <div className={styles.statGrid}>
      <button
        type="button"
        className={`${styles.statCard} ${styles.statCardClickable}`}
        onClick={() => onNavigate('courses')}
        style={{ animationDelay: '0ms' }}
        title={formatMessage('overview.coursesTitle')}
      >
        <div className={styles.statLabel}>{formatMessage('overview.totalCourses')}</div>
        <div className={styles.statValue}>
          <BookOpen size={20} />
          {coursesCount}
        </div>
        <div className={styles.statHint}>{formatMessage('overview.coursesHint')}</div>
      </button>

      <button
        type="button"
        className={`${styles.statCard} ${styles.statCardClickable}`}
        onClick={() => onNavigate('assignments')}
        style={{ animationDelay: '40ms' }}
        title={formatMessage('overview.assignmentsTitle')}
      >
        <div className={styles.statLabel}>{formatMessage('overview.pendingAssignments')}</div>
        <div className={styles.statValue}>
          <FileEdit size={20} />
          {assignmentsCount}
        </div>
        <div className={styles.statHint}>{formatMessage('overview.assignmentsHint')}</div>
      </button>

      <button
        type="button"
        className={`${styles.statCard} ${styles.statCardClickable}`}
        onClick={() => onNavigate('grades')}
        style={{ animationDelay: '80ms' }}
        title={formatMessage('overview.gradesTitle')}
      >
        <div className={styles.statLabel}>{formatMessage('overview.gpa')}</div>
        <div className={styles.statValue}>
          <GraduationCap size={20} />
          {gpa}
        </div>
        <div className={styles.statHint}>{formatMessage('overview.gradesHint')}</div>
      </button>
    </div>
  );
};
