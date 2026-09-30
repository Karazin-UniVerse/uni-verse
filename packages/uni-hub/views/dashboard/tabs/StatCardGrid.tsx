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

  const cards = [
    {
      tab: 'courses' as const,
      delayMs: 0,
      title: formatMessage('overview.coursesTitle'),
      label: formatMessage('overview.totalCourses'),
      hint: formatMessage('overview.coursesHint'),
      icon: <BookOpen size={20} />,
      value: coursesCount,
    },
    {
      tab: 'assignments' as const,
      delayMs: 40,
      title: formatMessage('overview.assignmentsTitle'),
      label: formatMessage('overview.pendingAssignments'),
      hint: formatMessage('overview.assignmentsHint'),
      icon: <FileEdit size={20} />,
      value: assignmentsCount,
    },
    {
      tab: 'grades' as const,
      delayMs: 80,
      title: formatMessage('overview.gradesTitle'),
      label: formatMessage('overview.gpa'),
      hint: formatMessage('overview.gradesHint'),
      icon: <GraduationCap size={20} />,
      value: gpa,
    },
  ];

  return (
    <div className={styles.statGrid}>
      {cards.map((card) => (
        <button
          key={card.tab}
          type="button"
          className={`${styles.statCard} ${styles.statCardClickable}`}
          onClick={() => onNavigate(card.tab)}
          style={{ animationDelay: `${card.delayMs}ms` }}
          title={card.title}
        >
          <div className={styles.statLabel}>{card.label}</div>
          <div className={styles.statValue}>
            {card.icon}
            {card.value}
          </div>
          <div className={styles.statHint}>{card.hint}</div>
        </button>
      ))}
    </div>
  );
};
