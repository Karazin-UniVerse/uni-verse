import { useId } from 'react';
import type { GripBoardQuestion as BoardQuestion } from '@core/types/grip-hosted';
import { GRIP_HOSTED_POLICY } from '@core/constants/grip-hosted';
import styles from './GripBoard.module.scss';

export function GripBoardQuestion({
  question,
  answer,
  label,
  targetLabel,
  disabled,
  onChange,
}: {
  question: BoardQuestion;
  answer: string;
  label: string;
  targetLabel: string;
  disabled: boolean;
  onChange: (answer: string) => void;
}): React.ReactElement {
  const id = useId();

  return (
    <div className={styles.question}>
      <p id={`${id}-question`}>
        {question.question} — {targetLabel}
      </p>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        aria-describedby={`${id}-question`}
        value={answer}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        required
        maxLength={GRIP_HOSTED_POLICY.MAX_ANSWER_LENGTH}
        rows={4}
      />
    </div>
  );
}
