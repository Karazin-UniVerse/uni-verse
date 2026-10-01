import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Select } from './Select';

const sampleOptions = [
  { value: 'ua', label: 'Українська' },
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polski' },
  { value: 'de', label: 'Deutsch' },
];

const facultyOptions = [
  { value: 'cs', label: 'Факультет компʼютерних наук' },
  { value: 'math', label: 'Механіко-математичний факультет' },
  { value: 'physics', label: 'Фізичний факультет' },
  { value: 'philology', label: 'Філологічний факультет' },
];

const meta = {
  title: 'Una/Inputs/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Поточне вибране значення',
    },
    'aria-label': {
      control: 'text',
      description: 'Доступна назва елемента вибору',
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveSelect = (args: React.ComponentProps<typeof Select>) => {
  const [val, setVal] = useState(args.value || args.options[0]?.value || '');

  return (
    <div style={{ minWidth: '260px' }}>
      <Select {...args} value={val} onChange={setVal} />
    </div>
  );
};

export const Default: Story = {
  render: InteractiveSelect,
  args: {
    options: sampleOptions,
    value: 'ua',
    'aria-label': 'Оберіть мову',
  },
};

export const Faculties: Story = {
  render: InteractiveSelect,
  args: {
    options: facultyOptions,
    value: 'cs',
    'aria-label': 'Оберіть факультет',
  },
};
