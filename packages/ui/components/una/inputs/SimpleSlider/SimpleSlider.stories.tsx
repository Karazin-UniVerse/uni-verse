import type { Meta, StoryObj } from '@storybook/react-vite';
import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import { SimpleSlider } from './SimpleSlider';
import type { SimpleSliderProps } from './SimpleSlider.types';

type MatrixState = 'enabled' | 'disabled';

const MATRIX_VALUES = { '0%': 0, '50%': 50, '100%': 100 } as const;
const MATRIX_STATES: Record<MatrixState, Pick<SimpleSliderProps, 'disabled'>> = {
  enabled: {},
  disabled: { disabled: true },
};

type MatrixValue = keyof typeof MATRIX_VALUES;

const meta: Meta<typeof SimpleSlider> = {
  title: 'Una/Inputs/SimpleSlider',
  component: SimpleSlider,
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
    disabled: {
      control: 'boolean',
    },
    value: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SimpleSlider>;

export const Matrix: Story = {
  args: {
    value: 0,
    onChange: () => {},
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_VALUES) as MatrixValue[]}
      columns={Object.keys(MATRIX_STATES) as MatrixState[]}
      renderCell={(value: MatrixValue, state: MatrixState) => (
        <div style={{ width: '160px' }}>
          <SimpleSlider
            value={MATRIX_VALUES[value]}
            onChange={() => {}}
            aria-label={`${value} ${state}`}
            {...MATRIX_STATES[state]}
          />
        </div>
      )}
    />
  ),
};
