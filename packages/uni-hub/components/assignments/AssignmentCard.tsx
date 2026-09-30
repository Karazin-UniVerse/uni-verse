'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Tag } from '@una';
import { LiveCountdown } from '@uni-hub/components/gamification';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { Assignment } from '@uni-hub/types';
import { cardMotion } from '@uni-hub/views/dashboard/constants';
import {
  getAssignmentStatusInfo,
  type AssignmentStatusInfo,
} from '@uni-hub/views/dashboard/tabs/helpers';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export type AssignmentCardProps = {
  assignment: Assignment;
  status?: string;
  grade?: string;
  nowSec: number;
  soundEnabled: boolean;
  onOpenAssignment: (assignment: Assignment) => void;
};

function renderStatusIcon(tone: AssignmentStatusInfo['tone']) {
  if (tone === 'success') {
    return <CheckCircle2 size={13} style={{ marginRight: 4 }} />;
  }

  if (tone === 'danger') {
    return <AlertCircle size={13} style={{ marginRight: 4 }} />;
  }

  return <Clock size={13} style={{ marginRight: 4 }} />;
}

export const AssignmentCard: React.FC<Readonly<AssignmentCardProps>> = ({
  assignment,
  grade,
  nowSec,
  soundEnabled,
  onOpenAssignment,
  status = 'new',
}) => {
  const isCompleted = status === 'submitted' || status === 'graded' || Boolean(assignment.graded);
  const hasDeadline = Boolean(assignment.duedate && assignment.duedate > 0);
  const isOverdue = Boolean(hasDeadline && assignment.duedate < nowSec);
  const statusInfo = getAssignmentStatusInfo(status, isCompleted, isOverdue);

  return (
    <motion.button
      type="button"
      className={clsx(
        styles.assignmentCard,
        isCompleted && styles.assignmentCardCompleted,
        isOverdue && styles.assignmentCardOverdue,
        !isCompleted && !isOverdue && styles.assignmentCardInProgress,
      )}
      {...cardMotion}
      onClick={() => {
        playClick(soundEnabled);
        onOpenAssignment(assignment);
      }}
    >
      <div className={styles.assignmentMainCol}>
        <h3 className={styles.assignmentTitle}>{assignment.name}</h3>

        <div className={styles.assignmentMetaRow}>
          <div className={styles.assignmentCourseTag}>
            <BookOpen size={12} className={styles.assignmentCourseIcon} />
            <span className={styles.assignmentCourseName}>{assignment.courseName}</span>
          </div>

          <span className={styles.metaDot}>•</span>

          <div className={styles.assignmentDeadlineBox}>
            <Calendar size={12} className={styles.calendarIcon} />
            {hasDeadline ? (
              <>
                <span className={styles.deadlineDate}>
                  Дедлайн: {new Date(assignment.duedate * 1000).toLocaleDateString('uk-UA')}
                </span>
                {!isCompleted && !isOverdue && (
                  <>
                    <span className={styles.metaDot}>•</span>
                    <LiveCountdown targetUnixSec={assignment.duedate} />
                  </>
                )}
              </>
            ) : (
              <span className={styles.noDeadlineText}>Без терміну здачі</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.assignmentRightCol}>
        <Tag tone={statusInfo.tone}>
          {grade ? (
            <>
              <Award size={13} style={{ marginRight: 4 }} />
              Оцінка: {grade}
            </>
          ) : (
            <>
              {renderStatusIcon(statusInfo.tone)}
              {statusInfo.label}
            </>
          )}
        </Tag>

        <div className={styles.assignmentActionButton}>
          <span>Відкрити</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </motion.button>
  );
};
