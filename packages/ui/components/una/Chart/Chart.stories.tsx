import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Chart } from './Chart';

const meta = {
  title: 'Una/Charts/Chart',
  component: Chart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', maxWidth: '100%', minWidth: '320px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['bar', 'donut'],
      description: 'Тип діаграми',
    },
    layout: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
      description: 'Орієнтація стовпчиків для bar',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Відображення легенди',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Увімкнути анімацію',
    },
  },
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = [
  { name: 'Київ', value: 45 },
  { name: 'Харків', value: 30 },
  { name: 'Львів', value: 25 },
  { name: 'Одеса', value: 18 },
  { name: 'Дніпро', value: 12 },
];

export const HorizontalBar: Story = {
  args: {
    data: mockData,
    type: 'bar',
    layout: 'horizontal',
    title: 'Регіональний розподіл',
    valueLabel: 'Кількість',
  },
};

export const VerticalBar: Story = {
  args: {
    data: mockData,
    type: 'bar',
    layout: 'vertical',
    title: 'Статистика за містами',
    valueLabel: 'Кількість',
  },
};

export const Donut: Story = {
  args: {
    data: mockData,
    type: 'donut',
    title: 'Частка за категоріями',
    showLegend: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    emptyDescription: 'Немає даних для відображення',
  },
};
