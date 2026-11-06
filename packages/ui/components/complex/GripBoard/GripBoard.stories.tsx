import type { Meta, StoryObj } from '@storybook/react-vite';
import { GripBoard } from './GripBoard';

const meta = {
  title: 'Complex/GripBoard',
  component: GripBoard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    board: {
      revision: 'preview',
      summary: 'Bind a push to its exact commits before asking the developer to explain it.',
      nodes: [
        {
          id: 'hook',
          label: 'Git hook',
          role: 'Collect pushed objects',
          kind: 'component',
          trust: 'trusted',
          files: ['scripts/grip/cli.mjs'],
        },
        {
          id: 'gateway',
          label: 'Team gateway',
          role: 'Validate and persist the defense',
          kind: 'component',
          trust: 'trusted',
          files: ['grip-check.service.ts'],
        },
        {
          id: 'model',
          label: 'Model response',
          role: 'Untrusted question and grade output',
          kind: 'external',
          trust: 'untrusted',
          files: [],
        },
      ],
      edges: [
        { source: 'hook', target: 'gateway', label: 'Manifest and bounded diff' },
        { source: 'gateway', target: 'model', label: 'Structured completion' },
      ],
      questions: [
        {
          id: 'q1',
          on: 'hook',
          kind: 'why this way',
          question:
            'Why bind the check to pushed object IDs instead of reading the current working tree?',
        },
        {
          id: 'q2',
          on: 'gateway',
          kind: 'where it fails',
          question: 'What happens when generation finishes after the check expires?',
        },
        {
          id: 'q3',
          on: 'gateway',
          kind: 'how you know',
          question: 'Which test proves that two replicas cannot grade the same submission twice?',
        },
        {
          id: 'q4',
          on: 'model',
          kind: 'malicious actor',
          question: 'How is model-generated content prevented from becoming executable markup?',
        },
        {
          id: 'q5',
          on: 'hook',
          kind: 'how it works',
          question: 'How does the original push receive the server-owned result?',
        },
      ],
    },
    answers: {},
    onAnswerChange: () => {},
    onSubmit: () => {},
    labels: {
      structure: 'Change map',
      questions: 'Explain your changes',
      answer: (index) => `Answer ${index}`,
      submit: 'Check answers',
      submitting: 'Grading answers…',
      untrusted: 'Untrusted source',
      files: 'Files',
    },
  },
} satisfies Meta<typeof GripBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Grading: Story = {
  args: {
    submitting: true,
    answers: {
      q1: 'The working tree may change during a defense.',
      q2: 'The operation loses its fenced write.',
      q3: 'The PostgreSQL two-client claim test.',
      q4: 'React renders it as text.',
      q5: 'It polls the bound check status.',
    },
  },
};
export const Expired: Story = { args: { disabled: true } };
