import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { Select } from './Select';
import type { Option } from './Select.types';

type MatrixOptions = 'short labels' | 'long labels';

const MATRIX_OPTIONS: Record<MatrixOptions, Option[]> = {
  'short labels': [
    { value: 'ua', label: 'Українська' },
    { value: 'en', label: 'English' },
    { value: 'pl', label: 'Polski' },
    { value: 'de', label: 'Deutsch' },
  ],
  'long labels': [
    { value: 'cs', label: 'Факультет компʼютерних наук' },
    { value: 'math', label: 'Механіко-математичний факультет' },
    { value: 'physics', label: 'Фізичний факультет' },
    { value: 'philology', label: 'Філологічний факультет' },
  ],
};

type MatrixSelectProps = {
  options: Option[];
};

function MatrixSelect({ options }: MatrixSelectProps) {
  const [value, setValue] = useState(options.at(0)?.value ?? '');

  return <Select aria-label="Select" options={options} value={value} onChange={setValue} />;
}

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

export const Matrix: Story = {
  args: {
    options: [],
    value: '',
    onChange: () => {},
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={Object.keys(MATRIX_OPTIONS) as MatrixOptions[]}
      renderCell={(options: MatrixOptions) => <MatrixSelect options={MATRIX_OPTIONS[options]} />}
    />
  ),
};
