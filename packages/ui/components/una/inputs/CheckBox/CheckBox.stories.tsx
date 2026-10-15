import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckBox } from './CheckBox';
import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import type { CheckBoxProps } from './CheckBox.types';

type MatrixVariant = CheckBoxProps['variant'];
type MatrixState = 'unchecked' | 'checked' | 'disabled' | 'disabled checked';

const MATRIX_VARIANTS: readonly MatrixVariant[] = ['primary', 'secondary'];
const MATRIX_STATES: Record<MatrixState, Pick<CheckBoxProps, 'defaultChecked' | 'disabled'>> = {
  unchecked: {},
  checked: { defaultChecked: true },
  disabled: { disabled: true },
  'disabled checked': { defaultChecked: true, disabled: true },
};

const meta: Meta<typeof CheckBox> = {
  title: 'Una/Inputs/CheckBox',
  component: CheckBox,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    disabled: {
      control: 'boolean',
    },
    name: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckBox>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_VARIANTS}
      columns={Object.keys(MATRIX_STATES) as MatrixState[]}
      renderCell={(variant: MatrixVariant, state: MatrixState) => (
        <CheckBox variant={variant} aria-label={`${variant} ${state}`} {...MATRIX_STATES[state]} />
      )}
    />
  ),
};
