import { createHash } from 'node:crypto';
import {
  GRIP_HOSTED_POLICY,
  GRIP_PIN_KIND,
  type GripPinKind,
} from '@universe/core/constants/grip-hosted';
import type {
  GripBoardEdge,
  GripBoardNode,
  GripPublicBoard,
} from '@universe/core/types/grip-hosted';
import type {
  GripBoardValidation,
  GripPrivateBoard,
  GripPrivatePin,
  GripValidatedGrade,
} from './grip-board.types';

const MAX_NODES = 8;
const MAX_EDGES = 12;
const MAX_SUMMARY = 1_000;
const MAX_LABEL = 40;
const MAX_ROLE = 60;
const MAX_QUESTION = 300;
const MAX_RUBRIC = 1_000;
const MAX_FEEDBACK = 1_000;
const MAX_CONTENT_BYTES = 128 * 1024;
const NODE_ID = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const PIN_KINDS: ReadonlySet<string> = new Set(Object.values(GRIP_PIN_KIND));
const NODE_KINDS: ReadonlySet<string> = new Set([
  'component',
  'store',
  'external',
  'context',
]);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, limit: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= limit &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);

      return code < 32 || code === 127;
    })
  );
}

function parse(content: string): Record<string, unknown> | undefined {
  if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
    return undefined;
  }

  try {
    const value: unknown = JSON.parse(content);

    return record(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function validNode(
  value: unknown,
  files: ReadonlySet<string>,
): value is GripBoardNode {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !NODE_ID.test(value.id) ||
    !text(value.label, MAX_LABEL) ||
    !text(value.role, MAX_ROLE) ||
    !NODE_KINDS.has(String(value.kind)) ||
    !['trusted', 'untrusted'].includes(String(value.trust)) ||
    !Array.isArray(value.files) ||
    value.files.length > GRIP_HOSTED_POLICY.MAX_FILES ||
    !value.files.every((file) => typeof file === 'string' && files.has(file))
  ) {
    return false;
  }

  return (
    !['component', 'store'].includes(String(value.kind)) ||
    value.files.length > 0
  );
}

export function validateGripBoard({
  content,
  diffFiles,
}: {
  content: string;
  diffFiles: string[];
}): GripBoardValidation {
  const value = parse(content);

  if (!value) {
    return { errors: ['Board must be a JSON object.'] };
  }

  if (
    !text(value.summary, MAX_SUMMARY) ||
    !Array.isArray(value.nodes) ||
    value.nodes.length < 2 ||
    value.nodes.length > MAX_NODES ||
    !Array.isArray(value.edges) ||
    value.edges.length > MAX_EDGES ||
    !Array.isArray(value.pins) ||
    value.pins.length !== GRIP_HOSTED_POLICY.QUESTION_COUNT
  ) {
    return {
      errors: [
        'Board requires bounded summary, 2–8 nodes, at most 12 edges and exactly five pins.',
      ],
    };
  }

  const files = new Set(diffFiles);
  const nodes: GripBoardNode[] = [];
  const targets = new Set<string>();

  for (const node of value.nodes) {
    if (!validNode(node, files) || targets.has(node.id)) {
      return {
        errors: [
          'Board nodes require unique valid IDs, bounded text and changed paths from the visible diff.',
        ],
      };
    }

    nodes.push({
      id: node.id,
      label: node.label,
      role: node.role,
      kind: node.kind,
      trust: node.trust,
      files: [...node.files],
    });
    targets.add(node.id);
  }

  const edges: GripBoardEdge[] = [];

  for (const edge of value.edges) {
    if (
      !record(edge) ||
      typeof edge.source !== 'string' ||
      typeof edge.target !== 'string' ||
      !nodes.some((node) => node.id === edge.source) ||
      !nodes.some((node) => node.id === edge.target) ||
      edge.source === edge.target ||
      !text(edge.label, MAX_LABEL)
    ) {
      return {
        errors: [
          'Board edges must connect different existing nodes and have bounded labels.',
        ],
      };
    }

    const id = `${edge.source}->${edge.target}`;

    if (targets.has(id)) {
      return { errors: ['Board edges must be unique.'] };
    }

    targets.add(id);
    edges.push({ source: edge.source, target: edge.target, label: edge.label });
  }

  const seenKinds = new Set<string>();
  const pins: GripPrivatePin[] = [];

  for (const pin of value.pins) {
    if (
      !record(pin) ||
      typeof pin.on !== 'string' ||
      !targets.has(pin.on) ||
      typeof pin.kind !== 'string' ||
      !PIN_KINDS.has(pin.kind) ||
      !text(pin.question, MAX_QUESTION) ||
      !Array.isArray(pin.rubric) ||
      pin.rubric.length < 2 ||
      pin.rubric.length > 4 ||
      !pin.rubric.every((point) => text(point, MAX_RUBRIC)) ||
      (pin.kind !== GRIP_PIN_KIND.HOW && seenKinds.has(pin.kind))
    ) {
      return {
        errors: [
          'Each pin needs a valid target/kind, bounded question and two-to-four rubric points; required kinds cannot repeat.',
        ],
      };
    }

    seenKinds.add(pin.kind);
    pins.push({
      on: pin.on,
      kind: pin.kind as GripPinKind,
      question: pin.question,
      rubric: pin.rubric,
    });
  }

  const required: GripPinKind[] = [
    GRIP_PIN_KIND.WHY,
    GRIP_PIN_KIND.FAILURE,
    GRIP_PIN_KIND.VERIFY,
  ];

  if (nodes.some((node) => node.trust === 'untrusted')) {
    required.push(GRIP_PIN_KIND.ADVERSARY);
  }

  if (nodes.some((node) => node.kind === 'store')) {
    required.push(GRIP_PIN_KIND.DATA);
  }

  const missing = required.filter((kind) => !seenKinds.has(kind));

  if (missing.length) {
    return {
      errors: missing.map((kind) => `Missing required question kind: ${kind}.`),
    };
  }

  return { board: { summary: value.summary, nodes, edges, pins }, errors: [] };
}

export function projectGripBoard(board: GripPrivateBoard): GripPublicBoard {
  const revision = createHash('sha256')
    .update(JSON.stringify(board))
    .digest('hex');

  return {
    revision,
    summary: board.summary,
    nodes: board.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      role: node.role,
      kind: node.kind,
      trust: node.trust,
      files: [...node.files],
    })),
    edges: board.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
    questions: board.pins.map((pin, index) => ({
      id: `q${index + 1}`,
      on: pin.on,
      kind: pin.kind,
      question: pin.question,
    })),
  };
}

