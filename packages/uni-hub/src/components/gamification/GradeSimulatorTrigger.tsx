import React from 'react';
import { Button } from '@una';

export type GradeSimulatorTriggerProps = {
  onOpen: () => void;
};

export const GradeSimulatorTrigger: React.FC<GradeSimulatorTriggerProps> = ({ onOpen }) => (
  <Button type="button" variant="secondary" size="small" onClick={onOpen}>
    Симулятор балів (Що, якщо?)
  </Button>
);
