'use client';

import React from 'react';
import { GraduationCap, Award } from 'lucide-react';
import { Tag } from '@una';
import type { StudentProfile } from '@core/types';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from '@uni-hub/views/DashboardPage.module.scss';

export interface StudentCardProps {
  activeStudentProfile: StudentProfile;
  isMoodleLinked?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  activeStudentProfile,
  isMoodleLinked = true,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <section className={styles.studentCard}>
      <div className={styles.studentCardTop}>
        <div className={styles.studentIdentity}>
          <div className={styles.studentAvatarLarge}>
            {activeStudentProfile.avatarUrl ? (
              <img
                src={activeStudentProfile.avatarUrl}
                alt={activeStudentProfile.fullName}
                className={styles.avatarImg}
              />
            ) : (
              <GraduationCap size={26} />
            )}
          </div>
          <div className={styles.studentMainInfo}>
            <h3>{activeStudentProfile.fullName}</h3>
            <div className={styles.muted}>
              {formatMessage('overview.specialty')} {activeStudentProfile.specialty} •{' '}
              {activeStudentProfile.educationalProgram}
            </div>
          </div>
        </div>
        <div className={styles.studentTags}>
          <Tag tone="success">{formatMessage('student.fullTime')}</Tag>
          <Tag tone="info">{formatMessage('student.budget')}</Tag>
          <Tag tone="success">
            <Award size={12} style={{ marginRight: 4 }} />
            {formatMessage('student.scholarship')}
          </Tag>
          <Tag tone={isMoodleLinked ? 'success' : 'warning'}>
            Moodle:{' '}
            {formatMessage(isMoodleLinked ? 'header.moodleConnected' : 'header.moodleNotConnected')}
          </Tag>
        </div>
      </div>

      <div className={styles.studentGrid}>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.faculty')}</span>
          <span className={styles.fieldValue}>{activeStudentProfile.faculty}</span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.department')}</span>
          <span className={styles.fieldValue}>{activeStudentProfile.department}</span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.courseAndGroup')}</span>
          <span className={styles.fieldValue}>
            {formatMessage('student.courseGroupFormat', {
              course: activeStudentProfile.course,
              group: activeStudentProfile.group,
            })}
          </span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.card')}</span>
          <span className={styles.fieldValue}>{activeStudentProfile.studentCardNumber}</span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.recordBook')}</span>
          <span className={styles.fieldValue}>{activeStudentProfile.recordBookNumber}</span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.credits')}</span>
          <span className={styles.fieldValue}>{activeStudentProfile.totalCreditsEarned} ECTS</span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.gpa')}</span>
          <span className={styles.fieldValue}>{activeStudentProfile.gpa} / 100</span>
        </div>
        <div className={styles.studentField}>
          <span className={styles.fieldLabel}>{formatMessage('student.status')}</span>
          <span className={styles.fieldValue} style={{ color: '#22c55e' }}>
            ● {formatMessage('student.statusActive')}
          </span>
        </div>
      </div>
    </section>
  );
};
