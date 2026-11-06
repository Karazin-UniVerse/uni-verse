import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GripBoard } from './GripBoard';
import type { GripPublicBoard } from '@core/types/grip-hosted';

const board: GripPublicBoard = {
  revision: 'revision',
  summary: '<script>not executable</script>',
  nodes: [
    {
      id: 'handler',
      label: 'Handler',
      role: 'Validate input',
      kind: 'component',
      trust: 'trusted',
      files: ['handler.ts'],
    },
  ],
  edges: [],
  questions: Array.from({ length: 5 }, (_, index) => ({
    id: `q${index + 1}`,
    on: 'handler',
    kind: 'how it works',
    question: `Explain behavior ${index + 1}`,
  })),
};
const labels = {
  structure: 'Change map',
  questions: 'Defend your change',
  answer: (index: number) => `Answer ${index}`,
  submit: 'Submit answers',
  submitting: 'Grading',
  untrusted: 'Untrusted',
  files: 'Files',
};

describe('GripBoard', () => {
  it('should render five labelled answers and escape model content', () => {
    const { container } = render(
      <GripBoard
        board={board}
        answers={{}}
        onAnswerChange={vi.fn()}
        onSubmit={vi.fn()}
        labels={labels}
      />,
    );

    expect(screen.getAllByRole('textbox')).toHaveLength(5);
    expect(screen.getByText('<script>not executable</script>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit answers' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Answer 1' })).toHaveAccessibleDescription(
      expect.stringContaining('Handler'),
    );
  });

  it('should submit only when every answer is populated and not already grading', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const answers = Object.fromEntries(
      board.questions.map((question) => [question.id, 'An explanation.']),
    );
    const { rerender } = render(
      <GripBoard
        board={board}
        answers={answers}
        onAnswerChange={vi.fn()}
        onSubmit={submit}
        labels={labels}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(submit).toHaveBeenCalledTimes(1);
    rerender(
      <GripBoard
        board={board}
        answers={answers}
        onAnswerChange={vi.fn()}
        onSubmit={submit}
        labels={labels}
        submitting
      />,
    );
    expect(screen.getByRole('button', { name: 'Grading' })).toBeDisabled();
  });
});
