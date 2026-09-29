import React from 'react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export type GradeSimulatorTriggerProps = {
  onOpen: () => void;
};

export const GradeSimulatorTrigger: React.FC<GradeSimulatorTriggerProps> = ({ onOpen }) => {
  const { formatMessage } = useLanguage();

  return (
    <Button type="button" variant="secondary" size="small" onClick={onOpen}>
      {formatMessage('grades.simulatorBtn')}
    </Button>
  );
};
