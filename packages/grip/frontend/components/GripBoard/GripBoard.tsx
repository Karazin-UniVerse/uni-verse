'use client';

import { Button } from '@una';
import { GripBoardQuestion } from './GripBoardQuestion';
import type { GripBoardProps } from './GripBoard.types';
import styles from './GripBoard.module.scss';

export function GripBoard({
  board,
  answers,
  onAnswerChange,
  onSubmit,
  labels,
  submitting = false,
  disabled = false,
}: GripBoardProps): React.ReactElement {
  const ready = board.questions.every((question) => answers[question.id]?.trim());

  return (
    <div className={styles.board}>
      <p className={styles.summary}>{board.summary}</p>
      <div className={styles.columns}>
        <section aria-label={labels.structure} className={styles.structure}>
          <h2>{labels.structure}</h2>
          <ul className={styles.nodes}>
            {board.nodes.map((node) => (
              <li key={node.id} className={styles.node}>
                <h3>{node.label}</h3>
                <p>{node.role}</p>
                {node.trust === 'untrusted' && <strong>{labels.untrusted}</strong>}
                {node.files.length > 0 && (
                  <p>
                    {labels.files}: {node.files.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <ul className={styles.edges}>
            {board.edges.map((edge) => (
              <li key={`${edge.source}-${edge.target}`}>
                {board.nodes.find((node) => node.id === edge.source)?.label} →{' '}
                {board.nodes.find((node) => node.id === edge.target)?.label}: {edge.label}
              </li>
            ))}
          </ul>
        </section>
        <form
          className={styles.questions}
          onSubmit={(event) => {
            event.preventDefault();

            if (ready && !submitting && !disabled) onSubmit();
          }}
        >
          <h2>{labels.questions}</h2>
          {board.questions.map((question, index) => (
            <GripBoardQuestion
              key={question.id}
              question={question}
              answer={answers[question.id] ?? ''}
              label={labels.answer(index + 1)}
              targetLabel={
                board.nodes.find((node) => node.id === question.on)?.label ??
                board.edges.find((edge) => `${edge.source}->${edge.target}` === question.on)
                  ?.label ??
                question.on
              }
              disabled={disabled || submitting}
              onChange={(answer) => onAnswerChange(question.id, answer)}
            />
          ))}
          <Button type="submit" disabled={disabled || submitting || !ready}>
            {submitting ? labels.submitting : labels.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}
