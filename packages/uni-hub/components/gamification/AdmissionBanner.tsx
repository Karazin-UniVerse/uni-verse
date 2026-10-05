import React from 'react';
import { StatusBanner } from '@universe/ui';
import { MIN_EXAM_ADMISSION } from '@core/constants/grades';

export type AdmissionBannerProps = {
  isAdmitted: boolean;
  semesterScore: number;
};

export const AdmissionBanner: React.FC<AdmissionBannerProps> = ({ isAdmitted, semesterScore }) => (
  <StatusBanner
    tone={isAdmitted ? 'success' : 'danger'}
    icon={<span>{isAdmitted ? '🟢' : '🔴'}</span>}
  >
    {isAdmitted
      ? `Допущено до іспиту (${semesterScore} / 60 б. — поріг допуску 30 б. досягнуто)`
      : `Не допущено до іспиту (${semesterScore} / 60 б. — бракує ${
          MIN_EXAM_ADMISSION - semesterScore
        } б. для допуску)`}
  </StatusBanner>
);
