import type { Meta, StoryObj } from '@storybook/react';
import { AssignmentsDonut } from './AssignmentsDonut';
import type { Assignment, Grade } from '../types';

const meta: Meta<typeof AssignmentsDonut> = {
  title: 'Components/Charts/AssignmentsDonut',
  component: AssignmentsDonut,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AssignmentsDonut>;

const mockGrades: Grade[] = [
  { course_name: 'Математический анализ', grade: '92.00', rawgrade: 92 },
  { course_name: 'Программирование', grade: '78.00', rawgrade: 78 },
];

const mockAssignments: Assignment[] = [
  // Done (course has a grade in mockGrades)
  {
    id: 1,
    courseName: 'Математический анализ',
    name: 'Домашнее задание 1',
    duedate: Math.floor(Date.now() / 1000) - 3600,
    description: 'Решить задачи по пределам',
  },
  // Overdue (duedate in past, no grade)
  {
    id: 2,
    courseName: 'Физика',
    name: 'Лабораторная работа 1',
    duedate: Math.floor(Date.now() / 1000) - 86400 * 2,
    description: 'Определить ускорение свободного падения',
  },
  // In Progress (duedate in future, no grade)
  {
    id: 3,
    courseName: 'История науки',
    name: 'Эссе',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 5,
    description: 'Написать эссе о Ньютоне',
  },
];

export const Default: Story = {
  args: {
    assignments: mockAssignments,
    grades: mockGrades,
  },
};

export const Empty: Story = {
  args: {
    assignments: [],
    grades: [],
  },
};

export const AllDone: Story = {
  args: {
    assignments: [
      {
        id: 1,
        courseName: 'Математический анализ',
        name: 'ДЗ 1',
        duedate: Math.floor(Date.now() / 1000) - 3600,
        description: '',
      },
      {
        id: 2,
        courseName: 'Программирование',
        name: 'ДЗ 2',
        duedate: Math.floor(Date.now() / 1000) - 3600,
        description: '',
      },
    ],
    grades: mockGrades,
  },
};
