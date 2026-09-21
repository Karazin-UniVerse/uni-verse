import React from 'react';
import clsx from 'clsx';
import { MIN_EXAM_ADMISSION } from '@core/constants/grades.ts';
import styles from './GradeSimulator.module.scss';

export type AdmissionBannerProps = {
  isAdmitted: boolean;
  semesterScore: number;
};

export const AdmissionBanner: React.FC<AdmissionBannerProps> = ({ isAdmitted, semesterScore }) => (
  <div
    className={clsx(
      styles.admissionBanner,
      isAdmitted ? styles.admissionBannerSuccess : styles.admissionBannerDanger,
    )}
  >
    <span>{isAdmitted ? '🟢' : '🔴'}</span>
    <span>
      {isAdmitted
        ? `Допущено до іспиту (${semesterScore} / 60 б. — поріг допуску 30 б. досягнуто)`
        : `Не допущено до іспиту (${semesterScore} / 60 б. — бракує ${
            MIN_EXAM_ADMISSION - semesterScore
          } б. для допуску)`}
    </span>
  </div>
);
