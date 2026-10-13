import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { Chart } from './Chart';
import type { ChartProps } from './Chart.types';

type MatrixKind = 'horizontal bar' | 'vertical bar' | 'donut';

const MOCK_DATA = [
  { name: 'Київ', value: 45 },
  { name: 'Харків', value: 30 },
  { name: 'Львів', value: 25 },
  { name: 'Одеса', value: 18 },
  { name: 'Дніпро', value: 12 },
];
const MATRIX_KINDS: Record<MatrixKind, Pick<ChartProps, 'type' | 'layout' | 'showLegend'>> = {
  'horizontal bar': { type: 'bar', layout: 'horizontal' },
  'vertical bar': { type: 'bar', layout: 'vertical' },
  donut: { type: 'donut', showLegend: true },
};

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

export const Matrix: Story = {
  args: {
    data: [],
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={Object.keys(MATRIX_KINDS) as MatrixKind[]}
      renderCell={(kind: MatrixKind) => (
        <div style={{ width: '320px' }}>
          <Chart title="Title" valueLabel="Count" data={MOCK_DATA} {...MATRIX_KINDS[kind]} />
        </div>
      )}
    />
  ),
};
