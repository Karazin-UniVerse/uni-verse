import type { Meta, StoryObj } from '@storybook/react';
import { GradesChart } from './GradesChart';
import type { Grade } from '../types';

const meta: Meta<typeof GradesChart> = {
  title: 'Components/Charts/GradesChart',
  component: GradesChart,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GradesChart>;

const mockGrades: Grade[] = [
  { course_name: 'Математический анализ', grade: '92.00', rawgrade: 92 },
  { course_name: 'Программирование', grade: '78.00', rawgrade: 78 },
  { course_name: 'Физика', grade: '45.00', rawgrade: 45 },
  { course_name: 'История науки', grade: '88.00', rawgrade: 88 },
  { course_name: 'Философия', grade: '55.00', rawgrade: 55 },
  { course_name: 'Химия', grade: '28.00', rawgrade: 28 },
];

export const Default: Story = {
  args: {
    grades: mockGrades,
  },
};

export const Empty: Story = {
  args: {
    grades: [],
  },
};

export const OnlyHighGrades: Story = {
  args: {
    grades: [
      { course_name: 'Математический анализ', grade: '95.00', rawgrade: 95 },
      { course_name: 'Программирование', grade: '100.00', rawgrade: 100 },
      { course_name: 'История науки', grade: '85.00', rawgrade: 85 },
    ],
  },
};

export const OnlyLowGrades: Story = {
  args: {
    grades: [
      { course_name: 'Физика', grade: '45.00', rawgrade: 45 },
      { course_name: 'Химия', grade: '28.00', rawgrade: 28 },
    ],
  },
};

export const WithInvalidGrades: Story = {
  args: {
    grades: [
      { course_name: 'Математический анализ', grade: '95.00', rawgrade: 95 },
      { course_name: 'Физика', grade: '0', rawgrade: 0 }, // filtered out
      { course_name: 'Химия', grade: '-', rawgrade: null }, // filtered out
      { course_name: 'Философия', grade: '', rawgrade: null }, // filtered out
    ],
  },
};
