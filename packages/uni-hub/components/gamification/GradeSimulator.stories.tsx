import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { GradeSimulator, GradeSimulatorTrigger } from './GradeSimulator';
import type { Assignment, Grade } from '../../types';

const meta: Meta<typeof GradeSimulator> = {
  title: 'Components/Gamification/GradeSimulator',
  component: GradeSimulator,
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ minHeight: '350px', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GradeSimulator>;

const mockGrades: Grade[] = [
  {
    courseName: 'Паралельні та розподілені обчислення',
    grade: '90.00',
    currentScore: 54,
    examScore: 36,
    totalScore: 90,
    controlType: 'exam',
    rawgrade: 90,
  },
  {
    courseName: 'Алгоритми та структури даних (Недопуск)',
    grade: '25.00',
    currentScore: 25,
    examScore: 0,
    totalScore: 25,
    controlType: 'exam',
    rawgrade: 25,
  },
  {
    courseName: 'Іноземна мова (Залік)',
    grade: '88.00',
    currentScore: 88,
    examScore: null,
    totalScore: 88,
    controlType: 'credit',
    rawgrade: 88,
  },
];

const mockAssignments: Assignment[] = [
  {
    id: 1,
    courseName: 'Паралельні та розподілені обчислення',
    name: 'Лабораторна робота 4: OpenMP',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 5,
    description: '',
  },
  {
    id: 2,
    courseName: 'Паралельні та розподілені обчислення',
    name: 'Розрахунково-графічна робота: MPI',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 10,
    description: '',
  },
  {
    id: 3,
    courseName: 'Алгоритми та структури даних (Недопуск)',
    name: 'Колоквіум з теорії графів',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 3,
    description: '',
  },
  {
    id: 4,
    courseName: 'Іноземна мова (Залік)',
    name: 'Презентація наукового проекту',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 7,
    description: '',
  },
];

export const Default: Story = {
  render: (args: React.ComponentProps<typeof GradeSimulator>) => {
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

export const ExamNotAdmitted: Story = {
  render: (args: React.ComponentProps<typeof GradeSimulator>) => {
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
    grades: [mockGrades[1]],
    assignments: [mockAssignments[2]],
  },
};

export const CreditCourse: Story = {
  render: (args: React.ComponentProps<typeof GradeSimulator>) => {
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
    grades: [mockGrades[2]],
    assignments: [mockAssignments[3]],
  },
};

export const Empty: Story = {
  render: (args: React.ComponentProps<typeof GradeSimulator>) => {
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
  render: (args: React.ComponentProps<typeof GradeSimulator>) => {
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
