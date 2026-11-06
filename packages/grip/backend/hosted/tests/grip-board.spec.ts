import { GRIP_PIN_KIND } from '@universe/core/constants/grip-hosted';
import { projectGripBoard, validateGripBoard, validateGripGrade } from '../grip-board.validation';

const board = {
  summary: 'Change validation behavior.',
  nodes: [
    {
      id: 'input',
      label: 'Input',
      role: 'Untrusted request',
      kind: 'external',
      trust: 'untrusted',
      files: [],
    },
    {
      id: 'handler',
      label: 'Handler',
      role: 'Validate before storing',
      kind: 'store',
      trust: 'trusted',
      files: ['handler.ts'],
    },
  ],
  edges: [{ source: 'input', target: 'handler', label: 'request' }],
  pins: Object.values(GRIP_PIN_KIND)
    .filter((kind) => kind !== GRIP_PIN_KIND.HOW)
    .map((kind) => ({
      on: 'handler',
      kind,
      question: `Explain ${kind}?`,
      rubric: ['Validate the input.', 'Preserve authorization.'],
    })),
};

describe('hosted Grip board validation', () => {
  it('should validate a board then remove all hidden rubrics from its public projection', () => {
    const result = validateGripBoard({
      content: JSON.stringify(board),
      diffFiles: ['handler.ts'],
    });

    expect(result.errors).toEqual([]);
    expect(result.board).toBeDefined();
    const publicBoard = projectGripBoard(result.board!);

    expect(publicBoard.questions).toHaveLength(5);
    expect(new Set(publicBoard.questions.map((question) => question.id)).size).toBe(5);
    expect(JSON.stringify(publicBoard)).not.toContain('rubric');
    expect(JSON.stringify(publicBoard)).not.toContain('Preserve authorization');
    expect(projectGripBoard(result.board!).revision).toBe(publicBoard.revision);
  });

  it.each([
    { ...board, pins: board.pins.slice(1) },
    {
      ...board,
      pins: board.pins.map((pin) => ({ ...pin, kind: GRIP_PIN_KIND.HOW })),
    },
    {
      ...board,
      edges: [{ source: 'missing', target: 'handler', label: 'bad' }],
    },
    { ...board, nodes: board.nodes.map((node) => ({ ...node, id: 'same' })) },
    {
      ...board,
      nodes: [board.nodes[0], { ...board.nodes[1], files: ['secret.env'] }],
    },
    {
      ...board,
      nodes: [board.nodes[0], { ...board.nodes[1], label: 'x'.repeat(41) }],
    },
    { ...board, pins: board.pins.map((pin) => ({ ...pin, rubric: [''] })) },
    {
      ...board,
      pins: board.pins.map((pin) => ({ ...pin, question: 'unsafe\u0000text' })),
    },
  ])('should reject structurally invalid board (%#)', (invalid) => {
    const result = validateGripBoard({
      content: JSON.stringify(invalid),
      diffFiles: ['handler.ts'],
    });

    expect(result.board).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject malformed JSON without exposing provider output', () => {
    expect(
      validateGripBoard({
        content: 'private invalid provider output',
        diffFiles: [],
      }),
    ).toEqual({ errors: ['Board must be a JSON object.'] });
  });

  it.each([69, 70])(
    'should derive score %s and its passing threshold from exactly five grades',
    (total) => {
      const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5'];
      const content = JSON.stringify({
        grades: questionIds.map((questionId, index) => ({
          questionId,
          score: index === 4 ? total - 60 : 15,
          feedback: 'Explain the validation.',
        })),
      });

      expect(validateGripGrade({ content, questionIds })).toMatchObject({
        score: total,
        passed: total >= 70,
      });
    },
  );

  it.each([
    { grades: [] },
    {
      grades: Array.from({ length: 5 }, () => ({
        questionId: 'q1',
        score: 20,
        feedback: 'bad',
      })),
    },
    {
      grades: ['q1', 'q2', 'q3', 'q4', 'q5'].map((questionId) => ({
        questionId,
        score: 20.1,
        feedback: 'bad',
      })),
    },
  ])('should reject incomplete, duplicate or out-of-range grades (%#)', (invalid) => {
    expect(() =>
      validateGripGrade({
        content: JSON.stringify(invalid),
        questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
      }),
    ).toThrow('Invalid hosted Grip grade');
  });
});
