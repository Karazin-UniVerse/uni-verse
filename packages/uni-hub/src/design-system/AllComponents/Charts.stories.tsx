import type { Meta } from '@storybook/react';
import React from 'react';
import Chart from '../charts/Chart/Chart';
import { AssignmentsDonut } from '../../components/AssignmentsDonut';
import { GradesChart } from '../../components/GradesChart';
import type { Assignment, Grade } from '../../types';

const meta: Meta = {
  title: 'Slides/Charts',
  tags: ['autodocs'],
};

export default meta;

const mockGrades: Grade[] = [
  { course_name: 'Математический анализ', grade: '92.00', rawgrade: 92 },
  { course_name: 'Программирование', grade: '78.00', rawgrade: 78 },
  { course_name: 'Физика', grade: '45.00', rawgrade: 45 },
  { course_name: 'История науки', grade: '88.00', rawgrade: 88 },
  { course_name: 'Философия', grade: '55.00', rawgrade: 55 },
  { course_name: 'Химия', grade: '28.00', rawgrade: 28 },
];

const mockAssignments: Assignment[] = [
  {
    id: 1,
    courseName: 'Математический анализ',
    name: 'Домашнее задание 1',
    duedate: Math.floor(Date.now() / 1000) - 3600,
    description: 'Решить задачи по пределам',
  },
  {
    id: 2,
    courseName: 'Физика',
    name: 'Лабораторная работа 1',
    duedate: Math.floor(Date.now() / 1000) - 86400 * 2,
    description: 'Определить ускорение свободного падения',
  },
  {
    id: 3,
    courseName: 'История науки',
    name: 'Эссе',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 5,
    description: 'Написать эссе о Ньютоне',
  },
];

export const Variants = () => (
  <div style={{ padding: 24, display: 'grid', gap: 32 }}>
    <h2>Charts — варианты</h2>

    <div>
      <h3 style={{ marginBottom: 12 }}>Базовый Bar Chart (Horizontal)</h3>
      <Chart
        type="bar"
        layout="horizontal"
        valueLabel="Оценка"
        data={[
          { name: 'Математический анализ', value: 92, color: 'var(--chart-success)' },
          { name: 'Программирование', value: 78, color: 'var(--chart-warning)' },
          { name: 'Физика', value: 45, color: 'var(--chart-danger)' },
        ]}
      />
    </div>

    <div>
      <h3 style={{ marginBottom: 12 }}>Базовый Donut Chart</h3>
      <Chart
        type="donut"
        title="Статус заданий"
        height={260}
        data={[
          { name: 'Выполнено', value: 8, color: 'var(--chart-success)' },
          { name: 'Просрочено', value: 2, color: 'var(--chart-danger)' },
          { name: 'В процессе', value: 5, color: 'var(--chart-info)' },
        ]}
      />
    </div>

    <div>
      <h3 style={{ marginBottom: 12 }}>Компонент GradesChart (Успеваемость)</h3>
      <GradesChart grades={mockGrades} />
    </div>

    <div>
      <h3 style={{ marginBottom: 12 }}>Компонент AssignmentsDonut (Задачи)</h3>
      <AssignmentsDonut assignments={mockAssignments} grades={mockGrades} />
    </div>
  </div>
);
