'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Button as SimpleButton, Tag, ProgressBar } from '@una';
import type { CurriculumItem, ControlType } from '@core/types';
import { playClick } from '@uni-hub/utils/soundEffects';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { CoursesTabProps } from '../types';
import { mockKarazinCurriculum, cardMotion } from '../constants';
import { getControlTypeLabel } from '../utils';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export const CoursesTab: React.FC<CoursesTabProps> = ({ courses, soundEnabled }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const coursesList = courses.length > 0 ? courses : mockKarazinCurriculum;

  return (
    <div className={styles.courseGrid}>
      {coursesList.map((course, index) => {
        const isCurriculum = 'credits' in course;
        const curriculum = isCurriculum ? (course as CurriculumItem) : null;
        const credits = curriculum?.credits;
        const controlType: ControlType | undefined = curriculum?.controlType;
        const instructor = curriculum?.instructors?.[0]?.name;
        const progress = curriculum?.progress;

        return (
          <motion.article
            key={course.id}
            className={styles.courseCard}
            style={{ animationDelay: `${index * 40}ms` }}
            {...cardMotion}
          >
            <div className={styles.courseCardHeader}>
              <h3>{'fullname' in course ? course.fullname : (course as CurriculumItem).name}</h3>
              <span className={styles.courseTag}>
                <BookOpen size={14} aria-hidden />
                <Tag tone="neutral">
                  {'shortname' in course ? course.shortname : (course as CurriculumItem).code}
                </Tag>
              </span>
            </div>
            {(credits !== undefined || controlType !== undefined) && (
              <div className={styles.courseMetaRow}>
                {credits !== undefined && <Tag tone="neutral">{credits} ECTS</Tag>}
                {controlType && <Tag tone="neutral">{getControlTypeLabel(controlType, t)}</Tag>}
              </div>
            )}
            {instructor && (
              <div className={styles.courseTeacher}>
                {t('courses.instructor')}: <strong>{instructor}</strong>
              </div>
            )}
            <p className={styles.courseSummary}>
              {'summary' in course && course.summary
                ? course.summary
                : t('courses.curriculumSubject')}
            </p>
            {progress !== undefined && progress !== null && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-xs)',
                    marginBottom: '4px',
                  }}
                >
                  <span className={styles.muted}>{t('courses.progress')}</span>
                  <span>{progress}%</span>
                </div>
                <ProgressBar value={progress} tone={progress >= 60 ? 'success' : 'warning'} />
              </div>
            )}
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => {
                playClick(soundEnabled);
                router.push(`/courses/${course.id}/contents`);
              }}
            >
              {t('courses.viewMaterials')}
            </SimpleButton>
          </motion.article>
        );
      })}
    </div>
  );
};
