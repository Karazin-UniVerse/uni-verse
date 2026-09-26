'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Filter,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  TextInput as SimpleInput,
  Select,
  CheckBox,
  Tag,
  Empty,
  Button as SimpleButton,
} from '@una';
import { LiveCountdown } from '@uni-hub/components/gamification';
import { useNow } from '@uni-hub/hooks/useNow';
import { moodleApi } from '@uni-hub/services/api';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { AssignmentsTabProps } from '../types';
import { cardMotion } from '../constants';
import styles from '@uni-hub/views/DashboardPage.module.scss';

type AssignmentStatusInfo = {
  tone: 'success' | 'danger' | 'info' | 'warning';
  label: string;
};

function getAssignmentStatusInfo(
  status: string,
  isGraded: boolean,
  isAwaitingReview: boolean,
  isOverdue: boolean,
): AssignmentStatusInfo {
  if (isGraded) {
    return {
      tone: 'success',
      label: 'Оцінено',
    };
  }

  if (isAwaitingReview) {
    return {
      tone: 'warning',
      label: 'Очікує перевірки',
    };
  }

  if (isOverdue) {
    return { tone: 'danger', label: 'Прострочено' };
  }

  return { tone: 'info', label: 'В процесі' };
}

function renderStatusIcon(tone: 'success' | 'danger' | 'info' | 'warning') {
  if (tone === 'success') {
    return <CheckCircle2 size={13} style={{ marginRight: 4 }} />;
  }

  if (tone === 'warning') {
    return <Clock size={13} style={{ marginRight: 4 }} />;
  }

  if (tone === 'danger') {
    return <AlertCircle size={13} style={{ marginRight: 4 }} />;
  }

  return <Clock size={13} style={{ marginRight: 4 }} />;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  assignments,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  sortOrder,
  onSortOrderChange,
  hideCompleted,
  onHideCompletedChange,
  soundEnabled,
  onOpenAssignment,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<
    Record<number, { status?: string; grade?: string }>
  >({});
  const requestedIdsRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const assignmentsNeedingStatus = assignments.filter(
      (item) => !item.submissionStatus && !requestedIdsRef.current.has(item.id),
    );

    if (assignmentsNeedingStatus.length === 0) return;

    const batch = assignmentsNeedingStatus.slice(0, 10);

    for (const item of batch) {
      requestedIdsRef.current.add(item.id);
    }

    for (const item of batch) {
      void (async () => {
        try {
          const res = await moodleApi.getAssignmentStatus(item.id);

          if (!cancelled && res?.data) {
            const data = res.data as { status?: string; grade?: string };

            setLocalStatuses((prev) => ({
              ...prev,
              [item.id]: { status: data.status, grade: data.grade },
            }));
          }
        } catch {
          // Ignore status fetch error for individual item
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [assignments]);

  const handleDateChange =
    (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      if (!value) {
        setter('');

        return;
      }

      const [yearStr] = value.split('-');

      if (yearStr && yearStr.length > 4) {
        return;
      }

      setter(value);
    };

  const visibleAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const status = item.submissionStatus ?? localStatuses[item.id]?.status;
      const isCompleted = status === 'submitted' || status === 'graded' || Boolean(item.graded);

      return !hideCompleted || !isCompleted;
    });
  }, [assignments, hideCompleted, localStatuses]);

  const nowMs = useNow(30_000);
  const nowSec = Math.floor(nowMs / 1000);

  return (
    <div className={styles.stack}>
      <div className={styles.mobileFilterToggle}>
        <SimpleButton
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          variant="secondary"
          size="small"
          aria-expanded={filtersOpen}
        >
          <Filter size={16} /> {filtersOpen ? 'Сховати фільтри' : 'Фільтри'}
        </SimpleButton>
      </div>
      <div className={`${styles.filters} ${filtersOpen ? styles.filtersOpen : ''}`}>
        <SimpleInput
          type="date"
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateFrom}
          onChange={handleDateChange(onDateFromChange)}
          aria-label="Дата від"
        />
        <SimpleInput
          type="date"
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateTo}
          onChange={handleDateChange(onDateToChange)}
          aria-label="Дата до"
        />
        <Select
          value={sortOrder}
          onChange={(value) => onSortOrderChange(value as 'asc' | 'desc')}
          options={[
            { value: 'asc', label: 'Спочатку старі' },
            { value: 'desc', label: 'Спочатку нові' },
          ]}
        />
        <label className={styles.checkLabel}>
          <CheckBox
            variant="primary"
            checked={hideCompleted}
            onChange={(event) => onHideCompletedChange(event.target.checked)}
          />
          Сховати виконані
        </label>
      </div>

      {visibleAssignments.length > 0
        ? visibleAssignments.map((item) => {
            const status = item.submissionStatus ?? localStatuses[item.id]?.status ?? 'new';
            const grade = item.grade ?? localStatuses[item.id]?.grade;
            const isGraded = status === 'graded' || Boolean(grade) || Boolean(item.graded);
            const isAwaitingReview = !isGraded && status === 'submitted';
            const isCompleted = isGraded || isAwaitingReview;
            const hasDeadline = Boolean(item.duedate && item.duedate > 0);
            const isOverdue = Boolean(hasDeadline && item.duedate < nowSec && !isCompleted);
            const isLate = Boolean(
              item.isLate || (item.submittedAt && hasDeadline && item.submittedAt > item.duedate),
            );
            const statusInfo = getAssignmentStatusInfo(
              status,
              isGraded,
              isAwaitingReview,
              isOverdue,
            );

            return (
              <motion.button
                key={item.id}
                type="button"
                className={clsx(
                  styles.assignmentCard,
                  isAwaitingReview && styles.assignmentCardAwaitingReview,
                  isGraded && styles.assignmentCardCompleted,
                  isOverdue && styles.assignmentCardOverdue,
                  !isCompleted && !isOverdue && styles.assignmentCardInProgress,
                )}
                {...cardMotion}
                onClick={() => {
                  playClick(soundEnabled);
                  onOpenAssignment(item);
                }}
              >
                <div className={styles.assignmentMainCol}>
                  <h3 className={styles.assignmentTitle}>{item.name}</h3>

                  <div className={styles.assignmentMetaRow}>
                    <div className={styles.assignmentCourseTag}>
                      <BookOpen size={12} className={styles.assignmentCourseIcon} />
                      <span className={styles.assignmentCourseName}>{item.courseName}</span>
                    </div>

                    <span className={styles.metaDot}>•</span>

                    <div className={styles.assignmentDeadlineBox}>
                      <Calendar size={12} className={styles.calendarIcon} />
                      {hasDeadline ? (
                        <>
                          <span className={styles.deadlineDate}>
                            Дедлайн: {new Date(item.duedate * 1000).toLocaleDateString('uk-UA')}
                          </span>
                          {!isCompleted && !isOverdue && (
                            <>
                              <span className={styles.metaDot}>•</span>
                              <LiveCountdown targetUnixSec={item.duedate} />
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
                  {isLate && (
                    <Tag tone="danger">
                      <AlertCircle size={13} style={{ marginRight: 4 }} />
                      Здано із запізненням
                    </Tag>
                  )}

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
          })
        : (() => {
            if (assignments.length === 0) {
              return (
                <Empty
                  description="Завдань не знайдено"
                  icon={<span style={{ fontSize: '48px' }}>📝</span>}
                />
              );
            }

            if (dateFrom || dateTo) {
              return (
                <Empty
                  description="За обраними датами завдань не знайдено"
                  icon={<span style={{ fontSize: '48px' }}>🔍</span>}
                />
              );
            }

            return (
              <Empty
                description="Ура, всі завдання виконані! Час відпочити або переглянути лекції 🎉"
                icon={<span style={{ fontSize: '48px' }}>🏖️</span>}
              />
            );
          })()}
    </div>
  );
};
