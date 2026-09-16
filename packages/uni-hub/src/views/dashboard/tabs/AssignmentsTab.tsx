'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import {
  TextInput as SimpleInput,
  Select,
  CheckBox,
  Tag,
  Empty,
  Button as SimpleButton,
} from '@una';
import { LiveCountdown } from '@uni-hub/components/gamification';
import { playClick } from '@uni-hub/utils/soundEffects';
import type { AssignmentsTabProps } from '../types';
import { cardMotion } from '../constants';
import { stripHtml } from '../utils';
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  return (
    <div className={styles.stack}>
      <div className={styles.mobileFilterToggle}>
        <SimpleButton onClick={() => setFiltersOpen(!filtersOpen)} variant="secondary" size="small">
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

      {assignments.length > 0 ? (
        assignments.map((item) => {
          const description = stripHtml(item.description);

          return (
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
              <div className={styles.htmlSnippet}>
                {description.length > 200 ? `${description.substring(0, 200)}...` : description}
              </div>
            </motion.button>
          );
        })
      ) : (
        <Empty
          description="Ура, всі завдання виконані! Час відпочити або переглянути лекції 🎉"
          icon={<span style={{ fontSize: '48px' }}>🏖️</span>}
        />
      )}
    </div>
  );
};
