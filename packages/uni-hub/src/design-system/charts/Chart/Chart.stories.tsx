import type { Meta, StoryObj } from '@storybook/react';
import Chart from './Chart';

const barData = [
  { name: 'Математический анализ', value: 92, color: 'var(--chart-success)' },
  { name: 'Программирование', value: 78, color: 'var(--chart-warning)' },
  { name: 'Физика', value: 45, color: 'var(--chart-danger)' },
  { name: 'История науки', value: 88, color: 'var(--chart-success)' },
];

const donutData = [
  { name: 'Выполнено', value: 8, color: 'var(--chart-success)' },
  { name: 'Просрочено', value: 2, color: 'var(--chart-danger)' },
  { name: 'В процессе', value: 5, color: 'var(--chart-info)' },
];

const meta: Meta<typeof Chart> = {
  title: 'Components/Charts/Chart',
  component: Chart,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['bar', 'donut'],
    },
    layout: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
    animate: {
      control: { type: 'boolean' },
    },
    showLegend: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Chart>;

export const HorizontalBar: Story = {
  args: {
    type: 'bar',
    layout: 'horizontal',
    data: barData,
    valueLabel: 'Оценка',
    domain: [0, 100],
  },
};

export const VerticalBar: Story = {
  args: {
    type: 'bar',
    layout: 'vertical',
    data: barData,
    valueLabel: 'Оценка',
    domain: [0, 100],
    height: 320,
  },
};

export const Donut: Story = {
  args: {
    type: 'donut',
    data: donutData,
    title: 'Статус заданий',
    height: 260,
  },
};

export const Empty: Story = {
  args: {
    type: 'bar',
    data: [],
    emptyDescription: 'Оценки не найдены',
  },
};

export const WithoutColors: Story = {
  args: {
    type: 'bar',
    layout: 'horizontal',
    data: [
      { name: 'Курс A', value: 70 },
      { name: 'Курс B', value: 55 },
      { name: 'Курс C', value: 90 },
    ],
  },
};
