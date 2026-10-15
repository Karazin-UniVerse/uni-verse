import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { ProgressBar } from './ProgressBar';
import type { ProgressBarProps } from './ProgressBar.types';

type MatrixTone = NonNullable<ProgressBarProps['tone']>;

const MATRIX_TONES: readonly MatrixTone[] = ['info', 'success', 'warning', 'danger'];
const MATRIX_VALUES = { '0%': 0, '25%': 25, '50%': 50, '100%': 100 } as const;

type MatrixValue = keyof typeof MATRIX_VALUES;

const meta = {
  title: 'Una/Feedback/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Поточне значення прогресу',
    },
    max: {
      control: { type: 'number' },
      description: 'Максимальне можливе значення шкали (за замовчуванням 100)',
    },
    tone: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'danger'],
      description: 'Колірний тон індикатора',
    },
    ariaLabel: {
      control: 'text',
      description: 'Доступна назва для зчитувачів екрана',
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    value: 0,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_TONES}
      columns={Object.keys(MATRIX_VALUES) as MatrixValue[]}
      renderCell={(tone: MatrixTone, value: MatrixValue) => (
        <div style={{ width: '120px' }}>
          <ProgressBar tone={tone} value={MATRIX_VALUES[value]} />
        </div>
      )}
    />
  ),
};
