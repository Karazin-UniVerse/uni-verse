import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { GradeSimulator, GradeSimulatorTrigger } from './GradeSimulator';
import type { Assignment, Grade } from '../../types';

const meta: Meta<typeof GradeSimulator> = {
  title: 'Components/Gamification/GradeSimulator',
  component: GradeSimulator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ minHeight: '350px', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GradeSimulator>;

const mockGrades: Grade[] = [
  { course_name: 'Математический анализ', grade: '92.00', rawgrade: 92 },
  { course_name: 'Программирование', grade: '78.00', rawgrade: 78 },
  { course_name: 'Физика', grade: '45.00', rawgrade: 45 },
];

const mockAssignments: Assignment[] = [
  {
    id: 1,
    courseName: 'Математический анализ',
    name: 'Экзаменационная контрольная работа',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 5,
    description: '',
  },
  {
    id: 2,
    courseName: 'Математический анализ',
    name: 'Индивидуальное домашнее задание 2',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 10,
    description: '',
  },
  {
    id: 3,
    courseName: 'Программирование',
    name: 'Финальный проект по курсу',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 3,
    description: '',
  },
  {
    id: 4,
    courseName: 'Физика',
    name: 'Защита лабораторных работ 2-4',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 7,
    description: '',
  },
];

export const Default: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(true);
    return (
      <>
        <GradeSimulatorTrigger onOpen={() => setOpen(true)} />
        <GradeSimulator {...args} open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
  args: {
    open: true,
    grades: mockGrades,
    assignments: mockAssignments,
  },
};

export const Empty: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(true);
    return (
      <>
        <GradeSimulatorTrigger onOpen={() => setOpen(true)} />
        <GradeSimulator {...args} open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
  args: {
    open: true,
    grades: [],
    assignments: [],
  },
};

export const WithoutAssignments: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(true);
    return (
      <>
        <GradeSimulatorTrigger onOpen={() => setOpen(true)} />
        <GradeSimulator {...args} open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
  args: {
    open: true,
    grades: mockGrades,
    assignments: [],
  },
};
