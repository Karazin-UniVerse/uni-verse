'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TextInput as SimpleInput, Select, CheckBox, Tag, Empty } from '@una';
import { LiveCountdown } from '@uni-hub/components/gamification';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { AssignmentsTabProps } from '../types';
import { cardMotion } from '../constants';
import styles from '@uni-hub/views/DashboardPage.module.scss';

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
  const handleDateChange =
    (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;

      if (!val) {
        setter('');

        return;
      }

      const [yearStr] = val.split('-');

      if (yearStr && yearStr.length > 4) {
        return;
      }

      setter(val);
    };

  return (
    <div className={styles.stack}>
      <div className={styles.filters}>
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
          onChange={(v) => onSortOrderChange(v as 'asc' | 'desc')}
          options={[
            { value: 'asc', label: 'Спочатку старі' },
            { value: 'desc', label: 'Спочатку нові' },
          ]}
        />
        <label className={styles.checkLabel}>
          <CheckBox
            variant="primary"
            checked={hideCompleted}
            onChange={(e) => onHideCompletedChange(e.target.checked)}
          />
          Сховати виконані
        </label>
      </div>

      {assignments.length > 0 ? (
        assignments.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            className={styles.assignmentCard}
            {...cardMotion}
            onClick={() => {
              playClick(soundEnabled);
              onOpenAssignment(item);
            }}
          >
            <div className={styles.assignmentTop}>
              <div>
                <div className={styles.listTitle}>{item.name}</div>
                <div className={styles.muted}>{item.courseName}</div>
              </div>
              <div className={styles.nearestDeadline}>
                {item.duedate && item.duedate > 0 ? (
                  <>
                    <Tag tone="warning">
                      Дедлайн: {new Date(item.duedate * 1000).toLocaleDateString('uk-UA')}
                    </Tag>
                    <LiveCountdown targetUnixSec={item.duedate} />
                  </>
                ) : (
                  <Tag tone="default">Без терміну</Tag>
                )}
              </div>
            </div>
            <div
              className={styles.htmlSnippet}
              dangerouslySetInnerHTML={{
                __html:
                  (item.description || '').length > 200
                    ? (item.description || '').substring(0, 200) + '...'
                    : item.description || '',
              }}
            />
          </motion.button>
        ))
      ) : (
        <Empty description="Завдання не знайдено" />
      )}
    </div>
  );
};