export function validateGripGrade({
  content,
  questionIds,
}: {
  content: string;
  questionIds: string[];
}): GripValidatedGrade {
  const value = parse(content);

  if (
    !value ||
    !Array.isArray(value.grades) ||
    value.grades.length !== GRIP_HOSTED_POLICY.QUESTION_COUNT ||
    questionIds.length !== GRIP_HOSTED_POLICY.QUESTION_COUNT
  ) {
    throw new Error('Invalid hosted Grip grade');
  }

  const expected = new Set(questionIds);
  const feedback = value.grades.map((grade: unknown) => {
    if (
      !record(grade) ||
      typeof grade.questionId !== 'string' ||
      !expected.delete(grade.questionId) ||
      typeof grade.score !== 'number' ||
      !Number.isInteger(grade.score) ||
      grade.score < 0 ||
      grade.score > GRIP_HOSTED_POLICY.POINTS_PER_QUESTION ||
      !text(grade.feedback, MAX_FEEDBACK)
    ) {
      throw new Error('Invalid hosted Grip grade');
    }

    return {
      questionId: grade.questionId,
      score: grade.score,
      feedback: grade.feedback,
    };
  });
  const score = feedback.reduce((total, grade) => total + grade.score, 0);

  return { score, passed: score >= GRIP_HOSTED_POLICY.PASSING_SCORE, feedback };
}
