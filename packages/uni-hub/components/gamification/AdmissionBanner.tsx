import React from 'react';
import { StatusBanner } from '@ui';
import { MIN_EXAM_ADMISSION } from '@core/constants/grades';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export type AdmissionBannerProps = {
  isAdmitted: boolean;
  semesterScore: number;
};

export const AdmissionBanner: React.FC<AdmissionBannerProps> = ({ isAdmitted, semesterScore }) => {
  const { formatMessage } = useLanguage();

  return (
    <StatusBanner
      tone={isAdmitted ? 'success' : 'danger'}
      icon={<span>{isAdmitted ? '🟢' : '🔴'}</span>}
    >
      {isAdmitted
        ? formatMessage('admission.admitted', { score: semesterScore })
        : formatMessage('admission.notAdmitted', {
            score: semesterScore,
            remaining: MIN_EXAM_ADMISSION - semesterScore,
          })}
    </StatusBanner>
  );
};
