import type { GripPublicBoard } from '@core/types/grip-hosted';

export interface GripBoardLabels {
  structure: string;
  questions: string;
  answer: (index: number) => string;
  submit: string;
  submitting: string;
  untrusted: string;
  files: string;
}

export interface GripBoardProps {
  board: GripPublicBoard;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  labels: GripBoardLabels;
  submitting?: boolean;
  disabled?: boolean;
}
